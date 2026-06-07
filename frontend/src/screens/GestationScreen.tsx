import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import MiraLogo from '../components/MiraLogo';
import { getTrusts, ApiError, type TrustSummary } from '../lib/api';
import { saveContext, loadContext } from '../lib/context';
import './GestationScreen.css';

function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`gestation__disclaimer ${className}`.trim()}>
      This is guidance, not a diagnosis.{' '}
      <strong>In an emergency, call 999.</strong>
    </p>
  );
}

export default function GestationScreen() {
  const navigate = useNavigate();
  const existing = loadContext();

  const [weeks, setWeeks] = useState<string>(
    existing && !existing.isPostnatal ? String(existing.gestationWeeks) : '',
  );
  const [isPostnatal, setIsPostnatal] = useState<boolean>(existing?.isPostnatal ?? false);
  const [trusts, setTrusts] = useState<TrustSummary[]>([]);
  const [trustId, setTrustId] = useState<string>(existing?.trustId ?? '');
  const [loadingTrusts, setLoadingTrusts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getTrusts()
      .then((list) => {
        if (!active) return;
        setTrusts(list);
        setTrustId((current) => current || (list[0]?.id ?? ''));
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load maternity units. Please try again.',
        );
      })
      .finally(() => {
        if (active) setLoadingTrusts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const weeksNumber = Number(weeks);
  const weeksValid =
    isPostnatal || (weeks !== '' && Number.isInteger(weeksNumber) && weeksNumber >= 1 && weeksNumber <= 42);
  const canContinue = weeksValid && trustId !== '';

  const handleContinue = () => {
    if (!canContinue) return;
    saveContext({
      gestationWeeks: isPostnatal ? 0 : weeksNumber,
      isPostnatal,
      trustId,
    });
    navigate('/triage');
  };

  return (
    <div className="gestation">
      <aside className="gestation__hero" aria-label="Getting started">
        <header className="gestation__hero-header">
          <MiraLogo variant="light" />
          <span className="gestation__step-label">Step 1 &middot; About you</span>
        </header>

        <div className="gestation__hero-body">
          <p className="gestation__eyebrow">Your maternity companion</p>
          <h1 className="gestation__hero-title">Let&apos;s start with a few basics</h1>
          <p className="gestation__hero-lead">
            Knowing how far along you are and which unit cares for you helps us point
            you to exactly the right people.
          </p>
        </div>

        <Disclaimer className="gestation__disclaimer--hero" />
      </aside>

      <main className="gestation__main">
        <div className="gestation__main-inner">
          <Link to="/" className="gestation__back">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            Back
          </Link>

          <header className="gestation__main-header">
            <h2 className="gestation__title">A little about your pregnancy</h2>
            <p className="gestation__subtitle">
              This stays on your device and helps us guide you to the right care.
            </p>
          </header>

          <div className="gestation__card">
            {!isPostnatal && (
              <div className="gestation__field">
                <label htmlFor="weeks-input" className="gestation__label">
                  How many weeks pregnant are you?
                </label>
                <input
                  id="weeks-input"
                  className="gestation__weeks-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={42}
                  placeholder="e.g. 30"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                />
                <p className="gestation__hint">Any number from 1 to 42 weeks.</p>
              </div>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={isPostnatal}
              className={`gestation__toggle${isPostnatal ? ' is-on' : ''}`}
              onClick={() => setIsPostnatal((v) => !v)}
            >
              <span className="gestation__toggle-text">
                I&apos;ve given birth in the last 6 weeks
              </span>
              <span className="gestation__toggle-track" aria-hidden="true">
                <span className="gestation__toggle-thumb" />
              </span>
            </button>

            <div className="gestation__field">
              <label htmlFor="trust-select" className="gestation__label">
                Your nearest maternity unit
              </label>
              <select
                id="trust-select"
                className="gestation__select"
                value={trustId}
                onChange={(e) => setTrustId(e.target.value)}
                disabled={loadingTrusts || trusts.length === 0}
              >
                {loadingTrusts && <option value="">Loading units…</option>}
                {!loadingTrusts &&
                  trusts.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="gestation__error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="gestation__cta"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            {loadingTrusts ? (
              <>
                <Loader2 size={18} strokeWidth={2.25} className="gestation__spinner" aria-hidden="true" />
                Getting ready…
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
              </>
            )}
          </button>

          <Disclaimer className="gestation__disclaimer--main" />
        </div>
      </main>
    </div>
  );
}
