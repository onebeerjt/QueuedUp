import { SERVICES, normalizeServiceName } from '@/lib/services';
import type { StreamingSource } from '@/types/movie';

interface ServiceBadgeProps {
  source: StreamingSource;
  disabled: boolean;
}

export default function ServiceBadge({ source, disabled }: ServiceBadgeProps): JSX.Element {
  const serviceId = normalizeServiceName(source.name);
  const service = SERVICES.find((item) => item.id === serviceId);
  const label = service?.name ?? source.name;
  const color = service?.color ?? '#666';
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <a
      href={disabled ? undefined : source.web_url}
      target={disabled ? undefined : '_blank'}
      rel={disabled ? undefined : 'noreferrer'}
      title={label}
      className={`serviceBadge ${disabled ? 'disabled' : ''}`}
      aria-label={label}
      style={{ backgroundColor: color, color: color === '#FFFFFF' ? '#111' : '#fff' }}
    >
      {source.logo ? (
        // SVG icon fallback to text initial.
        <img
          src={source.logo}
          alt={label}
          className="serviceIcon"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const sibling = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (sibling) {
              sibling.style.display = 'inline';
            }
          }}
        />
      ) : null}
      <span style={{ display: source.logo ? 'none' : 'inline' }}>{initial}</span>
    </a>
  );
}
