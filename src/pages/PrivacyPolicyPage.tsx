import React from 'react';
import { SEOHead } from '../components/SEOHead';
import { LegalPage, LegalSection } from '../components/ui/LegalPage';

interface PrivacyPolicyPageProps {
  isArabic?: boolean;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ isArabic = false }) => {
  const sections: LegalSection[] = [
    {
      title: isArabic ? 'جمع البيانات الشخصية الضرورية' : 'Information we collect',
      paragraphs: [
        isArabic
          ? 'عند إتمامك للطلب أو استشارة المقاس الذكي على موقع روت لاند، نجمع فقط البيانات الضرورية لتنفيذ التوصيل وخدمتك: الاسم الكامل، رقم الهاتف للتواصل عبر واتساب أو مكالمة مندوب الشحن، وعنوان التوصيل التفصيلي في محافظتك المصرية. وإذا أنشأت حساباً نحتفظ أيضاً ببريدك الإلكتروني، وتُحفظ كلمة المرور بشكل مشفّر فقط.'
          : 'When placing an order or using our AI Fit consultant at ROOTLAND, we collect strictly the personal data necessary to dispatch and deliver your garment: your full name, mobile number for courier dispatch and WhatsApp order tracking, and Egyptian delivery address. If you create an account, we also keep your email address; your password is stored only as a secure hash.',
      ],
      points: [
        isArabic ? 'بيانات التوصيل في 27 محافظة' : 'Courier delivery address',
        isArabic ? 'رقم الهاتف للتتبع والتأكيد' : 'Phone for courier & WhatsApp tracking',
      ],
    },
    {
      title: isArabic ? 'أمان المعاملات المالية والدفع' : 'Payment security & zero card storage',
      paragraphs: [
        isArabic
          ? 'نحن لا نطلب ولا نخزن بيانات بطاقاتك الائتمانية أو حساباتك البنكية. كل الطلبات تُدفع نقداً بالكامل للمندوب عند الاستلام بعد فحص القطعة.'
          : 'ROOTLAND never asks for or stores bank account details or credit card numbers. Every order is paid in cash to the courier at your doorstep, after you inspect it.',
      ],
    },
    {
      title: isArabic ? 'مشاركة البيانات مع شركات الشحن المصرية' : 'Courier & dispatch partners',
      paragraphs: [
        isArabic
          ? 'نشارك عنوانك ورقم هاتفك مع شركاء الشحن المعتمدين لدينا داخل مصر فقط لغرض توصيل الشحنة والتواصل معك قبل الوصول. لا نقوم ببيع أو تأجير بيانات عملائنا لأي طرف ثالث على الإطلاق.'
          : 'Your shipping address and mobile phone number are shared solely with our authorized logistics couriers in Egypt for the express purpose of delivery and pre-delivery calling. We never sell, rent, or trade your contact information.',
      ],
    },
    {
      title: isArabic ? 'حقوق العميل وحذف البيانات' : 'Your rights & data deletion',
      paragraphs: [
        isArabic
          ? 'يحق لك في أي وقت طلب نسخة من بياناتك المسجلة أو طلب حذف حسابك وسجل المقاسات بالكامل بالتواصل معنا مباشرة عبر البريد الإلكتروني info@rootland.store أو عبر خدمة العملاء على واتساب.'
          : 'You retain full rights under Egyptian Law to review, rectify, or request permanent deletion of your customer profile, fit data, and order history by writing to info@rootland.store or messaging our official WhatsApp concierge.',
      ],
    },
  ];

  return (
    <>
      <SEOHead
        title={isArabic ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy & Data Protection'}
        description="ROOTLAND Egypt data privacy policy. How we safeguard customer contact, shipping addresses, and order records under Egyptian Data Protection Law No. 151/2020."
      />
      <LegalPage
        title={
          <>
            {isArabic ? 'سياسة الخصوصية وسرية' : 'Privacy & data'} <span className="text-accent">{isArabic ? 'المعلومات' : 'protection.'}</span>
          </>
        }
        meta={
          isArabic
            ? 'آخر تحديث: سبتمبر 2026 · متوافقة مع قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020'
            : 'Last updated September 2026 · Governed by Egyptian Law No. 151 of 2020 on Personal Data Protection'
        }
        sections={sections}
        revealKey={isArabic}
      />
    </>
  );
};
