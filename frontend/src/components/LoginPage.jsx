import { useState } from 'react';
import {
  Sun,
  Moon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  ChevronDown,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Home,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from './BrandLogo';

export default function LoginPage({ onLogin, onGoHome }) {
  const { isDark, toggleTheme } = useTheme();

  // Authentication mode: 'email' or 'phone'
  const [authMode, setAuthMode] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginWithOtp, setLoginWithOtp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  // Send / Resend OTP handler
  const handleSendOtp = () => {
    if (!identifier.trim()) {
      setError(
        authMode === 'email'
          ? 'Please enter your email or username before requesting an OTP.'
          : 'Please enter your mobile phone number before requesting an OTP.'
      );
      return;
    }
    setError('');
    setOtpSentMessage('A 6-digit verification code has been dispatched.');
    setOtp('584920'); // Autofill sample test OTP for frictionless experience
    setTimeout(() => setOtpSentMessage(''), 5000);
  };

  // Main login submission with strict validation
  const handleSubmit = (e) => {
    e?.preventDefault();
    setError('');

    const cleanIdentifier = identifier.trim();

    // 1. Validate Identifier (Email or Phone)
    if (!cleanIdentifier) {
      setError(
        authMode === 'email'
          ? 'Please enter your email address or registered username.'
          : 'Please enter your 10-digit mobile phone number.'
      );
      return;
    }

    if (authMode === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanIdentifier) && cleanIdentifier.length < 3) {
        setError('Please provide a valid email address (e.g. user@organization.com).');
        return;
      }
    } else {
      const digitsOnly = cleanIdentifier.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    // 2. Validate Password or OTP
    if (loginWithOtp) {
      if (!otp.trim() || otp.trim().length < 4) {
        setError('Please enter the verification OTP sent to your contact.');
        return;
      }
    } else {
      if (!password || password.length < 6) {
        setError('Password must contain at least 6 characters.');
        return;
      }
    }

    // Credentials valid -> create authenticated session
    const username = cleanIdentifier.includes('@')
      ? cleanIdentifier.split('@')[0]
      : `User ${cleanIdentifier.slice(-4)}`;

    const userPayload = {
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email: cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@mobile.domain`,
      role: 'Simulation Architect',
      type: 'authenticated',
      rememberMe,
    };

    onLogin(userPayload);
  };

  // Google SSO Handler
  const handleGoogleLogin = () => {
    onLogin({
      name: 'Google Enterprise User',
      email: 'enterprise.user@gmail.com',
      role: 'Enterprise Architect',
      type: 'google',
    });
  };

  // Partner Portal Handler
  const handlePartnerLogin = (partnerName) => {
    setShowPartnerDropdown(false);
    onLogin({
      name: `${partnerName} Operator`,
      email: `operator@${partnerName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      role: `${partnerName} Verified`,
      type: 'partner',
    });
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200 relative overflow-hidden font-sans ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Ambient Radial Glows ── */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[380px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent' : 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent'
        }`}
      />

      {/* ── Top Bar: Theme Switcher & Home Navigation ── */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group bg-transparent border-0 p-0 text-left outline-none"
          title="Return to Home Page"
        >
          <BrandLogo className="w-8 h-8" />
          <span className="font-extrabold text-base tracking-tight group-hover:text-indigo-400 transition-colors">
            Negotiation<span className="text-indigo-500">AI</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          )}

          {/* Global Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Bright/Dark Mode"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              isDark
                ? 'bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Auth Card (Infosys Springboard Authentic Layout) ── */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div
          className={`rounded-2xl border p-7 sm:p-9 transition-all duration-200 ${
            isDark
              ? 'bg-slate-900/70 backdrop-blur-xl border-slate-800/80 shadow-2xl shadow-black/60'
              : 'bg-white/95 backdrop-blur-xl border-slate-200 shadow-xl shadow-slate-200/50'
          }`}
        >
          {/* 1. Header with App Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <BrandLogo className="w-12 h-12" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-1">
              Sign in to your account
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Access the Autonomous Multi-Agent Negotiation Simulator
            </p>
          </div>

          {/* 2. Email / Phone Toggle Switch */}
          <div
            className={`grid grid-cols-2 p-1 rounded-xl mb-5 border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'email'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email / Username</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'phone'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Phone Number</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Dispatched Banner */}
          {otpSentMessage && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{otpSentMessage}</span>
            </div>
          )}

          {/* 3. Form Input Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Field (Email or Phone) */}
            {authMode === 'email' ? (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError('');
                    }}
                    placeholder="name@organization.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mobile Phone Number
                </label>
                <div className="flex gap-2">
                  <div
                    className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border flex items-center gap-1 shrink-0 ${
                      isDark ? 'bg-slate-950/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>+91</span>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border ${
                        isDark
                          ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password vs OTP Mode Input */}
            {loginWithOtp ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    One-Time Password (OTP)
                  </label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {otpSentMessage ? 'Resend OTP' : 'Send OTP'}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    placeholder="Enter 6-digit OTP"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border font-mono tracking-widest ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your account password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Checkbox: Log in with OTP Option */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="loginWithOtp"
                checked={loginWithOtp}
                onChange={(e) => {
                  setLoginWithOtp(e.target.checked);
                  setError('');
                }}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label
                htmlFor="loginWithOtp"
                className={`text-xs font-medium cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                Log in with OTP instead of password
              </label>
            </div>

            {/* 4. Action Row: Forgot Password (Left) & Remember Me (Right) */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => alert('Password reset verification link has been sent to your registered address.')}
                className="text-indigo-500 hover:text-indigo-400 font-semibold cursor-pointer"
              >
                Forgot Password?
              </button>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Remember me</span>
              </label>
            </div>

            {/* 5. Main Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Log In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 6. Divider & OAuth */}
          <div className="relative flex items-center justify-center my-5">
            <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
            <span
              className={`absolute px-3 text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
              }`}
            >
              OR
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-200 cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
            >
              {/* Official Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

            {/* Login with Partner Portal Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPartnerDropdown(!showPartnerDropdown)}
                className={`w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-200 cursor-pointer shadow-sm ${
                  isDark
                    ? 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Login with Partner Portal</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showPartnerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showPartnerDropdown && (
                <div
                  className={`absolute left-0 right-0 mt-1.5 rounded-xl border p-1.5 shadow-xl z-20 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handlePartnerLogin('Infosys Springboard')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                      isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>Infosys Springboard Portal</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Academic SSO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePartnerLogin('Enterprise Okta')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                      isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>Enterprise SSO (SAML / Okta)</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Corp ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePartnerLogin('Azure Active Directory')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                      isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>Microsoft Azure AD</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Cloud Dir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 7. Footer Links */}
          <div
            className={`mt-6 pt-5 border-t text-center text-xs flex items-center justify-center gap-3 ${
              isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            <button
              type="button"
              onClick={() => alert('Password generation link dispatched to your registered enterprise ID.')}
              className="font-semibold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Generate your password
            </button>
            <span className="text-slate-500">·</span>
            <button
              type="button"
              onClick={() => alert('New user registration is available through enterprise admin authorization.')}
              className="font-semibold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              New user? Register
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full max-w-5xl mx-auto text-center z-10 py-3">
        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          Autonomous Multi-Agent Negotiation Simulator · Enterprise Authentication Gateway
        </p>
      </footer>
    </div>
  );
}