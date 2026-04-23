import styles from './NomioLogo.module.scss';

type Variant = 'onLight' | 'default';

const COLORS: Record<Variant, { c1: string; c2: string; c3: string; dot: string }> = {
  // On sand/cream backgrounds: swap invisible sand circle → ocean glass, add teal
  onLight: { c1: '#A7BEC1', c2: '#2F7C7A', c3: '#FFD248', dot: '#E85D4E' },
  // On dark/teal backgrounds: original sand circle is visible
  default: { c1: '#F1E4CF', c2: '#A7BEC1', c3: '#FFD248', dot: '#E85D4E' },
};

const WORDMARK_COLOR: Record<Variant, string> = {
  onLight: '#1B3B3A',
  default: '#F1E4CF',
};

interface NomioLogoProps {
  size?: number;
  variant?: Variant;
  withWordmark?: boolean;
  className?: string;
}

export default function NomioLogo({
  size = 40,
  variant = 'onLight',
  withWordmark = false,
  className,
}: NomioLogoProps) {
  const c = COLORS[variant];

  return (
    <span
      aria-label="Nomio"
      role="img"
      className={`${styles.logo} ${withWordmark ? styles.lockup : ''} ${className ?? ''}`.trim()}
      style={{
        '--logo-gap': `${Math.round(size * 0.22)}px`,
        '--logo-font-size': `${Math.round(size * 0.58)}px`,
        '--logo-wordmark-color': WORDMARK_COLOR[variant],
      } as React.CSSProperties}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        className={styles.mark}
      >
        <circle cx="85"  cy="95"  r="60" fill={c.c1} />
        <circle cx="155" cy="95"  r="60" fill={c.c2} />
        <circle cx="120" cy="155" r="60" fill={c.c3} />
        <circle cx="120" cy="155" r="11" fill={c.dot} />
      </svg>
      {withWordmark && (
        <span className={styles.wordmark} aria-hidden="true">
          Nomio
        </span>
      )}
    </span>
  );
}
