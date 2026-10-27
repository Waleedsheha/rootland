import React from 'react';

interface State {
  error: Error | null;
}

/** Shows a friendly message instead of a blank page if any screen crashes. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isArabic = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6 text-fg">
        <div data-surface="night" className="max-w-md w-full p-8 text-center space-y-4">
          <h1 className="font-display text-xl font-bold">
            {isArabic ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p className="text-xs text-mut">
            {isArabic ? 'أعد تحميل الصفحة. إذا تكررت المشكلة تواصل معنا على واتساب.' : 'Please reload the page. If it keeps happening, contact us on WhatsApp.'}
          </p>
          <p className="text-[10px] font-mono text-mut break-all">{this.state.error.message}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-fg text-bg text-xs font-semibold uppercase tracking-wider"
            >
              {isArabic ? 'إعادة التحميل' : 'Reload'}
            </button>
            <a href="/" className="px-5 py-2.5 border border-line text-xs font-semibold uppercase tracking-wider">
              {isArabic ? 'الرئيسية' : 'Home'}
            </a>
          </div>
        </div>
      </div>
    );
  }
}
