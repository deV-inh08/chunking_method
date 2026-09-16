import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) {
  return <button ref={ref} className={`ds-button ds-button-${variant} ds-button-${size} ${className}`} disabled={disabled || loading} {...props}>
    {loading && <Loader2 size={15} className="ds-spin" />}{children}
  </button>;
});

export function Card({ title, description, actions, variant = 'default', className = '', children }) {
  return <section className={`ds-card ds-card-${variant} ${className}`}>
    {(title || description || actions) && <header className="ds-card-header"><div>{title && <h3>{title}</h3>}{description && <p>{description}</p>}</div>{actions}</header>}
    {children}
  </section>;
}

export function Badge({ tone = 'neutral', children, className = '' }) { return <span className={`ds-badge ds-badge-${tone} ${className}`}>{children}</span>; }

export function ProgressBar({ value = 0, max = 100, tone = 'accent', label }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return <div className="ds-progress-wrap">{label && <div className="ds-progress-label"><span>{label}</span><strong>{Math.round(percent)}%</strong></div>}<div className="ds-progress"><span className={`ds-progress-${tone}`} style={{ width: `${percent}%` }} /></div></div>;
}

export function Skeleton({ width = '100%', height = 16, circle = false }) { return <span className={`ds-skeleton ${circle ? 'ds-skeleton-circle' : ''}`} style={{ width, height }} />; }
