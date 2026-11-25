/**
 * BrandLogo component rendering the NegotiationAI Handshake Crest
 * in Midnight Navy (#0E153A), Electric Crimson (#EE2A54), and Mint Teal (#1CD4A3).
 */
export default function BrandLogo({ className = 'w-9 h-9', glow = true }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
        glow ? 'drop-shadow-[0_4px_14px_rgba(238,42,84,0.4)]' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block rounded-xl overflow-hidden"
      >
        <defs>
          <linearGradient id="nAiCrimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EE2A54" />
            <stop offset="65%" stopColor="#1D2B78" />
            <stop offset="100%" stopColor="#0E153A" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#nAiCrimsonGrad)" />
        <path
          d="M7.5 18.5L13 13C14.3 11.7 16.3 11.7 17.6 12.8L20 14.8L22.6 12.7C23.9 11.6 25.8 11.7 27 12.9L32.5 18.5"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.5 22.5L14.5 25.5C15.5 26.5 17 26.5 18 25.5L20 23.5L22 25.5C23 26.5 24.5 26.5 25.5 25.5L28.5 22.5"
          stroke="#1CD4A3"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.5 18.5L18.5 21.2C19.3 21.9 20.6 21.9 21.4 21.2L24.5 18.5"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="9.5" r="1.8" fill="#1CD4A3" />
      </svg>
    </div>
  );
}
