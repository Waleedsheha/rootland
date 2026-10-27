import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadBrandFonts } from './motion/fonts';
import { SiteContentService, StoreSettingsService } from './services/storeSettingsService';
import './index.css';

const rootElement = document.getElementById('root')!;

// Fonts, store settings (shipping fees, pre-orders) and storefront text must all be ready before the first paint.
Promise.all([loadBrandFonts(), StoreSettingsService.load(), SiteContentService.load()])
  .then(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <BrowserRouter>
          <LanguageProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </LanguageProvider>
        </BrowserRouter>
      </StrictMode>,
    );
  })
  .catch((error: Error) => {
    console.error('[RootLand] ', error);
    rootElement.setAttribute('role', 'alert');
    rootElement.style.padding = '24px';
    rootElement.textContent = `${error.message}. Check your connection and reload the page.`;
  });
