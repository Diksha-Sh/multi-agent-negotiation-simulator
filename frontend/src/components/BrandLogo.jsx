/**
 * BrandLogo component rendering an Executive Deal Desk obsidian & amber emblem.
 */
export default function BrandLogo({ className = 'w-8 h-8', glow = true }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
        glow ? 'drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]' : ''
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
          <linearGradient id="dealDeskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>
          <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#dealDeskGrad)" stroke="#f59e0b" strokeOpacity="0.45" strokeWidth="1.2" />
        {/* Two converging bargaining vectors meeting at central equilibrium */}
        <path
          d="M7.5 22.5L14 16L7.5 9.5"
          stroke="#fbbf24"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24.5 9.5L18 16L24.5 22.5"
          stroke="#10b981"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="2.75" fill="url(#goldAccent)" />
      </svg>
    </div>
  );
}
