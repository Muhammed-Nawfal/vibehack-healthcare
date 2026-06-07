import { Heart } from 'lucide-react';
import './MiraLogo.css';

type MiraLogoProps = {
  variant?: 'light' | 'dark';
};

export default function MiraLogo({ variant = 'dark' }: MiraLogoProps) {
  return (
    <div className={`mira-logo mira-logo--${variant}`} aria-label="Mira">
      <span className="mira-logo__icon" aria-hidden="true">
        <Heart size={14} strokeWidth={2.5} fill="currentColor" />
      </span>
      <span className="mira-logo__text">mira</span>
    </div>
  );
}
