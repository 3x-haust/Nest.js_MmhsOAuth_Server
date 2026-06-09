import { createHash } from 'crypto';

type Palette = {
  readonly background: string;
  readonly surface: string;
  readonly accent: string;
  readonly ink: string;
};

const palettes: readonly Palette[] = [
  {
    background: '#DFFCF4',
    surface: '#8EE7D1',
    accent: '#0F766E',
    ink: '#083344',
  },
  {
    background: '#FFE7DF',
    surface: '#FF9C8A',
    accent: '#9F1239',
    ink: '#3B0A18',
  },
  {
    background: '#E9E7FF',
    surface: '#B8A9FF',
    accent: '#4338CA',
    ink: '#1E1B4B',
  },
  {
    background: '#E0F2FE',
    surface: '#7DD3FC',
    accent: '#0369A1',
    ink: '#082F49',
  },
  {
    background: '#ECFCCB',
    surface: '#BEF264',
    accent: '#3F6212',
    ink: '#1A2E05',
  },
  {
    background: '#FFE4E6',
    surface: '#FDA4AF',
    accent: '#BE123C',
    ink: '#4C0519',
  },
  {
    background: '#F1F5F9',
    surface: '#CBD5E1',
    accent: '#334155',
    ink: '#0F172A',
  },
  {
    background: '#FEF3C7',
    surface: '#FCD34D',
    accent: '#92400E',
    ink: '#451A03',
  },
];

const variants = ['orb', 'ribbon', 'gem', 'wave', 'signal'] as const;

const pick = <T>(items: readonly T[], value: number): T => {
  return items[value % items.length];
};

const byte = (hash: Buffer, index: number): number => hash[index] ?? 0;

export const getDefaultProfileImageUrl = (userId: number | string): string => {
  return `/api/v1/user/default-profile-image/${encodeURIComponent(String(userId))}.svg`;
};

export const resolveProfileImageUrl = (user: {
  readonly id: number | string;
  readonly profileImageUrl?: string | null;
}): string => {
  return user.profileImageUrl ?? getDefaultProfileImageUrl(user.id);
};

const buildCenterShape = (
  variant: (typeof variants)[number],
  palette: Palette,
  hash: Buffer,
): string => {
  const rotation = byte(hash, 4) % 360;
  const offset = (byte(hash, 5) % 17) - 8;
  const scale = 0.82 + (byte(hash, 6) % 18) / 100;

  if (variant === 'ribbon') {
    return `
      <g transform="rotate(${rotation} 64 64) scale(${scale}) translate(${(1 - scale) * 64} ${(1 - scale) * 64})">
        <path d="M28 42 C42 30 56 34 64 44 C72 34 86 30 100 42 L88 78 C75 72 66 73 64 84 C62 73 53 72 40 78 Z" fill="${palette.accent}"/>
        <path d="M40 48 C51 42 58 45 64 54 C70 45 77 42 88 48 L82 66 C73 62 67 64 64 72 C61 64 55 62 46 66 Z" fill="${palette.surface}"/>
      </g>`;
  }

  if (variant === 'gem') {
    return `
      <g transform="rotate(${rotation} 64 64)">
        <path d="M64 24 L96 48 L84 96 L44 96 L32 48 Z" fill="${palette.accent}"/>
        <path d="M64 36 L82 51 L76 82 L52 82 L46 51 Z" fill="${palette.surface}"/>
        <path d="M64 24 L82 51 L64 36 L46 51 Z" fill="${palette.ink}" opacity="0.2"/>
      </g>`;
  }

  if (variant === 'wave') {
    return `
      <g transform="rotate(${rotation} 64 64)">
        <path d="M24 72 C36 42 58 42 70 58 C82 74 92 74 104 52 L104 88 C88 104 70 100 58 84 C46 68 36 70 24 96 Z" fill="${palette.accent}"/>
        <path d="M30 58 C44 32 66 34 78 50 C86 61 94 62 102 50" fill="none" stroke="${palette.surface}" stroke-width="10" stroke-linecap="round"/>
      </g>`;
  }

  if (variant === 'signal') {
    return `
      <g transform="rotate(${rotation} 64 64)">
        <circle cx="42" cy="46" r="11" fill="${palette.accent}"/>
        <circle cx="84" cy="48" r="9" fill="${palette.ink}" opacity="0.82"/>
        <circle cx="64" cy="84" r="13" fill="${palette.surface}"/>
        <path d="M50 50 L76 50 L68 76" fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;
  }

  return `
    <g transform="translate(${offset} ${-offset}) rotate(${rotation} 64 64)">
      <circle cx="58" cy="58" r="28" fill="${palette.accent}"/>
      <circle cx="78" cy="76" r="22" fill="${palette.surface}"/>
      <circle cx="50" cy="80" r="9" fill="${palette.ink}" opacity="0.22"/>
    </g>`;
};

export const generateMirimBadgeSvg = (seed: number | string): string => {
  const hash = createHash('sha256').update(String(seed)).digest();
  const palette = pick(palettes, byte(hash, 0));
  const variant = pick(variants, byte(hash, 1));
  const ringWidth = 4 + (byte(hash, 2) % 4);
  const dotCount = 3 + (byte(hash, 3) % 4);
  const dots = Array.from({ length: dotCount }, (_, index) => {
    const angle = ((byte(hash, 8 + index) % 360) * Math.PI) / 180;
    const radius = 43 + (byte(hash, 14 + index) % 8);
    const x = 64 + Math.cos(angle) * radius;
    const y = 64 + Math.sin(angle) * radius;
    const size = 3 + (byte(hash, 20 + index) % 5);
    const fill = index % 2 === 0 ? palette.accent : palette.ink;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size}" fill="${fill}" opacity="0.72"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Mirim Badge">
  <rect width="128" height="128" rx="36" fill="${palette.background}"/>
  <circle cx="64" cy="64" r="54" fill="${palette.surface}" opacity="0.34"/>
  <circle cx="64" cy="64" r="${53 - ringWidth / 2}" fill="none" stroke="${palette.ink}" stroke-width="${ringWidth}" opacity="0.92"/>
  ${buildCenterShape(variant, palette, hash)}
  ${dots}
</svg>`;
};
