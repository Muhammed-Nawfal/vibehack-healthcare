import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, HeartHandshake, Loader2 } from 'lucide-react';
import MiraLogo from '../components/MiraLogo';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  formatNhsNumber,
  isValidEmail,
  isValidGestationWeeks,
  isValidNhsNumber,
} from '../lib/validation';
import './SignUpScreen.css';

function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`signup__disclaimer ${className}`.trim()}>
      This is guidance, not a diagnosis.{' '}
      <strong>In an emergency, call 999.</strong>
    </p>
  );
}

type FormState = {
  fullName: string;
  email: string;
  password: string;
  gestationWeeks: string;
  nhsNumber: string;
};

const INITIAL: FormState = {
  fullName: '',
  email: '',
  password: '',
  gestationWeeks: '',
  nhsNumber: '',
};

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!isValidEmail(form.email)) return 'Please enter a valid email address.';
    if (form.password.length < 8) {
      return 'Your password needs at least 8 characters.';
    }

    if (mode === 'signin') return null;

    const name = form.fullName.trim();
    if (name.length < 2) return 'Please enter your full name.';
    const weeks = Number(form.gestationWeeks);
    if (!isValidGestationWeeks(weeks)) {
      return 'Please enter how many weeks pregnant you are (between 0 and 42).';
    }
    if (!isValidNhsNumber(form.nhsNumber)) {
      return 'Please enter a valid 10-digit NHS number.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(
        'Sign-up is not configured yet. Add your Supabase URL and anon key to the frontend .env file.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = getSupabase();
    const email = form.email.trim().toLowerCase();
    const fullName = form.fullName.trim();
    const gestationWeeks = Number(form.gestationWeeks);
    const nhsNumber = form.nhsNumber.replace(/\s/g, '');

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        if (signInError) throw signInError;
        navigate('/');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: fullName,
            gestation_weeks: gestationWeeks,
            nhs_number: nhsNumber,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (!data.session) {
        setMode('signin');
        setForm((prev) => ({ ...prev, password: '' }));
        setError('Account created. Check your email to confirm it, then sign in.');
        setSubmitting(false);
        return;
      }

      navigate('/');
    } catch (err) {
      const authError = err as { code?: string; message?: string };
      const isExistingUser =
        mode === 'signup' &&
        (authError.code === 'user_already_exists' ||
          authError.message?.toLowerCase().includes('already registered'));

      if (isExistingUser) {
        setMode('signin');
        setForm((prev) => ({ ...prev, password: '' }));
        setError('This email already has an account. Enter your password to sign in.');
        setSubmitting(false);
        return;
      }

      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="signup">
      <aside className="signup__hero" aria-label="Create your account">
        <header className="signup__hero-header">
          <MiraLogo variant="light" />
          <span className="signup__nhs-badge">NHS Maternity</span>
        </header>

        <div className="signup__hero-body">
          <p className="signup__eyebrow">After your first midwife visit</p>
          <h1 className="signup__hero-title">Welcome to Mira</h1>
          <p className="signup__hero-lead">
            Your midwife has introduced you to this companion. Set up your profile
            once, and we&apos;ll use your pregnancy week to guide you to the right
            care when you need it.
          </p>
        </div>

        <div className="signup__hero-foot">
          <div className="signup__info-pill">
            <HeartHandshake size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>Provided by your maternity team</span>
          </div>
          <Disclaimer className="signup__disclaimer--hero" />
        </div>
      </aside>

      <main className="signup__main">
        <div className="signup__main-inner">
          <header className="signup__main-header">
            <MiraLogo variant="dark" />
            <h2 className="signup__title">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="signup__subtitle">
              {mode === 'signup'
                ? 'A few details help us personalise your triage guidance. Your information stays private to you.'
                : 'Sign in to continue where you left off.'}
            </p>
          </header>

          <form className="signup__form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <div className="signup__field">
                <label htmlFor="full-name" className="signup__label">
                  Your name
                </label>
                <input
                  id="full-name"
                  className="signup__input"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Sarah Thompson"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            )}

            <div className="signup__field">
              <label htmlFor="email" className="signup__label">
                Email
              </label>
              <input
                id="email"
                className="signup__input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="signup__field">
              <label htmlFor="password" className="signup__label">
                Password
              </label>
              <input
                id="password"
                className="signup__input"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {mode === 'signup' && (
              <>
                <div className="signup__field">
                  <label htmlFor="gestation-weeks" className="signup__label">
                    How many weeks pregnant are you?
                  </label>
                  <input
                    id="gestation-weeks"
                    className="signup__input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={42}
                    placeholder="e.g. 28"
                    value={form.gestationWeeks}
                    onChange={(e) => update('gestationWeeks', e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <p className="signup__hint">
                    Use the week your midwife gave you at your booking visit.
                  </p>
                </div>

                <div className="signup__field">
                  <label htmlFor="nhs-number" className="signup__label">
                    NHS number
                  </label>
                  <input
                    id="nhs-number"
                    className="signup__input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000 000 0000"
                    value={form.nhsNumber}
                    onChange={(e) => update('nhsNumber', formatNhsNumber(e.target.value))}
                    disabled={submitting}
                    required
                  />
                  <p className="signup__hint">
                    The 10-digit number on your NHS card or appointment letters.
                  </p>
                </div>
              </>
            )}

            {error && (
              <p className="signup__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="signup__cta" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    strokeWidth={2.25}
                    className="signup__spinner"
                    aria-hidden="true"
                  />
                  {mode === 'signup' ? 'Creating your account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Create account' : 'Sign in'}
                  <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="signup__switch">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="signup__switch-link"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button
                  type="button"
                  className="signup__switch-link"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                >
                  Create an account
                </button>
              </>
            )}
          </p>

          <Disclaimer className="signup__disclaimer--main" />
        </div>
      </main>
    </div>
  );
}
