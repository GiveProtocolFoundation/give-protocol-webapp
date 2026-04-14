import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, Building2, Wallet, Mail, Lock, User } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { validateEmail, validatePassword } from '@/utils/validation';
import { Logger } from '@/utils/logger';

/** Radial gradient atmosphere for dark panels */
const ATMOSPHERE_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(ellipse 80% 60% at 10% 100%, rgba(16,185,129,0.18) 0%, transparent 60%), ' +
    'radial-gradient(ellipse 50% 50% at 90% 10%, rgba(52,211,153,0.1) 0%, transparent 55%)',
};

/** 48px emerald-tinted grid overlay for dark panels */
const GRID_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(52,211,153,0.04) 1px, transparent 1px), ' +
    'linear-gradient(90deg, rgba(52,211,153,0.04) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
};

/** Protocol status banner with pulse indicator. */
const ProtocolStatusBanner: React.FC = () => (
  <div
    className="relative flex items-center gap-4 overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, padding: '1rem 1.25rem', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
  >
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.06) 0%, transparent 70%)' }} />
    <div className="relative shrink-0" style={{ width: 10, height: 10 }}>
      <div className="rounded-full relative z-10" style={{ width: 10, height: 10, background: 'var(--emerald-400)', boxShadow: '0 0 8px var(--emerald-400)' }} />
      <span className="absolute rounded-full animate-ripple" style={{ inset: -5, border: '1.5px solid var(--emerald-400)' }} />
      <span className="absolute rounded-full animate-ripple" style={{ inset: -5, border: '1.5px solid var(--emerald-400)', animationDelay: '0.8s' }} />
    </div>
    <div className="shrink-0" style={{ width: 1, height: 32, background: 'rgba(52,211,153,0.2)' }} />
    <div className="relative z-10">
      <p style={{ fontSize: '0.67rem', fontWeight: 600, color: 'var(--emerald-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
        Protocol Status &middot; Genesis Phase
      </p>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
        Building the <strong className="text-white font-semibold">foundation of transparent giving</strong>
      </p>
    </div>
  </div>
);

/** "Runs on" trust tags row. */
const RunsOnTags: React.FC = () => (
  <div>
    <div className="flex items-center gap-2" style={{ marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, whiteSpace: 'nowrap' }}>
        Runs on
      </span>
      <div className="flex-1" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
    </div>
    <div className="flex flex-wrap" style={{ gap: '0.4rem' }}>
      {['Moonbeam', 'Base', 'Optimism', 'Open Source', '501(c)(3)'].map((tag) => (
        <span
          key={tag}
          style={{
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: '0.25rem 0.6rem',
            fontSize: '0.68rem',
            fontWeight: 500,
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  </div>
);

/** Dark left panel for the auth signup page. */
const SignupLeftPanel: React.FC = () => (
  <div
    className="hidden lg:flex relative flex-col justify-center overflow-hidden"
    style={{ backgroundColor: '#064e3b', padding: '3.5rem' }}
  >
    <div className="absolute inset-0 pointer-events-none" style={ATMOSPHERE_STYLE} />
    <div className="absolute inset-0 pointer-events-none" style={GRID_STYLE} />
    <div
      className="absolute rounded-full animate-orbDrift pointer-events-none"
      style={{ width: 200, height: 200, top: -60, right: -40, background: 'var(--emerald-400)', filter: 'blur(60px)', opacity: 0.25 }}
    />
    <div
      className="absolute rounded-full animate-orbDrift pointer-events-none"
      style={{ width: 160, height: 160, bottom: 80, left: -30, background: 'var(--emerald-600)', filter: 'blur(60px)', opacity: 0.25, animationDelay: '-3s' }}
    />
    <div className="relative z-10">
      <h2
        className="font-serif text-white animate-fadeUp"
        style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}
      >
        Join the future of<br /><span style={{ color: 'var(--emerald-300)' }} className="italic">transparent</span> giving.
      </h2>
      <p
        className="animate-fadeUp"
        style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 340, fontWeight: 300, animationDelay: '0.2s' }}
      >
        One account. Donate by card or crypto. Track every dollar on-chain.
      </p>
      <div className="space-y-4 animate-fadeUp" style={{ marginTop: '2.5rem', animationDelay: '0.8s' }}>
        <ProtocolStatusBanner />
        <RunsOnTags />
      </div>
    </div>
  </div>
);

/** Sign-up form fields extracted to reduce JSX nesting depth. */
const SignupFormFields: React.FC<{
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  onDisplayNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({
  displayName, email, password, confirmPassword, loading,
  onDisplayNameChange, onEmailChange, onPasswordChange, onConfirmPasswordChange, onSubmit,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <FormInput
      icon={<User className="h-4 w-4" />}
      type="text"
      value={displayName}
      onChange={onDisplayNameChange}
      placeholder="Display name (optional)"
      autoComplete="name"
    />
    <FormInput
      icon={<Mail className="h-4 w-4" />}
      type="email"
      value={email}
      onChange={onEmailChange}
      placeholder="Email"
      required
      autoComplete="email"
    />
    <FormInput
      icon={<Lock className="h-4 w-4" />}
      type="password"
      value={password}
      onChange={onPasswordChange}
      placeholder="Password"
      required
      autoComplete="new-password"
    />
    <PasswordStrengthBar password={password} />
    <FormInput
      icon={<Lock className="h-4 w-4" />}
      type="password"
      value={confirmPassword}
      onChange={onConfirmPasswordChange}
      placeholder="Confirm password"
      required
      autoComplete="new-password"
    />
    <Button
      type="submit"
      fullWidth
      size="lg"
      disabled={loading}
      className="font-semibold"
    >
      {loading ? 'Creating account\u2026' : 'Create Account'}
    </Button>
  </form>
);

/** Right panel content with sign-up form and wallet registration. */
const SignupRightPanel: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    isAuthenticated,
    role,
    loading,
    signUpWithEmail,
    signInWithWallet,
  } = useUnifiedAuth();

  // Trigger entrance animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const from = role === 'charity' ? '/charity-portal' :
    role === 'admin' ? '/admin' :
    '/give-dashboard';

  const handleEmailSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setFormError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      const metadata: Record<string, unknown> = {};
      if (displayName.trim()) {
        metadata.name = displayName.trim();
      }
      await signUpWithEmail(email, password, metadata);
      setSuccessMessage('Check your email to confirm your account.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setFormError(msg);
      Logger.error('Email sign-up failed', { error: msg });
    }
  }, [displayName, email, password, confirmPassword, signUpWithEmail]);

  const handleWalletSignUp = useCallback(async () => {
    setFormError(null);
    setSuccessMessage(null);
    try {
      await signInWithWallet();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet sign-up failed';
      setFormError(msg);
      Logger.error('Wallet sign-up failed', { error: msg });
    }
  }, [signInWithWallet]);

  const handleDisplayNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const animClass = visible ? 'animate-fadeUp' : 'opacity-0';

  return (
    <div className="flex items-center justify-center bg-slate-50 dark:bg-[#050A09]" style={{ padding: '3rem 2rem' }}>
      <div className={`w-full ${animClass}`} style={{ maxWidth: 440, animationDelay: '0.1s' }}>
        {/* Mobile-only logo */}
        <Link to="/" className="lg:hidden mb-8 inline-flex items-center gap-3" aria-label="Go to homepage">
          <Logo className="h-10 w-10" />
          <span className="text-gray-900 dark:text-white text-lg font-semibold tracking-tight">Give Protocol</span>
        </Link>

        {/* Heading */}
        <h1
          className="font-serif text-slate-900 dark:text-white"
          style={{ fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.4rem' }}
        >
          Create your account
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '2rem' }}>
          Start your transparent giving journey
        </p>

        {/* Success message */}
        {successMessage && (
          <div
            className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {/* Error alert */}
        {formError && (
          <div
            className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
            role="alert"
          >
            {formError}
          </div>
        )}

        {/* Registration form */}
        <SignupFormFields
          displayName={displayName}
          email={email}
          password={password}
          confirmPassword={confirmPassword}
          loading={loading}
          onDisplayNameChange={handleDisplayNameChange}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          onSubmit={handleEmailSignUp}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Wallet sign up */}
        <Button
          onClick={handleWalletSignUp}
          variant="secondary"
          fullWidth
          size="lg"
          icon={<Wallet className="h-4 w-4" />}
          disabled={loading}
          className="font-semibold"
        >
          Sign Up with Wallet
        </Button>

        {/* Sign in prompt */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            to="/auth"
            className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline decoration-emerald-500 decoration-2 underline-offset-4"
          >
            Sign in &rarr;
          </Link>
        </p>

        {/* Nonprofit button */}
        <Link
          to="/auth/charity"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors duration-200 group border-t border-gray-100 dark:border-gray-800 mt-5"
        >
          <Building2 className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white">
            I manage a Nonprofit Profile
          </span>
        </Link>

        {/* Trust signal */}
        <p className="text-center" style={{ marginTop: '1.25rem', fontSize: '0.72rem', color: 'var(--slate-400)', lineHeight: 1.5 }}>
          <ShieldCheck aria-hidden="true" className="inline h-3 w-3 mr-1 align-text-bottom" />
          256-bit SSL encrypted. By creating an account you agree to our{' '}
          <Link to="/legal" className="underline" style={{ color: 'var(--slate-500)', textUnderlineOffset: 2 }}>Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline" style={{ color: 'var(--slate-500)', textUnderlineOffset: 2 }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

/** Unified sign-up page with email and wallet registration. */
const AuthSignup: React.FC = () => (
  <div className="min-h-[calc(100vh-60px)] grid grid-cols-1 lg:grid-cols-[5fr_6fr]">
    <SignupLeftPanel />
    <SignupRightPanel />
  </div>
);

export default AuthSignup;
