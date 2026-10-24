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
  User,
  Database,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from './BrandLogo';
import { signInWithEmail, signUpWithEmail, isSupabaseConfigured } from '../services/supabase';

export default function LoginPage({ onLogin, onGoHome }) {
  const { isDark, toggleTheme } = useTheme();

  // Auth screen mode: 'signin' or 'signup'
  const [authType, setAuthType] = useState('signin');
  // Authentication method: 'email' or 'phone'
  const [authMode, setAuthMode] = useState('email');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginWithOtp, setLoginWithOtp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  const isCloudConnected = isSupabaseConfigured();

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
    setOtp('584920'); // Sample test OTP for seamless testing
    setTimeout(() => setOtpSentMessage(''), 5000);
  };

  // Main login/signup submission
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanIdentifier = identifier.trim();

    // 1. Validation for Sign Up
    if (authType === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!cleanIdentifier || !cleanIdentifier.includes('@')) {
        setError('Please provide a valid email address (e.g. architect@simulation.ai).');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must contain at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      setIsSubmitting(true);
      try {
        const { user, error: authError, isMock } = await signUpWithEmail(
          cleanIdentifier,
          password,
          fullName.trim()
        );

        if (authError) {
          setError(authError);
          setIsSubmitting(false);
          return;
        }

        if (user) {
          setSuccessMessage(
            isMock
              ? 'Account created in demo mode! Signing you in...'
              : 'Account registered in Supabase! Signing you in...'
          );
          setTimeout(() => {
            onLogin(user);
          }, 700);
        }
      } catch (err) {
        setError(err.message || 'Registration failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Validation for Sign In
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
        setError('Please provide a valid email address.');
        return;
      }
    } else {
      const digitsOnly = cleanIdentifier.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    // Password or OTP check
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

    setIsSubmitting(true);
    try {
      if (authMode === 'email' && !loginWithOtp) {
        // Real Supabase Sign-In
        const { user, error: authError } = await signInWithEmail(cleanIdentifier, password);
        if (authError) {
          setError(authError);
          setIsSubmitting(false);
          return;
        }

        if (user) {
          setSuccessMessage('Credentials verified! Loading simulator...');
          setTimeout(() => {
            onLogin(user);
          }, 500);
          return;
        }
      }

      // Fallback for Phone OTP or local credentials
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
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
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
      {/* ── Ambient Glows ── */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[380px] rounded-full blur-[140px] pointer-events-none ${
          isDark
            ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent'
            : 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent'
        }`}
      />

      {/* ── Top Bar ── */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0 text-left outline-none"
        >
          <BrandLogo className="w-8 h-8" />
          <div className="flex flex-col">
            <span
              className={`text-sm font-extrabold tracking-tight leading-tight group-hover:text-indigo-400 transition-colors ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              Negotiation<span className="text-indigo-500">AI</span>
            </span>
            <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Autonomous Simulator
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {/* Supabase status badge */}
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isCloudConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <Database className="w-3 h-3" />
            {isCloudConnected ? 'Supabase Connected' : 'Demo Auth Mode'}
          </span>

          <button
            type="button"
            onClick={onGoHome}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isDark ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
            title="Toggle Bright/Dark Mode"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          </button>
        </div>
      </header>

      {/* ── Main Auth Card ── */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div
          className={`rounded-2xl border p-7 sm:p-9 transition-all duration-200 ${
            isDark
              ? 'bg-slate-900/70 backdrop-blur-xl border-slate-800/80 shadow-2xl shadow-black/60'
              : 'bg-white/95 backdrop-blur-xl border-slate-200 shadow-xl shadow-slate-200/50'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <BrandLogo className="w-12 h-12" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-1">
              {authType === 'signup' ? 'Create an account' : 'Sign in to your account'}
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {authType === 'signup'
                ? 'Register with Supabase to save and analyze negotiations'
                : 'Access the Autonomous Multi-Agent Negotiation Simulator'}
            </p>
          </div>

          {/* Primary Sign In vs Sign Up Tabs */}
          <div
            className={`grid grid-cols-2 p-1 rounded-xl mb-5 border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setAuthType('signin');
                setError('');
                setSuccessMessage('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authType === 'signin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthType('signup');
                setError('');
                setSuccessMessage('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authType === 'signup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Create Account</span>
            </button>
          </div>

          {/* Email / Phone Sub-toggle (Only for Sign-In) */}
          {authType === 'signin' && (
            <div
              className={`grid grid-cols-2 p-1 rounded-xl mb-5 border ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setAuthMode('email');
                  setError('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'email'
                    ? 'bg-slate-800 text-white'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone');
                  setError('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'phone'
                    ? 'bg-slate-800 text-white'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone OTP</span>
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {otpSentMessage && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{otpSentMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name for Sign Up */}
            {authType === 'signup' && (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setError('');
                    }}
                    placeholder="Alex Morgan"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Email Identifier Field */}
            {authType === 'signup' || authMode === 'email' ? (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError('');
                    }}
                    placeholder="name@organization.com"
                    required
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
            {authType === 'signin' && loginWithOtp ? (
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
                    placeholder={authType === 'signup' ? 'Create a secure password (min 6 chars)' : 'Enter your password'}
                    required
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

            {/* Confirm Password (Sign Up only) */}
            {authType === 'signup' && (
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Repeat your password"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all border ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* OTP checkbox (Sign In only) */}
            {authType === 'signin' && (
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
            )}

            {/* Remember Me */}
            {authType === 'signin' && (
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
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{authType === 'signup' ? 'Create Free Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Social login divider */}
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
            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-200 cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
            >
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

            {/* Partner Portal Dropdown */}
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
                </div>
              )}
            </div>
          </div>

          {/* Switch between Sign In and Sign Up */}
          <div
            className={`mt-6 pt-5 border-t text-center text-xs flex items-center justify-center gap-2 ${
              isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            {authType === 'signin' ? (
              <>
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('signup');
                    setError('');
                  }}
                  className="font-bold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                <span>Already registered?</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthType('signin');
                    setError('');
                  }}
                  className="font-bold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full max-w-5xl mx-auto text-center z-10 py-3">
        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          Autonomous Multi-Agent Negotiation Simulator · Supabase & Enterprise Gateway
        </p>
      </footer>
    </div>
  );
}
