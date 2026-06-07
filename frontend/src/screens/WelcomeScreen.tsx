import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import MiraLogo from '../components/MiraLogo';
import './WelcomeScreen.css';

const STEPS = [
  'Tell us how many weeks pregnant you are',
  'Describe your main concern',
  'Answer a few guided questions',
  'Get your personalised NHS pathway',
] as const;

function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`welcome__disclaimer ${className}`.trim()}>
      This is guidance, not a diagnosis.{' '}
      <strong>In an emergency, call 999.</strong>
    </p>
  );
}

export default function WelcomeScreen() {
  return (
    <div className="welcome">
      <aside className="welcome__hero" aria-label="Introduction">
        <header className="welcome__hero-header">
          <MiraLogo variant="light" />
          <span className="welcome__nhs-badge">NHS Maternity</span>
        </header>

        <div className="welcome__hero-body">
          <p className="welcome__eyebrow">Your maternity companion</p>
          <h1 className="welcome__hero-title">How are you feeling today?</h1>
          <p className="welcome__hero-lead">
            Provided by your maternity team to help you find the right care, quickly.
          </p>
        </div>

        <Disclaimer className="welcome__disclaimer--hero" />
      </aside>

      <main className="welcome__main">
        <header className="welcome__main-header">
          <MiraLogo variant="dark" />
          <h2 className="welcome__title">Welcome to Mira</h2>
          <p className="welcome__subtitle">
            Answer a few guided questions to find the right NHS pathway for you.
          </p>
        </header>

        <div className="welcome__info-card">
          <ShieldCheck
            className="welcome__info-icon"
            size={22}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <p className="welcome__info-title">You&apos;re in the right place</p>
            <p className="welcome__info-text">
              This tool helps you understand your symptoms and connects you with the
              right NHS pathway. It takes about 2 minutes.
            </p>
          </div>
        </div>

        <section className="welcome__steps" aria-labelledby="welcome-steps-heading">
          <h3 id="welcome-steps-heading" className="welcome__steps-heading">
            What to expect
          </h3>
          <ol className="welcome__steps-list">
            {STEPS.map((step, index) => (
              <li key={step} className="welcome__step">
                <span className="welcome__step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="welcome__step-text">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <Link to="/triage" className="welcome__cta">
          Start a check
          <span aria-hidden="true"> →</span>
        </Link>

        <Disclaimer className="welcome__disclaimer--main" />
      </main>
    </div>
  );
}
