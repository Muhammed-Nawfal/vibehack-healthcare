import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mic, MicOff, Loader2 } from 'lucide-react';
import MiraLogo from '../components/MiraLogo';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { createSession, ApiError } from '../lib/api';
import './MainConcernScreen.css';

function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`concern__disclaimer ${className}`.trim()}>
      This is guidance, not a diagnosis.{' '}
      <strong>In an emergency, call 999.</strong>
    </p>
  );
}

export default function MainConcernScreen() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendTranscript = useCallback((chunk: string) => {
    const cleaned = chunk.trim();
    if (!cleaned) return;
    setText((prev) => {
      if (!prev) return cleaned;
      const needsSpace = !prev.endsWith(' ') && !prev.endsWith('\n');
      return `${prev}${needsSpace ? ' ' : ''}${cleaned}`;
    });
  }, []);

  const { isSupported, isListening, interim, error: voiceError, start, stop } =
    useSpeechToText({ onResult: appendTranscript });

  const toggleListening = () => {
    if (isListening) {
      stop();
    } else {
      setError(null);
      start();
    }
  };

  const handleContinue = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    if (isListening) stop();
    setSubmitting(true);
    setError(null);

    try {
      const { sessionId, interpretation } = await createSession(trimmed);
      navigate('/triage/questions', {
        state: { sessionId, interpretation, freeText: trimmed },
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(message);
      setSubmitting(false);
    }
  };

  const canContinue = text.trim().length > 0 && !submitting;

  return (
    <div className="concern">
      <aside className="concern__hero" aria-label="Main concern">
        <header className="concern__hero-header">
          <MiraLogo variant="light" />
          <span className="concern__step-label">Step 1 &middot; Main concern</span>
        </header>

        <div className="concern__hero-body">
          <p className="concern__eyebrow">Your maternity companion</p>
          <h1 className="concern__hero-title">
            What&apos;s worrying you most right now?
          </h1>
          <p className="concern__hero-lead">
            Tell us how you&apos;re feeling in your own words &mdash; type it, or tap
            the mic to speak. We use this to ask the right follow-up questions next.
          </p>
        </div>

        <div className="concern__hero-foot">
          <div className="concern__progress" aria-hidden="true">
            <span className="concern__progress-label">Your progress</span>
            <span className="concern__progress-track">
              <span className="concern__progress-fill" />
            </span>
          </div>
          <Disclaimer className="concern__disclaimer--hero" />
        </div>
      </aside>

      <main className="concern__main">
        <div className="concern__main-inner">
          <Link to="/" className="concern__back">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            Back
          </Link>

          <header className="concern__main-header">
            <h2 className="concern__title">Tell us in your own words</h2>
            <p className="concern__subtitle">
              Describe what&apos;s happening or how you&apos;re feeling. There are no
              wrong answers &mdash; even a sentence helps.
            </p>
          </header>

          <div className={`concern__input-card${isListening ? ' is-listening' : ''}`}>
            <label htmlFor="concern-input" className="concern__input-label">
              Describe it in your own words
            </label>
            <div className="concern__textarea-wrap">
              <textarea
                id="concern-input"
                className="concern__textarea"
                placeholder="e.g. I've noticed my baby hasn't moved much since this morning…"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={5}
                disabled={submitting}
              />
              {isSupported && (
                <button
                  type="button"
                  className={`concern__mic${isListening ? ' is-active' : ''}`}
                  onClick={toggleListening}
                  disabled={submitting}
                  aria-pressed={isListening}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                >
                  {isListening ? (
                    <MicOff size={20} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Mic size={20} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              )}
            </div>

            {isListening && (
              <p className="concern__listening" aria-live="polite">
                <span className="concern__listening-dot" aria-hidden="true" />
                Listening{interim ? `: ${interim}` : '...'}
              </p>
            )}

            <p className="concern__helper">
              {isSupported
                ? 'Your words help our AI understand your situation better. Voice input uses Google speech servers and needs internet access.'
                : 'Type your concern above — voice input is not available in this browser.'}
            </p>
          </div>

          {(error ?? voiceError) && (
            <p className="concern__error" role="alert">
              {error ?? voiceError}
            </p>
          )}

          <button
            type="button"
            className="concern__cta"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  strokeWidth={2.25}
                  className="concern__spinner"
                  aria-hidden="true"
                />
                Reading your words...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
              </>
            )}
          </button>

          <Disclaimer className="concern__disclaimer--main" />
        </div>
      </main>
    </div>
  );
}
