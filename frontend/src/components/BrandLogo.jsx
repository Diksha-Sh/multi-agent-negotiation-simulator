/**
 * BrandLogo component rendering the official NegotiationAI vector favicon.
 * Mirrors public/favicon.svg exactly with responsive scaling, crisp vector definition,
 * and ambient indigo/blue glow for both Light and Dark themes.
 */
export default function BrandLogo({ className = 'w-8 h-8', glow = true }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
        glow ? 'drop-shadow-[0_2px_8px_rgba(37,99,235,0.35)]' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block rounded-xl overflow-hidden"
      >
        <defs>
          <linearGradient id="nAiBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="nAiBrandGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#2563eb" floodOpacity="0.3" />
          </filter>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#nAiBrandGradient)" />
        <path
          d="M8.5 23.5V8.5L23.5 23.5V8.5"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="8.5" r="2.25" fill="#ffffff" />
        <circle cx="8.5" cy="23.5" r="2.25" fill="#93c5fd" />
        <circle cx="23.5" cy="8.5" r="2.25" fill="#93c5fd" />
        <circle cx="23.5" cy="23.5" r="2.25" fill="#ffffff" />
        <circle cx="16" cy="16" r="3.25" fill="#ffffff" filter="url(#nAiBrandGlow)" />
        <circle cx="16" cy="16" r="1.75" fill="#2563eb" />
        <path
          d="M6 16H8.5M23.5 16H26"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
