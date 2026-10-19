import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage({ onLogin }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');

  const handleGoogleLogin = () => {
    onLogin({
      name: 'Google User',
      email: 'user@gmail.com',
      role: 'AI Researcher',
      type: 'google',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    });
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const displayName = name.trim() || (role === 'student' ? 'Alex Chen' : 'Dev Architect');
    onLogin({
      name: displayName,
      role: role === 'student' ? 'Student' : 'AI Systems Architect',
      type: role,
    });
  };

  const handleQuickLogin = (selectedRole) => {
    onLogin({
      name: selectedRole === 'student' ? 'Alex Chen' : 'Dev Architect',
      role: selectedRole === 'student' ? 'Student' : 'AI Systems Architect',
      type: selectedRole,
    });
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden ${
        isDark ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Ambient Radial Glows (Subtle, professional) ── */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-blue-600/[0.07]' : 'bg-blue-500/[0.08]'
        }`}
      />

      {/* ── Top Bar: Brand Pill & Theme Switcher ── */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
            ⚖️
          </div>
          <span className="font-extrabold text-base tracking-tight">
            Negotiation<span className="text-blue-500">AI</span>
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle Bright/Dark Mode"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
            isDark
              ? 'bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>{isDark ? '☀️ Bright Mode' : '🌙 Dark Mode'}</span>
        </button>
      </header>

      {/* ── Main Auth Card ── */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div
          className={`rounded-2xl border p-7 sm:p-9 shadow-2xl transition-all duration-300 ${
            isDark
              ? 'bg-[#0f1420] border-slate-800/80 shadow-black/60'
              : 'bg-white border-slate-200/90 shadow-slate-200/70'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3 bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Task 1 · Multi-Agent Sandbox
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1.5">
              Welcome to the Arena
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Configure autonomous agents & simulate strategic negotiation.
            </p>
          </div>

          {/* ── 1. REALISTIC "CONTINUE WITH GOOGLE" BUTTON ── */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md mb-5 ${
              isDark
                ? 'bg-white text-slate-900 border-white hover:bg-slate-100'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            {/* Official Google 'G' SVG Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* ── Clean Divider ── */}
          <div className="relative flex items-center justify-center mb-5">
            <div
              className={`w-full border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            />
            <span
              className={`absolute px-3 text-[11px] font-medium uppercase tracking-wider ${
                isDark
                  ? 'bg-[#0f1420] text-slate-500'
                  : 'bg-white text-slate-400'
              }`}
            >
              or select role
            </span>
          </div>

          {/* ── Role Selector ── */}
          <div
            className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl mb-4 border ${
              isDark
                ? 'bg-slate-950/70 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'student'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎓</span>
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('developer')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'developer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💻</span>
              <span>Developer</span>
            </button>
          </div>

          {/* ── Form Input ── */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder={role === 'student' ? 'e.g. Alex Chen' : 'e.g. Dev Architect'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all border ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-600/25 cursor-pointer"
            >
              Enter Simulator →
            </button>
          </form>

          {/* ── Quick 1-Click Persona Access ── */}
          <div
            className={`mt-6 pt-5 border-t text-center ${
              isDark ? 'border-slate-800/80' : 'border-slate-100'
            }`}
          >
            <span
              className={`block text-[11px] font-semibold mb-2.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Quick Instant Demo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                Alex (Student)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('developer')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                Lead Architect
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full max-w-5xl mx-auto text-center z-10 py-3">
        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Multi-Agent Negotiation Simulator · Task 1 Module · Python & React Architecture
        </p>
      </footer>
    </div>
  );
}