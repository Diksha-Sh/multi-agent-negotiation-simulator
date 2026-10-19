
/**
 * High-quality vector illustration banners for the 3 negotiation scenarios.
 * Gives each scenario card a rich "block image" header, like a featured video game or top-tier SaaS card.
 */

export function VendorBanner({ className = 'w-full h-44' }) {
  return (
    <div className={`relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 flex items-center justify-center ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/25 via-blue-500/10 to-transparent" />
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl" />

      {/* Grid overlay pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="vendor-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-400" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vendor-grid)" />
      </svg>

      {/* Main Illustration: Cargo, Packages, Price Tag & Handshake */}
      <svg viewBox="0 0 400 180" className="relative z-10 w-full h-full max-w-sm drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="boxGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="boxGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="tagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Isometric Shipping Pallet Base */}
        <polygon points="120,130 200,165 280,130 200,95" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <polygon points="120,130 120,140 200,175 200,165" fill="#0f172a" />
        <polygon points="200,165 200,175 280,140 280,130" fill="#1e293b" />

        {/* Cargo Box 1 (Left) */}
        <polygon points="140,95 180,112 180,145 140,128" fill="url(#boxGrad1)" />
        <polygon points="180,112 220,95 220,128 180,145" fill="url(#boxGrad2)" />
        <polygon points="140,95 180,78 220,95 180,112" fill="#93c5fd" opacity="0.8" />
        {/* Tape stripe */}
        <line x1="180" y1="78" x2="180" y2="145" stroke="#fbbf24" strokeWidth="3" opacity="0.8" />

        {/* Cargo Box 2 (Right/Stacked) */}
        <polygon points="210,80 250,97 250,130 210,113" fill="#3b82f6" />
        <polygon points="250,97 290,80 290,113 250,130" fill="#2563eb" />
        <polygon points="210,80 250,63 290,80 250,97" fill="#60a5fa" />
        <line x1="250" y1="63" x2="250" y2="130" stroke="#f59e0b" strokeWidth="2.5" opacity="0.8" />

        {/* Floating Discount / Price Tag */}
        <g transform="translate(70, 30) rotate(-12)">
          <rect width="85" height="42" rx="10" fill="url(#tagGrad)" filter="drop-shadow(0 8px 16px rgba(6,182,212,0.4))" />
          <circle cx="14" cy="21" r="5" fill="#0f172a" />
          <text x="32" y="27" fill="#ffffff" fontSize="16" fontWeight="bold" fontFamily="sans-serif">₹ INR</text>
        </g>

        {/* Floating Deal Coins */}
        <circle cx="310" cy="50" r="18" fill="url(#goldGrad)" filter="drop-shadow(0 6px 12px rgba(245,158,11,0.5))" />
        <circle cx="310" cy="50" r="13" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
        <text x="304" y="56" fill="#78350f" fontSize="16" fontWeight="900" fontFamily="sans-serif">₹</text>

        <circle cx="335" cy="85" r="14" fill="url(#goldGrad)" filter="drop-shadow(0 4px 10px rgba(245,158,11,0.4))" />
        <text x="330" y="90" fill="#78350f" fontSize="13" fontWeight="900" fontFamily="sans-serif">₹</text>

        {/* Animated Handshake Sparkle */}
        <polygon points="200,45 204,55 214,58 204,61 200,71 196,61 186,58 196,55" fill="#67e8f9" filter="drop-shadow(0 0 8px #67e8f9)" />
      </svg>

      {/* Bottom gradient fade into card body */}
      <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-900 to-transparent" />
    </div>
  );
}

export function JobOfferBanner({ className = 'w-full h-44' }) {
  return (
    <div className={`relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-violet-950 via-slate-900 to-fuchsia-950 flex items-center justify-center ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-500/25 via-purple-500/10 to-transparent" />
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl" />

      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="job-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-fuchsia-400" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#job-grid)" />
      </svg>

      {/* Main Illustration: Developer Laptop, Signed Offer Contract & Remote Calendar */}
      <svg viewBox="0 0 400 180" className="relative z-10 w-full h-full max-w-sm drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="laptopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdf4ff" />
            <stop offset="100%" stopColor="#fae8ff" />
          </linearGradient>
        </defs>

        {/* Sleek Laptop (Center) */}
        <rect x="135" y="65" width="130" height="80" rx="8" fill="url(#laptopGrad)" stroke="#6366f1" strokeWidth="1.5" />
        <rect x="143" y="73" width="114" height="64" rx="4" fill="#090d16" />
        {/* Code lines on screen */}
        <line x1="152" y1="84" x2="190" y2="84" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
        <line x1="195" y1="84" x2="230" y2="84" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
        <line x1="160" y1="94" x2="220" y2="94" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="160" y1="104" x2="205" y2="104" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="152" y1="116" x2="185" y2="116" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
        <line x1="190" y1="116" x2="235" y2="116" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        {/* Laptop base */}
        <polygon points="120,147 280,147 265,153 135,153" fill="#475569" stroke="#64748b" strokeWidth="1" />
        <rect x="180" y="147" width="40" height="3" rx="1.5" fill="#94a3b8" />

        {/* Offer Letter Contract (Right) */}
        <g transform="translate(260, 35) rotate(10)">
          <rect width="80" height="110" rx="8" fill="url(#docGrad)" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.5))" />
          {/* Header stamp */}
          <circle cx="24" cy="22" r="10" fill="#a855f7" opacity="0.2" />
          <path d="M19 22L23 26L29 18" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
          <rect x="40" y="18" width="28" height="6" rx="3" fill="#cbd5e1" />
          <line x1="16" y1="44" x2="64" y2="44" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="16" y1="56" x2="55" y2="56" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="16" y1="68" x2="60" y2="68" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          {/* Compensation Badge Pill */}
          <rect x="14" y="80" width="52" height="18" rx="6" fill="#10b981" />
          <text x="20" y="93" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">15 LPA</text>
        </g>

        {/* Remote Work Calendar Badge (Left) */}
        <g transform="translate(60, 45) rotate(-8)">
          <rect width="70" height="75" rx="10" fill="#0f172a" stroke="#ec4899" strokeWidth="1.5" filter="drop-shadow(0 8px 16px rgba(236,72,153,0.3))" />
          <rect width="70" height="22" rx="8" fill="#ec4899" />
          <text x="14" y="15" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">REMOTE</text>
          <text x="22" y="54" fill="#f43f5e" fontSize="24" fontWeight="black" fontFamily="sans-serif">2-3</text>
          <text x="16" y="67" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="sans-serif">DAYS/WK</text>
        </g>
      </svg>

      {/* Bottom gradient fade into card body */}
      <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-900 to-transparent" />
    </div>
  );
}

export function BudgetBanner({ className = 'w-full h-44' }) {
  return (
    <div className={`relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 flex items-center justify-center ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/25 via-teal-500/10 to-transparent" />
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-teal-500/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl" />

      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="budget-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-400" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#budget-grid)" />
      </svg>

      {/* Main Illustration: Growth Analytics Dashboard, 3D Golden Vault & Allocation Bars */}
      <svg viewBox="0 0 400 180" className="relative z-10 w-full h-full max-w-sm drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="barGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="barGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="barGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="pieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* Executive Budget Dashboard Monitor */}
        <rect x="110" y="35" width="180" height="110" rx="12" fill="#0f172a" stroke="#14b8a6" strokeWidth="1.5" filter="drop-shadow(0 12px 24px rgba(0,0,0,0.6))" />
        <rect x="118" y="43" width="164" height="94" rx="8" fill="#090d16" />

        {/* Dashboard Analytics Header */}
        <circle cx="132" cy="55" r="4" fill="#f43f5e" />
        <circle cx="144" cy="55" r="4" fill="#fbbf24" />
        <circle cx="156" cy="55" r="4" fill="#10b981" />
        <rect x="175" y="52" width="60" height="6" rx="3" fill="#334155" />

        {/* 3D Growth Bars */}
        <rect x="135" y="95" width="22" height="32" rx="4" fill="url(#barGrad1)" />
        <rect x="165" y="80" width="22" height="47" rx="4" fill="url(#barGrad2)" />
        <rect x="195" y="68" width="22" height="59" rx="4" fill="url(#barGrad3)" />

        {/* Upward Trend Line */}
        <path d="M145 92 L 175 76 L 205 64 L 245 48" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="245" cy="48" r="4" fill="#ffffff" stroke="#059669" strokeWidth="2" />

        {/* Floating 100 Lakh Cap Badge (Right) */}
        <g transform="translate(270, 75) rotate(6)">
          <rect width="80" height="55" rx="12" fill="#022c22" stroke="#10b981" strokeWidth="2" filter="drop-shadow(0 6px 14px rgba(16,185,129,0.4))" />
          <text x="14" y="24" fill="#6ee7b7" fontSize="10" fontWeight="bold" fontFamily="sans-serif">MAX CAP</text>
          <text x="12" y="44" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="sans-serif">₹100L</text>
        </g>

        {/* Coin Stack (Left) */}
        <g transform="translate(45, 90)">
          <ellipse cx="30" cy="40" rx="22" ry="7" fill="#d97706" />
          <rect x="8" y="32" width="44" height="8" fill="#f59e0b" />
          <ellipse cx="30" cy="32" rx="22" ry="7" fill="#fbbf24" />

          <rect x="8" y="24" width="44" height="8" fill="#f59e0b" />
          <ellipse cx="30" cy="24" rx="22" ry="7" fill="#fbbf24" />

          <rect x="8" y="16" width="44" height="8" fill="#f59e0b" />
          <ellipse cx="30" cy="16" rx="22" ry="7" fill="#fde68a" />
          <text x="24" y="20" fill="#78350f" fontSize="12" fontWeight="900" fontFamily="sans-serif">₹</text>
        </g>
      </svg>

      {/* Bottom gradient fade into card body */}
      <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-900 to-transparent" />
    </div>
  );
}

