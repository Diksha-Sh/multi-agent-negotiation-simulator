
/**
 * Illustrated Agent Character Portraits for the Negotiation Simulator.
 * Provides real character artwork with distinctive accessories and expressions.
 */

export function AgentAvatar({ role = 'buyer', size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const dim = sizeMap[size] || sizeMap.md;
  const roleKey = String(role).toLowerCase();

  if (roleKey.includes('buyer') || roleKey.includes('procurement')) {
    // Procurement Buyer: Blue suit, smart glasses, calculating expression
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25 shrink-0 ${dim} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#0f172a" />
            {/* Background glow */}
            <circle cx="40" cy="30" r="22" fill="#3b82f6" opacity="0.25" />
            {/* Suit & tie */}
            <path d="M20 75 C20 58 30 52 40 52 C50 52 60 58 60 75 Z" fill="#1e293b" />
            <path d="M33 52 L40 68 L47 52 Z" fill="#ffffff" />
            <polygon points="40,55 43,67 40,74 37,67" fill="#3b82f6" />
            {/* Face */}
            <circle cx="40" cy="35" r="15" fill="#fcd34d" />
            {/* Hair */}
            <path d="M25 32 C25 22 32 18 40 18 C48 18 55 22 55 32 C50 24 30 24 25 32 Z" fill="#334155" />
            {/* Smart Glasses */}
            <rect x="29" y="32" width="9" height="7" rx="2" stroke="#0f172a" strokeWidth="2" fill="#93c5fd" fillOpacity="0.4" />
            <rect x="42" y="32" width="9" height="7" rx="2" stroke="#0f172a" strokeWidth="2" fill="#93c5fd" fillOpacity="0.4" />
            <line x1="38" y1="35" x2="42" y2="35" stroke="#0f172a" strokeWidth="2" />
            {/* Confident Smile */}
            <path d="M36 43 Q40 46 44 43" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  if (roleKey.includes('vendor') || roleKey.includes('sales')) {
    // Sales Vendor: Amber/Gold theme, sales headset, welcoming smile
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-500 p-0.5 shadow-lg shadow-orange-500/25 shrink-0 ${dim} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#0f172a" />
            <circle cx="40" cy="30" r="22" fill="#f59e0b" opacity="0.25" />
            {/* Blazer */}
            <path d="M18 75 C18 58 28 50 40 50 C52 50 62 58 62 75 Z" fill="#78350f" />
            <path d="M30 50 L40 68 L50 50 Z" fill="#ffffff" />
            <polygon points="40,54 44,66 40,73 36,66" fill="#f59e0b" />
            {/* Face */}
            <circle cx="40" cy="34" r="15" fill="#fed7aa" />
            {/* Hair */}
            <path d="M26 30 C26 20 34 16 40 16 C48 16 54 20 54 30 C50 22 30 22 26 30 Z" fill="#451a03" />
            {/* Eyes */}
            <circle cx="34" cy="33" r="2" fill="#451a03" />
            <circle cx="46" cy="33" r="2" fill="#451a03" />
            {/* Friendly Sales Smile */}
            <path d="M35 41 Q40 47 45 41" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
            {/* Call Center / Sales Headset */}
            <path d="M24 34 C24 22 30 18 40 18 C50 18 56 22 56 34" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
            <rect x="22" y="32" width="4" height="8" rx="2" fill="#64748b" />
            <rect x="54" y="32" width="4" height="8" rx="2" fill="#64748b" />
            <path d="M54 36 L48 44" stroke="#64748b" strokeWidth="1.8" />
            <circle cx="47" cy="45" r="2" fill="#ef4444" />
          </svg>
        </div>
      </div>
    );
  }

  if (roleKey.includes('candidate') || roleKey.includes('developer')) {
    // Dev Candidate: Purple/Cyan theme, tech hoodie, modern glasses
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/25 shrink-0 ${dim} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#0f172a" />
            <circle cx="40" cy="30" r="22" fill="#a855f7" opacity="0.25" />
            {/* Tech Hoodie */}
            <path d="M18 75 C18 56 28 50 40 50 C52 50 62 56 62 75 Z" fill="#3b0764" />
            <path d="M32 50 C32 60 48 60 48 50 Z" fill="#581c87" />
            <line x1="36" y1="58" x2="36" y2="68" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="44" y1="58" x2="44" y2="68" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
            {/* Face */}
            <circle cx="40" cy="34" r="15" fill="#fde68a" />
            {/* Hair with stylish bangs */}
            <path d="M24 30 C24 18 32 15 40 15 C49 15 56 18 56 30 C56 36 54 40 52 42 C50 30 30 30 28 42 Z" fill="#18181b" />
            {/* Cyber Glasses */}
            <rect x="29" y="31" width="9" height="7" rx="2" stroke="#a855f7" strokeWidth="1.8" fill="#06b6d4" fillOpacity="0.4" />
            <rect x="42" y="31" width="9" height="7" rx="2" stroke="#a855f7" strokeWidth="1.8" fill="#06b6d4" fillOpacity="0.4" />
            <line x1="38" y1="34" x2="42" y2="34" stroke="#a855f7" strokeWidth="1.8" />
            {/* Confident smirk */}
            <path d="M36 43 Q41 46 45 42" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  if (roleKey.includes('hiring') || roleKey.includes('employer')) {
    // Hiring Manager: Emerald/Cyan theme, professional executive look
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-600 to-indigo-600 p-0.5 shadow-lg shadow-teal-500/25 shrink-0 ${dim} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#0f172a" />
            <circle cx="40" cy="30" r="22" fill="#0d9488" opacity="0.25" />
            {/* Executive Blazer */}
            <path d="M18 75 C18 56 28 50 40 50 C52 50 62 56 62 75 Z" fill="#042f2e" />
            <path d="M31 50 L40 68 L49 50 Z" fill="#ffffff" />
            <polygon points="40,54 44,66 40,73 36,66" fill="#0d9488" />
            {/* Face */}
            <circle cx="40" cy="34" r="15" fill="#fed7aa" />
            {/* Hair */}
            <path d="M26 30 C26 20 32 16 40 16 C48 16 54 20 54 30 C50 22 30 22 26 30 Z" fill="#334155" />
            {/* Eyes */}
            <circle cx="34" cy="33" r="2" fill="#0f172a" />
            <circle cx="46" cy="33" r="2" fill="#0f172a" />
            {/* Discerning smile */}
            <path d="M36 41 Q40 45 44 41" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  if (roleKey.includes('finance')) {
    // Finance Manager: Golden amber theme, ledger badge, sharp look
    return (
      <div className={`relative rounded-2xl bg-gradient-to-tr from-amber-400 via-emerald-600 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/25 shrink-0 ${dim} ${className}`}>
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#0f172a" />
            <circle cx="40" cy="30" r="22" fill="#10b981" opacity="0.25" />
            {/* Suit */}
            <path d="M18 75 C18 56 28 50 40 50 C52 50 62 56 62 75 Z" fill="#064e3b" />
            <path d="M31 50 L40 68 L49 50 Z" fill="#ffffff" />
            <polygon points="40,54 44,66 40,73 36,66" fill="#10b981" />
            {/* Gold Lapel Pin */}
            <circle cx="28" cy="60" r="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            {/* Face */}
            <circle cx="40" cy="34" r="15" fill="#fde68a" />
            {/* Hair */}
            <path d="M26 30 C26 20 34 16 40 16 C46 16 54 20 54 30 C50 22 30 22 26 30 Z" fill="#1e293b" />
            {/* Gold Wire Glasses */}
            <circle cx="34" cy="33" r="5" stroke="#d97706" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.2" />
            <circle cx="46" cy="33" r="5" stroke="#d97706" strokeWidth="1.5" fill="#ffffff" fillOpacity="0.2" />
            <line x1="39" y1="33" x2="41" y2="33" stroke="#d97706" strokeWidth="1.5" />
            {/* Calculating smirk */}
            <path d="M37 42 Q40 45 43 42" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  // Default: Project Manager / General Leader
  return (
    <div className={`relative rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-600 to-pink-500 p-0.5 shadow-lg shadow-violet-500/25 shrink-0 ${dim} ${className}`}>
      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="38" fill="#0f172a" />
          <circle cx="40" cy="30" r="22" fill="#8b5cf6" opacity="0.25" />
          {/* Agile Jacket */}
          <path d="M18 75 C18 56 28 50 40 50 C52 50 62 56 62 75 Z" fill="#2e1065" />
          <path d="M32 50 L40 64 L48 50 Z" fill="#38bdf8" />
          {/* Face */}
          <circle cx="40" cy="34" r="15" fill="#fed7aa" />
          {/* Hair */}
          <path d="M26 28 C26 18 34 15 40 15 C48 15 54 18 54 28 C48 20 30 20 26 28 Z" fill="#312e81" />
          {/* Eyes */}
          <circle cx="34" cy="33" r="2" fill="#0f172a" />
          <circle cx="46" cy="33" r="2" fill="#0f172a" />
          {/* Enthusiastic Smile */}
          <path d="M35 41 Q40 47 45 41" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

