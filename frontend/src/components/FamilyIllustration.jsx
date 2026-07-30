/**
 * Purely decorative — a small, warm "family + dog in front of a house"
 * vignette for the hero's free space, meant to read as a trust signal
 * (real families live in these homes) the way the 3D houses in HeroScene
 * read as "browse the market." Flat SVG + CSS keyframes, no 3D/asset
 * dependency. Colors are pulled from the site's own palette (accent
 * green, steel blue, gold, cream) so it never looks like a stock clip-art
 * drop-in. Hidden below lg (see Hero.jsx) — no room for it on narrow
 * screens — and every animation freezes under prefers-reduced-motion.
 */
export default function FamilyIllustration() {
  return (
    <svg
      viewBox="0 0 240 240"
      className="w-full h-full overflow-visible"
      role="img"
      aria-label="Illustration of a happy family and their dog playing outside their new home"
    >
      {/* sun */}
      <circle cx="42" cy="40" r="20" fill="var(--color-gold-soft)" className="family-illo-sun-glow" opacity="0.5" />
      <circle cx="42" cy="40" r="12" fill="var(--color-gold)" />

      {/* ground */}
      <ellipse cx="125" cy="196" rx="98" ry="11" fill="var(--color-accent-soft)" />

      {/* house */}
      <g>
        <rect x="150" y="118" width="12" height="26" fill="var(--color-ink-soft)" />
        <polygon points="95,120 180,120 137,72" fill="var(--color-accent)" />
        <rect x="100" y="120" width="74" height="62" rx="4" fill="var(--color-cream-deep)" stroke="var(--color-ink-soft)" strokeWidth="2" />
        <rect x="129" y="150" width="18" height="32" fill="var(--color-accent)" />
        <rect x="107" y="132" width="16" height="16" rx="2" fill="#ffffff" stroke="var(--color-ink-soft)" strokeWidth="1.5" />
        <rect x="153" y="132" width="16" height="16" rx="2" fill="#ffffff" stroke="var(--color-ink-soft)" strokeWidth="1.5" />
        <line x1="115" y1="132" x2="115" y2="148" stroke="var(--color-ink-soft)" strokeWidth="1.2" />
        <line x1="107" y1="140" x2="123" y2="140" stroke="var(--color-ink-soft)" strokeWidth="1.2" />
        <line x1="161" y1="132" x2="161" y2="148" stroke="var(--color-ink-soft)" strokeWidth="1.2" />
        <line x1="153" y1="140" x2="169" y2="140" stroke="var(--color-ink-soft)" strokeWidth="1.2" />
      </g>

      {/* family, holding hands, gently bobbing together */}
      <g className="family-illo-bob">
        {/* dad */}
        <rect x="41" y="151" width="15" height="26" rx="7" fill="var(--color-steel)" />
        <circle cx="48.5" cy="145" r="8" fill="#f0c9a0" />
        {/* mom */}
        <path d="M62 178 L62 158 Q62 150 70 150 Q78 150 78 158 L78 178 Z" fill="var(--color-accent)" />
        <circle cx="70" cy="143" r="7.5" fill="#f0c9a0" />
        <path d="M63 138 Q70 130 77 138 L77 143 Q70 137 63 143 Z" fill="#5c3a26" />
        {/* kid */}
        <rect x="86" y="167" width="12" height="19" rx="6" fill="var(--color-gold)" />
        <circle cx="92" cy="163" r="6" fill="#f0c9a0" />
        {/* linked arms */}
        <path d="M56 163 Q60 168 64 163" stroke="#f0c9a0" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M79 170 Q83 174 87 170" stroke="#f0c9a0" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      {/* dog, jumping + tail wagging */}
      <g className="family-illo-jump">
        <ellipse cx="118" cy="186" rx="15" ry="8.5" fill="var(--color-gold)" />
        <circle cx="132" cy="180" r="7" fill="var(--color-gold)" />
        <polygon points="128,174 131,168 134,175" fill="var(--color-gold)" />
        <circle cx="135" cy="179" r="1.3" fill="var(--color-ink)" />
        <path
          d="M104 184 Q94 178 98 168"
          stroke="var(--color-gold)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="family-illo-tail"
        />
      </g>

      {/* playful sparkles */}
      <circle cx="160" cy="150" r="2" fill="var(--color-accent)" className="family-illo-sparkle" style={{ animationDelay: "0.3s" }} />
      <circle cx="30" cy="110" r="2.4" fill="var(--color-gold)" className="family-illo-sparkle" style={{ animationDelay: "1.1s" }} />
      <circle cx="180" cy="95" r="1.8" fill="var(--color-accent)" className="family-illo-sparkle" style={{ animationDelay: "0.7s" }} />
    </svg>
  );
}
