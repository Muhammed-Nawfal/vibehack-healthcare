import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, ShieldAlert } from 'lucide-react';
import MiraLogo from '../components/MiraLogo';
import type { Disposition, UrgencyLevel } from '../lib/api';
import './ResultScreen.css';

interface RouterState {
  disposition?: Disposition;
  sessionId?: string;
}

const URGENCY_META: Record<UrgencyLevel, { label: string; tone: 'low' | 'medium' | 'emergency' }> = {
  NHS_111: { label: 'Seek advice', tone: 'low' },
  EPU: { label: 'Contact EPU today', tone: 'medium' },
  MAT_TRIAGE_NOW: { label: 'Urgent', tone: 'medium' },
  EMERGENCY_999: { label: 'Emergency', tone: 'emergency' },
};

function telHref(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleaned || phone}`;
}

export default function ResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { disposition, sessionId } = (location.state ?? {}) as RouterState;

  useEffect(() => {
    if (!disposition) {
      navigate('/', { replace: true });
    }
  }, [disposition, navigate]);

  if (!disposition) {
    return null;
  }

  const meta = URGENCY_META[disposition.urgencyLevel] ?? URGENCY_META.MAT_TRIAGE_NOW;
  const isEmergency = disposition.urgencyLevel === 'EMERGENCY_999';
  const showNearby =
    !isEmergency &&
    (disposition.urgencyLevel === 'MAT_TRIAGE_NOW' || disposition.urgencyLevel === 'EPU') &&
    disposition.nearbyContacts.length > 0;
  const primary = disposition.primaryContact;

  return (
    <div className={`result result--${meta.tone}`}>
      <div className="result__inner">
        <header className="result__header">
          <MiraLogo variant="dark" />
        </header>

        <span className={`result__badge result__badge--${meta.tone}`}>
          {isEmergency && <ShieldAlert size={16} strokeWidth={2.5} aria-hidden="true" />}
          {meta.label}
        </span>

        <h1 className="result__pathway">{disposition.pathwayName}</h1>
        <p className="result__message">{disposition.patientMessage}</p>

        {primary && (
          <a
            href={telHref(primary.phoneNumber)}
            className={`result__cta${isEmergency ? ' result__cta--emergency' : ''}`}
          >
            <Phone size={20} strokeWidth={2.25} aria-hidden="true" />
            Call {primary.phoneNumber}
          </a>
        )}
        {primary && !isEmergency && (
          <p className="result__contact-name">{primary.trustName}</p>
        )}

        <div className="result__safety">
          <ShieldAlert size={18} strokeWidth={2} aria-hidden="true" className="result__safety-icon" />
          <p>{disposition.safetyNetting}</p>
        </div>

        {showNearby && (
          <section className="result__nearby" aria-label="Nearby options">
            <h2 className="result__nearby-heading">Nearby options</h2>
            <div className="result__nearby-list">
              {disposition.nearbyContacts.map((contact) => (
                <a
                  key={`${contact.trustName}-${contact.phoneNumber}`}
                  href={telHref(contact.phoneNumber)}
                  className="result__nearby-card"
                >
                  <span className="result__nearby-name">{contact.trustName}</span>
                  <span className="result__nearby-phone">
                    <Phone size={15} strokeWidth={2.25} aria-hidden="true" />
                    {contact.phoneNumber}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        <p className="result__disclaimer">
          This is guidance, not a diagnosis. <strong>In an emergency, call 999.</strong>
        </p>

        {import.meta.env.DEV && sessionId && (
          <a
            href={`/clinician?session=${sessionId}`}
            className="result__clinician-link"
            target="_blank"
            rel="noreferrer"
          >
            Clinician view →
          </a>
        )}
      </div>
    </div>
  );
}
