import React from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingWhatsAppProps {
  isArabic?: boolean;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const whatsappUrl = 'https://wa.me/201119509756';
  // On product pages the phone shows a fixed "Buy now" bar at the bottom, so lift the button above it.
  const onProduct = pathname.startsWith('/product/');

  return (
    <aside aria-label="Customer Support" data-surface="night" className="!bg-transparent">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('whatsapp.chatAria')}
        className={`fixed ${onProduct ? 'bottom-24 lg:bottom-6' : 'bottom-4 sm:bottom-6'} end-4 sm:end-6 z-40 pill pill--sm !bg-night hover:!bg-clay`}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">{t('whatsapp.label')}</span>
      </a>
    </aside>
  );
};
