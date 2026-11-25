/**
 * Crisp miniature vector artwork headers for the 3 negotiation arenas,
 * styled in Midnight Navy (#0E153A / #131B4B), Electric Crimson (#EE2A54), and Mint Teal (#1CD4A3).
 */

export function VendorBanner({ className = 'w-full h-32' }) {
  return (
    <div className={`liquid-glass relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#0A102E] via-[#131B4B] to-[#1D2B78] flex items-center justify-center ${className}`}>
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#EE2A54]/25 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-[#1CD4A3]/20 rounded-full blur-2xl" />

      <svg viewBox="0 0 380 140" className="relative z-10 w-full h-full max-w-xs drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stacked Isometric Cargo Boxes */}
        <polygon points="145,78 185,94 185,124 145,108" fill="#1D2B78" stroke="#A3B3D9" strokeWidth="1" />
        <polygon points="185,94 225,78 225,108 185,124" fill="#131B4B" stroke="#A3B3D9" strokeWidth="1" />
        <polygon points="145,78 185,62 225,78 185,94" fill="#25337A" stroke="#1CD4A3" strokeWidth="1" />
        <line x1="185" y1="62" x2="185" y2="124" stroke="#EE2A54" strokeWidth="3" />

        <polygon points="205,54 240,68 240,94 205,80" fill="#EE2A54" opacity="0.9" />
        <polygon points="240,68 275,54 275,80 240,94" fill="#B91C43" />
        <polygon points="205,54 240,40 275,54 240,68" fill="#FF5A7E" />

        {/* Price Tag Pill */}
        <g transform="translate(55, 28) rotate(-8)">
          <rect width="84" height="38" rx="10" fill="#1CD4A3" />
          <circle cx="14" cy="19" r="4" fill="#0A102E" />
          <text x="27" y="24" fill="#0A102E" fontSize="14" fontWeight="900" fontFamily="sans-serif">₹ INR</text>
        </g>

        {/* Match Badge */}
        <g transform="translate(268, 22)">
          <rect width="74" height="28" rx="14" fill="#0E153A" stroke="#1CD4A3" strokeWidth="1.5" />
          <circle cx="16" cy="14" r="6" fill="#1CD4A3" />
          <path d="M13 14L15 16L19 12" stroke="#0E153A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="28" y="18" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="sans-serif">ZOPA</text>
        </g>
      </svg>
    </div>
  );
}

export function JobOfferBanner({ className = 'w-full h-32' }) {
  return (
    <div className={`liquid-glass relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#0A102E] via-[#131B4B] to-[#27174A] flex items-center justify-center ${className}`}>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#EE2A54]/30 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#1CD4A3]/20 rounded-full blur-2xl" />

      <svg viewBox="0 0 380 140" className="relative z-10 w-full h-full max-w-xs drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Developer Screen */}
        <rect x="130" y="34" width="116" height="72" rx="8" fill="#0E153A" stroke="#1CD4A3" strokeWidth="1.5" />
        <line x1="144" y1="52" x2="188" y2="52" stroke="#EE2A54" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="194" y1="52" x2="228" y2="52" stroke="#1CD4A3" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="144" y1="66" x2="215" y2="66" stroke="#A3B3D9" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="144" y1="78" x2="195" y2="78" stroke="#1CD4A3" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="116,108 260,108 248,116 128,116" fill="#25337A" />

        {/* Offer Letter Card */}
        <g transform="translate(248, 22) rotate(7)">
          <rect width="74" height="92" rx="8" fill="#FFFFFF" />
          <circle cx="20" cy="20" r="8" fill="#1CD4A3" />
          <path d="M16 20L19 23L24 17" stroke="#0E153A" strokeWidth="2" strokeLinecap="round" />
          <rect x="12" y="38" width="50" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="12" y="50" width="40" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="12" y="65" width="50" height="18" rx="6" fill="#EE2A54" />
          <text x="19" y="77" fill="#FFFFFF" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">15 LPA</text>
        </g>

        {/* Hybrid Work Badge */}
        <g transform="translate(52, 36) rotate(-7)">
          <rect width="68" height="68" rx="10" fill="#131B4B" stroke="#EE2A54" strokeWidth="1.5" />
          <rect width="68" height="20" rx="8" fill="#EE2A54" />
          <text x="12" y="13.5" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">HYBRID</text>
          <text x="19" y="48" fill="#1CD4A3" fontSize="20" fontWeight="900" fontFamily="sans-serif">2–3</text>
          <text x="14" y="60" fill="#A3B3D9" fontSize="8" fontWeight="700" fontFamily="sans-serif">DAYS/WK</text>
        </g>
      </svg>
    </div>
  );
}

export function BudgetBanner({ className = 'w-full h-32' }) {
  return (
    <div className={`liquid-glass relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#0A102E] via-[#131B4B] to-[#0D383D] flex items-center justify-center ${className}`}>
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#1CD4A3]/25 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-[#EE2A54]/20 rounded-full blur-2xl" />

      <svg viewBox="0 0 380 140" className="relative z-10 w-full h-full max-w-xs drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Bar Chart & Sprint Allocation */}
        <rect x="85" y="72" width="26" height="44" rx="6" fill="#25337A" stroke="#A3B3D9" strokeWidth="1" />
        <rect x="123" y="52" width="26" height="64" rx="6" fill="#1CD4A3" />
        <rect x="161" y="34" width="26" height="82" rx="6" fill="#EE2A54" />
        <rect x="199" y="58" width="26" height="58" rx="6" fill="#1D2B78" stroke="#1CD4A3" strokeWidth="1.2" />

        {/* Trend Curve */}
        <path d="M98 62 L136 42 L174 26 L212 48" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="174" cy="26" r="4.5" fill="#1CD4A3" />

        {/* Capital Pool Coin */}
        <g transform="translate(260, 36)">
          <circle cx="34" cy="34" r="30" fill="#131B4B" stroke="#1CD4A3" strokeWidth="2" />
          <text x="15" y="32" fill="#FFFFFF" fontSize="13" fontWeight="900" fontFamily="sans-serif">₹100L</text>
          <text x="22" y="47" fill="#EE2A54" fontSize="10" fontWeight="900" fontFamily="sans-serif">CAP</text>
        </g>
      </svg>
    </div>
  );
}
