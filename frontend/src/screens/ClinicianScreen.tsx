import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, Search } from 'lucide-react';
import { getClinicianSummary, ApiError, type ClinicianSummary } from '../lib/api';
import './ClinicianScreen.css';

type Status = 'idle' | 'loading' | 'loaded' | 'error';

const URGENCY_LABELS: Record<string, string> = {
  NHS_111: 'Low Urgency',
  EPU: 'Early Pregnancy Unit',
  MAT_TRIAGE_NOW: 'Maternity Triage — Now',
  EMERGENCY_999: 'Emergency 999',
};

const SECTIONS: { key: keyof ClinicianSummary; label: string }[] = [
  { key: 'situation', label: 'Situation' },
  { key: 'background', label: 'Background' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'recommendation', label: 'Recommendation' },
];

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export default function ClinicianScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionParam = searchParams.get('session') ?? '';

  const [inputValue, setInputValue] = useState(sessionParam);
  const [status, setStatus] = useState<Status>(sessionParam ? 'loading' : 'idle');
  const [summary, setSummary] = useState<ClinicianSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The loading transition is driven by the event handler / initial state so the
  // effect only ever calls setState from async callbacks (no cascading renders).
  useEffect(() => {
    if (!sessionParam) {
      return;
    }
    let active = true;
    getClinicianSummary(sessionParam)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setStatus('loaded');
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : 'Could not load the clinician summary.',
        );
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [sessionParam]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setStatus('loading');
    setError(null);
    setSummary(null);
    setSearchParams({ session: trimmed });
  };

  return (
    <div className="clinician">
      <div className="clinician__inner">
        <header className="clinician__header">
          <span className="clinician__icon" aria-hidden="true">
            <ClipboardList size={20} strokeWidth={2} />
          </span>
          <div>
            <h1 className="clinician__title">Clinician View</h1>
            <p className="clinician__subtitle">
              SBAR handoff — clinician use only. Not shown to the patient.
            </p>
          </div>
        </header>

        <div className="clinician__content">
        <form className="clinician__lookup" onSubmit={handleLookup}>
          <label htmlFor="session-input" className="clinician__lookup-label">
            Session ID
          </label>
          <div className="clinician__lookup-row">
            <input
              id="session-input"
              className="clinician__lookup-input"
              type="text"
              placeholder="Paste a session ID"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="clinician__lookup-btn" disabled={!inputValue.trim()}>
              <Search size={18} strokeWidth={2.25} aria-hidden="true" />
              Load
            </button>
          </div>
        </form>

        {status === 'idle' && (
          <p className="clinician__hint">
            Enter a session ID above to view its SBAR summary, or open this page with
            <code> /clinician?session=&lt;id&gt;</code>.
          </p>
        )}

        {status === 'loading' && (
          <p className="clinician__loading">
            <Loader2 size={18} strokeWidth={2.25} className="clinician__spinner" aria-hidden="true" />
            Loading summary…
          </p>
        )}

        {status === 'error' && error && (
          <p className="clinician__error" role="alert">
            {error}
          </p>
        )}

        {status === 'loaded' && summary && (
          <>
            <div className="clinician__cards">
              {SECTIONS.map((section) => (
                <article key={section.key} className="clinician__card">
                  <h2 className="clinician__card-label">{section.label}</h2>
                  <p className="clinician__card-body">
                    {(summary[section.key] as string) || '—'}
                  </p>
                </article>
              ))}
            </div>

            <footer className="clinician__footer">
              <span
                className={`clinician__urgency clinician__urgency--${summary.urgencyLevel.toLowerCase().replace(/_/g, '-')}`}
              >
                {URGENCY_LABELS[summary.urgencyLevel] ?? summary.urgencyLevel}
              </span>
              <span className="clinician__action">{summary.recommendedAction}</span>
              <span className="clinician__timestamp">{formatTimestamp(summary.timestamp)}</span>
            </footer>
          </>
        )}
        </div>{/* clinician__content */}
      </div>
    </div>
  );
}
