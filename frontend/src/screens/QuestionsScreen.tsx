import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import MiraLogo from '../components/MiraLogo';
import {
  submitAnswers,
  ApiError,
  type TriageCluster,
  type IntakeInterpretation,
  type AnswerEntry,
} from '../lib/api';
import { loadContext } from '../lib/context';
import './QuestionsScreen.css';

/* ── Question data (fully client-side; no LLM call for selection) ────── */

interface Option {
  label: string;
  value: string;
}

interface FlowQuestion {
  id: string;
  text: string;
  options: Option[];
  layout: 'cards' | 'yesno';
}

const G999_ITEMS: Option[] = [
  { value: 'g999_1', label: 'Heavy bleeding with severe tummy pain' },
  { value: 'g999_2', label: 'Severe chest pain or trouble breathing' },
  { value: 'g999_3', label: 'Fainting, collapsing, or a fit (seizure)' },
  { value: 'g999_4', label: 'A painful, red, swollen leg' },
  { value: 'g999_5', label: 'Sudden, severe tummy pain that will not ease' },
];

// Patient-safe, symptom-based phrasing for the read-only banner. These describe
// symptoms only -- never a diagnosis or condition name.
const CLUSTER_LABELS: Record<TriageCluster, string> = {
  RFM: 'changes to your baby’s movements',
  PREECLAMPSIA: 'a headache, vision changes or swelling',
  BLEEDING: 'bleeding or fluid leaking',
  OTHER: 'what you described',
};

const YES_NO: Option[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const BRANCH_QUESTIONS: Record<TriageCluster, FlowQuestion[]> = {
  RFM: [
    {
      id: 'rfm_1',
      text: 'Can you feel your baby moving at all right now?',
      layout: 'cards',
      options: [
        { value: 'no_movement', label: 'No movement at all' },
        { value: 'less_than_usual', label: 'Less than usual or a different pattern' },
        { value: 'feels_normal', label: 'Feels normal for my baby' },
      ],
    },
    {
      id: 'rfm_2',
      text: 'When did you notice the change?',
      layout: 'cards',
      options: [
        { value: 'last_few_hours', label: 'In the last few hours or today' },
        { value: 'yesterday_or_longer', label: 'Yesterday or longer ago' },
      ],
    },
    {
      id: 'rfm_3',
      text: "Have you contacted your maternity team about your baby's movements before in this pregnancy?",
      layout: 'yesno',
      options: YES_NO,
    },
  ],
  PREECLAMPSIA: [
    {
      id: 'prec_1',
      text: "A headache that won't go away with rest, water or paracetamol?",
      layout: 'yesno',
      options: YES_NO,
    },
    {
      id: 'prec_2',
      text: 'Changes to your vision — blurring, flashing lights, or spots?',
      layout: 'yesno',
      options: YES_NO,
    },
    {
      id: 'prec_3',
      text: 'Sudden swelling of your face, hands or fingers?',
      layout: 'yesno',
      options: YES_NO,
    },
    {
      id: 'prec_4',
      text: 'Pain just below your ribs, especially on the right?',
      layout: 'yesno',
      options: YES_NO,
    },
    {
      id: 'prec_5',
      text: 'Do you feel very unwell in yourself?',
      layout: 'yesno',
      options: YES_NO,
    },
  ],
  BLEEDING: [
    {
      id: 'bleed_1',
      text: 'How much bleeding are you having?',
      layout: 'cards',
      options: [
        { value: 'spotting', label: 'Spotting' },
        { value: 'needs_pad', label: 'Enough to need a pad' },
        { value: 'soaking', label: 'Soaking through a pad or passing clots' },
      ],
    },
    {
      id: 'bleed_2',
      text: 'Any pain with the bleeding?',
      layout: 'cards',
      options: [
        { value: 'none_mild', label: 'None or mild' },
        { value: 'severe', label: 'Severe, constant pain' },
      ],
    },
    {
      id: 'bleed_3',
      text: 'Any fluid leaking?',
      layout: 'cards',
      options: [
        { value: 'no', label: 'No' },
        { value: 'clear', label: 'Clear or straw-coloured' },
        { value: 'green_brown', label: 'Green or brown' },
      ],
    },
  ],
  OTHER: [],
};

interface SweepQuestion extends FlowQuestion {
  skipFor: TriageCluster;
}

const SWEEP_QUESTIONS: SweepQuestion[] = [
  {
    id: 'sweep_bleeding',
    text: 'Any bleeding or fluid leaking?',
    layout: 'yesno',
    options: YES_NO,
    skipFor: 'BLEEDING',
  },
  {
    id: 'sweep_prec',
    text: "Any headache that won't shift, changes to your vision, or sudden swelling?",
    layout: 'yesno',
    options: YES_NO,
    skipFor: 'PREECLAMPSIA',
  },
  {
    id: 'sweep_rfm',
    text: "Have your baby's movements been normal for you today?",
    layout: 'yesno',
    options: YES_NO,
    skipFor: 'RFM',
  },
];

/* ── Steps (state machine) ──────────────────────────────────────────── */

type Step =
  | { kind: 'g999' }
  | { kind: 'question'; group: 'branch' | 'sweep'; question: FlowQuestion };

/** Lookup of every branch question by id, used to validate pre-filled answers. */
const QUESTION_BY_ID: Record<string, FlowQuestion> = Object.fromEntries(
  Object.values(BRANCH_QUESTIONS)
    .flat()
    .map((q) => [q.id, q]),
);

/**
 * Keeps only pre-filled answers that are SAFE to trust: the question must exist
 * and the value must be one of its legal options. Guards against the LLM
 * hallucinating an invalid answer value (anything invalid is dropped and the
 * question is asked normally).
 */
function validatePrefilled(extracted: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [questionId, value] of Object.entries(extracted ?? {})) {
    const question = QUESTION_BY_ID[questionId];
    if (question && question.options.some((o) => o.value === value)) {
      out[questionId] = value;
    }
  }
  return out;
}

/**
 * Builds the branch + sweep flow for the cluster. Branch questions whose id is
 * already answered (and validated) from the free text are skipped -- they stay
 * in the answers payload so the rules engine still receives them.
 */
function buildFlowSteps(cluster: TriageCluster, skipQuestionIds: Set<string>): Step[] {
  const branch = (BRANCH_QUESTIONS[cluster] ?? []).filter((q) => !skipQuestionIds.has(q.id));
  const sweeps = SWEEP_QUESTIONS.filter((s) => s.skipFor !== cluster);
  return [
    ...branch.map((question): Step => ({ kind: 'question', group: 'branch', question })),
    ...sweeps.map((question): Step => ({ kind: 'question', group: 'sweep', question })),
  ];
}

interface RouterState {
  sessionId?: string;
  interpretation?: IntakeInterpretation;
  freeText?: string;
}

function Disclaimer() {
  return (
    <p className="questions__disclaimer">
      This is guidance, not a diagnosis. <strong>In an emergency, call 999.</strong>
    </p>
  );
}

export default function QuestionsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const routerState = (location.state ?? {}) as RouterState;
  const sessionId = routerState.sessionId;
  const interpretation = routerState.interpretation;
  const context = useMemo(() => loadContext(), []);

  const cluster: TriageCluster = interpretation?.primaryCluster ?? 'OTHER';

  // Answers the free text already supplied (validated against legal options).
  const prefilled = useMemo(
    () => validatePrefilled(interpretation?.extractedAnswers),
    [interpretation],
  );

  // The flow is built immediately on mount from the interpretation cluster: the
  // g999 safety screen, then the branch questions (minus any already pre-filled),
  // then the red-flag sweep. There is no cluster-confirmation gate.
  const [steps] = useState<Step[]>(() => [
    { kind: 'g999' },
    ...buildFlowSteps(cluster, new Set(Object.keys(prefilled))),
  ]);
  const [index, setIndex] = useState(0);
  const [g999Checked, setG999Checked] = useState<Set<string>>(new Set());
  const [branchAnswers, setBranchAnswers] = useState<Record<string, string>>(() => ({
    ...prefilled,
  }));
  const [sweepAnswers, setSweepAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: the flow needs both a session and the gestation context.
  useEffect(() => {
    if (!sessionId || !context) {
      navigate('/triage/gestation', { replace: true });
    }
  }, [sessionId, context, navigate]);

  if (!sessionId || !context) {
    return null;
  }

  const step = steps[index];
  const progress = Math.round(((index + 1) / steps.length) * 100);
  const firstBranchIndex = steps.findIndex(
    (s) => s.kind === 'question' && s.group === 'branch',
  );

  const stepLabel = (() => {
    if (step.kind === 'g999') return 'Step 2 · Safety check';
    if (step.kind === 'question' && step.group === 'sweep') return 'Step 3 · A few more checks';
    return 'Step 3 · Your symptoms';
  })();

  const goBack = () => {
    if (submitting) return;
    setError(null);
    if (index === 0) {
      navigate('/triage');
      return;
    }
    setIndex((i) => i - 1);
  };

  const advance = () => {
    if (index < steps.length - 1) {
      setIndex((i) => i + 1);
    } else {
      void submit(false);
    }
  };

  const buildBody = (global999: boolean) => {
    const answers: AnswerEntry[] = Object.entries(branchAnswers).map(
      ([questionId, answer]) => ({ questionId, answer }),
    );
    const sweeps: AnswerEntry[] = Object.entries(sweepAnswers).map(
      ([questionId, answer]) => ({ questionId, answer }),
    );
    return {
      gestationWeeks: context.gestationWeeks,
      isPostnatal: context.isPostnatal,
      trustId: context.trustId,
      global999Triggered: global999,
      primaryCluster: cluster,
      answers: global999 ? [] : answers,
      sweepAnswers: global999 ? [] : sweeps,
    };
  };

  const submit = async (global999: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const disposition = await submitAnswers(sessionId, buildBody(global999));
      navigate('/triage/result', { state: { disposition, sessionId } });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  };

  /* ── g999 handlers ── */
  const toggleG999 = (value: string) => {
    setG999Checked((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleG999Continue = () => {
    if (g999Checked.size > 0) {
      void submit(true); // short-circuit to emergency
    } else {
      advance();
    }
  };

  /* ── question handlers (tap to select, then auto-advance) ── */
  const handleSelect = (group: 'branch' | 'sweep', questionId: string, value: string) => {
    if (submitting) return;
    if (group === 'branch') {
      setBranchAnswers((prev) => ({ ...prev, [questionId]: value }));
    } else {
      setSweepAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
    window.setTimeout(advance, 220);
  };

  const currentAnswer = (group: 'branch' | 'sweep', questionId: string) =>
    group === 'branch' ? branchAnswers[questionId] : sweepAnswers[questionId];

  return (
    <div className="questions">
      <header className="questions__header">
        <button
          type="button"
          className="questions__back"
          onClick={goBack}
          disabled={submitting}
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <MiraLogo variant="dark" />
        <span className="questions__step-label">{stepLabel}</span>
      </header>

      <div className="questions__progress" aria-hidden="true">
        <span className="questions__progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <main className="questions__main">
        <div className="questions__content" key={`step-${index}`}>
          {step.kind === 'g999' && (
            <section className="questions__panel">
              <h1 className="questions__question">
                First, are any of these happening right now?
              </h1>
              <p className="questions__lead">
                Tick anything that applies. If none do, that&apos;s good — just tap
                &ldquo;None of these&rdquo;.
              </p>
              <div className="questions__checklist">
                {G999_ITEMS.map((item) => {
                  const checked = g999Checked.has(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`questions__check${checked ? ' is-checked' : ''}`}
                      onClick={() => toggleG999(item.value)}
                      aria-pressed={checked}
                    >
                      <span className="questions__check-box" aria-hidden="true">
                        {checked && <Check size={16} strokeWidth={3} />}
                      </span>
                      <span className="questions__check-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step.kind === 'question' && (
            <section className="questions__panel">
              {step.group === 'branch' && index === firstBranchIndex && (
                <p className="questions__banner">
                  Based on what you told us:{' '}
                  <strong>{CLUSTER_LABELS[cluster]}</strong>
                </p>
              )}
              <h1 className="questions__question">{step.question.text}</h1>
              <div
                className={
                  step.question.layout === 'yesno'
                    ? 'questions__answers questions__answers--yesno'
                    : 'questions__answers'
                }
              >
                {step.question.options.map((option) => {
                  const selected =
                    currentAnswer(step.group, step.question.id) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`questions__answer${selected ? ' is-selected' : ''}`}
                      onClick={() => handleSelect(step.group, step.question.id, option.value)}
                      disabled={submitting}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {error && (
          <p className="questions__error" role="alert">
            {error}
          </p>
        )}

        {step.kind === 'g999' && (
          <button
            type="button"
            className="questions__cta"
            onClick={handleG999Continue}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} strokeWidth={2.25} className="questions__spinner" aria-hidden="true" />
                One moment…
              </>
            ) : g999Checked.size > 0 ? (
              'Continue'
            ) : (
              'None of these'
            )}
          </button>
        )}

        {submitting && step.kind === 'question' && (
          <p className="questions__submitting">
            <Loader2 size={16} strokeWidth={2.25} className="questions__spinner" aria-hidden="true" />
            Finding your pathway…
          </p>
        )}

        <Disclaimer />
      </main>
    </div>
  );
}
