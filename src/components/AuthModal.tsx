import React, { useEffect, useRef, useState } from 'react';
import { X, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { AuthService } from '../services/authService';
import { useToast } from './Toast';
import { useLanguage } from '../context/LanguageContext';
import { normalizeEgyptMobile } from '../utils/phone';
import { RootlandIcon } from './RootlandLogo';

export type AuthMode = 'signin' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  onSuccess?: () => void;
}

type View = AuthMode | 'checkEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Underline inputs: no box, a clay rule draws in from the start edge while the field has focus. */
const fieldClass =
  'field-line w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 py-3 text-[16px] text-fg focus:outline-none';

function Field({ id, label, aside, children }: { id: string; label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-mut transition-colors duration-300 group-focus-within:text-fg">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        {children}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-clay transition-transform duration-500 ease-out-rl group-focus-within:scale-x-100 rtl:origin-right"
        />
      </div>
    </div>
  );
}

/**
 * Sign in, create an account, or request a password-reset link (Supabase Auth, email + password).
 * Wide screens get a split panel (the brand on night, the form on bone); phones a full-screen sheet.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose, onSuccess }) => {
  const { t, isArabic } = useLanguage();
  const { showToast } = useToast();
  const [view, setView] = useState<View>(initialMode);
  const [checkKind, setCheckKind] = useState<'signup' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notConfirmed, setNotConfirmed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Fresh form each time the modal opens (not on every parent render).
  useEffect(() => {
    if (!isOpen) return;
    setView(initialMode);
    setAuthError(null);
    setNotConfirmed(false);
    setPassword('');
    setShowPassword(false);
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    // Focus moves into the window (not into a field, so phones do not raise the keyboard uninvited).
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const switchTo = (next: View) => {
    setView(next);
    setAuthError(null);
    setNotConfirmed(false);
  };

  const showError = (err: unknown) => {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
    console.error('[AuthModal] Supabase auth error:', code, err);
    setNotConfirmed(code === 'email_not_confirmed');
    setAuthError(AuthService.formatAuthError(err, isArabic));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setNotConfirmed(false);
    const cleanEmail = email.trim();

    if (view === 'forgot') {
      if (!EMAIL_RE.test(cleanEmail)) {
        setAuthError(t('auth.emailInvalid'));
        return;
      }
    } else {
      if (!cleanEmail || !password) {
        setAuthError(t('auth.missingFields'));
        return;
      }
      if (!EMAIL_RE.test(cleanEmail)) {
        setAuthError(t('auth.emailInvalid'));
        return;
      }
    }
    if (view === 'signup') {
      if (!fullName.trim()) {
        setAuthError(t('auth.nameRequired'));
        return;
      }
      if (password.length < 8) {
        setAuthError(t('auth.passwordShort'));
        return;
      }
      if (phone.trim() && !normalizeEgyptMobile(phone)) {
        setAuthError(t('auth.phoneInvalid'));
        return;
      }
    }

    setLoading(true);
    try {
      if (view === 'signin') {
        const user = await AuthService.signIn(cleanEmail, password);
        showToast(t('auth.welcomeToast'), t('auth.signedInAs', { email: user.email }), 'success');
        // Staff stay where they are like any customer; the header's Admin button opens the admin.
        onSuccess?.();
        onClose();
      } else if (view === 'signup') {
        const { needsEmailConfirmation } = await AuthService.signUp({
          email: cleanEmail,
          password,
          fullName,
          phone: phone.trim() ? (normalizeEgyptMobile(phone) as string) : '',
        });
        if (needsEmailConfirmation) {
          setCheckKind('signup');
          setView('checkEmail');
        } else {
          showToast(t('auth.welcomeToast'), t('auth.signedInAs', { email: cleanEmail }), 'success');
          onSuccess?.();
          onClose();
        }
      } else if (view === 'forgot') {
        await AuthService.requestPasswordReset(cleanEmail);
        setCheckKind('reset');
        setView('checkEmail');
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await AuthService.resendConfirmation(email);
      setNotConfirmed(false);
      showToast(t('auth.checkEmailTitle'), t('auth.resent'), 'success');
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const title =
    view === 'signin'
      ? t('auth.signInTitle')
      : view === 'signup'
        ? t('auth.signUpTitle')
        : view === 'forgot'
          ? t('auth.forgotTitle')
          : t('auth.checkEmailTitle');

  const subtitle =
    view === 'signin'
      ? t('auth.signInSub')
      : view === 'signup'
        ? t('auth.signUpSub')
        : view === 'forgot'
          ? t('auth.forgotDesc')
          : checkKind === 'signup'
            ? t('auth.checkEmailSignup', { email: email.trim() })
            : t('auth.checkEmailReset', { email: email.trim() });

  const submitLabel = view === 'signin' ? t('auth.signInBtn') : view === 'signup' ? t('auth.signUpBtn') : t('auth.forgotBtn');

  const modeTab = (mode: 'signin' | 'signup', label: string) => (
    <button
      type="button"
      onClick={() => switchTo(mode)}
      aria-pressed={view === mode}
      className={`relative pb-2 text-sm transition-colors duration-300 cursor-pointer ${view === mode ? 'text-fg' : 'text-mut hover:text-fg'}`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-px origin-left bg-fg transition-transform duration-500 ease-out-rl rtl:origin-right ${
          view === mode ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[105] flex items-stretch justify-center md:items-center md:p-6">
      <div className="popup-scrim fixed inset-0 bg-night/85 cursor-pointer" onClick={onClose} />

      <div
        ref={dialogRef}
        tabIndex={-1}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="popup-panel relative z-10 grid w-full overflow-y-auto outline-none md:h-[min(92vh,840px)] md:max-w-[940px] md:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
      >
        {/* The brand side: the mark, the off-white hoodie, the line the collection is built on. */}
        <aside data-surface="night" aria-hidden="true" className="relative hidden flex-col justify-between gap-6 p-10 md:flex">
          <div className="flex items-center gap-2 text-fg">
            <RootlandIcon size={22} color="currentColor" barColor="#c8642a" />
            <span lang="en" className="font-display text-[17px] font-semibold uppercase leading-none tracking-[-0.03em]">
              Rootland
            </span>
          </div>
          <img
            src="/spin/white/720/001.webp"
            alt=""
            width={720}
            height={964}
            decoding="async"
            className="mx-auto h-[min(46vh,380px)] w-auto object-contain"
          />
          <p className="t-title text-fg !text-[clamp(28px,2.6vw,38px)]">
            {t('home.specTitle')} <span className="text-accent">{t('home.specTitleAccent')}</span>
          </p>
        </aside>

        <div data-surface="bone" className="flex min-h-full flex-col px-6 pb-8 pt-6 sm:px-12 sm:pb-10 sm:pt-10 md:min-h-0 md:overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            {view === 'signin' || view === 'signup' ? (
              <div className="flex items-center gap-6">
                {modeTab('signin', t('auth.signInBtn'))}
                {modeTab('signup', t('auth.signUpBtn'))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => switchTo('signin')}
                className="inline-flex items-center gap-2 text-sm text-mut transition-colors hover:text-fg cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                {t('auth.backToSignIn')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-fg transition-colors hover:border-fg cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* The title and form sit centred between the tabs and the small print; a long form scrolls. */}
          <div className="my-auto py-8">
            <h2
              id="auth-title"
              className="font-display text-[clamp(32px,3.4vw,44px)] font-semibold leading-[1.02] tracking-[-0.03em] text-fg [text-wrap:balance]"
            >
              {title}
            </h2>
            <p className="mt-3 max-w-[40ch] text-body leading-relaxed">{subtitle}</p>

            {authError && (
              <div role="alert" className="mt-6 flex items-start gap-3 text-sm text-err">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="space-y-1.5">
                  <p>{authError}</p>
                  {notConfirmed && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="font-semibold underline underline-offset-4 cursor-pointer disabled:opacity-50"
                    >
                      {t('auth.resendBtn')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {view === 'checkEmail' ? (
              <div className="mt-8 space-y-6">
                {checkKind === 'signup' && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm text-mut underline underline-offset-4 transition-colors hover:text-fg cursor-pointer disabled:opacity-50"
                  >
                    {t('auth.resendBtn')}
                  </button>
                )}
                <button type="button" onClick={() => switchTo('signin')} className="pill pill--solid w-full !py-[18px]">
                  <span>{t('auth.backToSignIn')}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
                {view === 'signup' && (
                  <>
                    <Field id="auth-name" label={t('auth.nameLabel')}>
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={fieldClass}
                      />
                    </Field>
                    <Field id="auth-phone" label={t('auth.phoneLabel')}>
                      <input
                        id="auth-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01012345678"
                        className={`${fieldClass} tabular-nums rtl:text-end`}
                      />
                    </Field>
                  </>
                )}

                <Field id="auth-email" label={t('auth.emailLabel')}>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`${fieldClass} rtl:text-end`}
                  />
                </Field>

                {view !== 'forgot' && (
                  <Field
                    id="auth-password"
                    label={t('auth.passwordLabel')}
                    aside={
                      view === 'signup' ? (
                        <span className="text-xs text-mut">{t('auth.passwordHint')}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => switchTo('forgot')}
                          className="text-xs text-mut underline underline-offset-4 transition-colors hover:text-fg cursor-pointer"
                        >
                          {t('auth.forgotLink')}
                        </button>
                      )
                    }
                  >
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${fieldClass} pe-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((shown) => !shown)}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      aria-pressed={showPassword}
                      className="absolute end-0 top-1/2 -translate-y-1/2 p-2 text-mut transition-colors hover:text-fg cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </Field>
                )}

                <button type="submit" disabled={loading} className="pill pill--solid w-full !mt-9 !py-[18px]">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  <span>{loading ? t('common.loading') : submitLabel}</span>
                  {!loading && <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}
                </button>
              </form>
            )}
          </div>

          {(view === 'signin' || view === 'signup') && <p className="text-xs leading-relaxed text-mut">{t('auth.termsNotice')}</p>}
        </div>
      </div>
    </div>
  );
};
