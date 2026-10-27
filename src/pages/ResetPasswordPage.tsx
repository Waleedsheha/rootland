import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthService } from '../services/authService';
import { useToast } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEOHead';

interface ResetPasswordPageProps {
  onRequestNewLink: () => void;
}

type State = 'checking' | 'ready' | 'invalid';

/**
 * Opened from the password-reset email. Supabase reads the link when the site loads and signs the
 * customer in for this purpose; without that session the link has expired or was already used.
 */
export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onRequestNewLink }) => {
  const { t, isArabic } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    AuthService.hasSession()
      .then((has) => {
        if (active) setState(has ? 'ready' : 'invalid');
      })
      .catch((err) => {
        console.error('[ResetPasswordPage] session check failed:', err);
        if (active) setState('invalid');
      });
    const onRecovery = () => setState('ready');
    window.addEventListener('rootland_password_recovery', onRecovery);
    return () => {
      active = false;
      window.removeEventListener('rootland_password_recovery', onRecovery);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('auth.passwordShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }
    setSaving(true);
    try {
      await AuthService.updatePassword(password);
      showToast(t('reset.saved'), undefined, 'success');
      navigate('/account');
    } catch (err) {
      console.error('[ResetPasswordPage] password update failed:', err);
      setError(AuthService.formatAuthError(err, isArabic));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-bg-2 border border-line py-2.5 px-3 ps-9 text-sm text-fg focus:outline-none focus:border-fg';
  const labelClass = 'block text-sm text-mut mb-1';

  return (
    <div className="gutter pb-[clamp(60px,10vh,110px)]">
      <SEOHead title={t('reset.seoTitle')} description={t('reset.desc')} />

      {state === 'checking' && (
        <div className="min-h-[30vh] flex items-end">
          <div className="flex items-center gap-4">
            <span className="w-5 h-5 border-2 border-fg border-t-transparent animate-spin rounded-full" />
            <span className="text-sm text-mut">{t('reset.checking')}</span>
          </div>
        </div>
      )}

      {state === 'invalid' && (
        <div>
          <h1 className="t-section text-fg max-w-[16ch]">{t('reset.invalidTitle')}</h1>
          <p className="t-blurb text-body max-w-[46ch] mt-6">{t('reset.invalidDesc')}</p>
          <button type="button" onClick={onRequestNewLink} className="pill pill--solid mt-8">
            {t('reset.newLinkBtn')}
          </button>
        </div>
      )}

      {state === 'ready' && (
        <div className="max-w-md">
          <h1 className="t-section text-fg">{t('reset.title')}</h1>
          <p className="t-blurb text-body mt-4">{t('reset.desc')}</p>

          {error && (
            <div role="alert" className="mt-6 p-3 bg-err/10 border border-err/50 text-sm text-err">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="reset-password" className={labelClass}>
                {t('reset.newPassword')}
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <Lock className="w-4 h-4 text-mut absolute top-3 start-3" />
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm" className={labelClass}>
                {t('reset.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
                <Lock className="w-4 h-4 text-mut absolute top-3 start-3" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="pill pill--solid w-full">
              {saving ? t('common.loading') : t('reset.saveBtn')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
