import React from 'react';
import { SEOHead } from '../components/SEOHead';
import { LegalPage, LegalSection } from '../components/ui/LegalPage';
import { StoreSettingsService } from '../services/storeSettingsService';

interface TermsPageProps {
  isArabic?: boolean;
}

export const TermsPage: React.FC<TermsPageProps> = ({ isArabic = false }) => {
  const threshold = StoreSettingsService.getSettingsSync().freeShippingThreshold.toLocaleString('en-US');
  const sections: LegalSection[] = [
    {
      title: isArabic ? 'مواصفات القطعة وجودة الفليس' : 'Garment specifications & fleece quality',
      paragraphs: [
        isArabic
          ? 'كل هودي يحمل علامة ROOTLAND مصنوع من 70% قطن مصري و30% بوليستر، ليمنحك ملمس فليس ناعم ومريح يدوم معك في كل موسم بقصة أوفر سايز بدون حبال أو طباعة.'
          : 'Every garment bearing the ROOTLAND trademark is crafted from 70% Egyptian cotton and 30% polyester, delivering a soft, substantial fleece designed for relaxed daily comfort with an honest oversized cut and zero drawstrings.',
      ],
    },
    {
      title: isArabic ? 'حق المعاينة عند الاستلام والاستبدال خلال 14 يوماً' : '14-day doorstep inspection & exchange right',
      paragraphs: [
        isArabic
          ? 'التزاماً بقانون حماية المستهلك المصري، يحق للعميل معاينة الهودي والتأكد من المقاس والخامة بحضور مندوب التوصيل قبل دفع المبلغ نقداً. كما يمتلك العميل الحق في استبدال المقاس أو استرجاع المنتج خلال 14 يوماً من تاريخ الاستلام بشرط احتفاظ القطعة بحالتها الأصلية غير المغسولة وبطاقاتها التعريفية.'
          : 'In compliance with Egyptian Consumer Protection regulations, customers retain the right to inspect garments at the doorstep prior to final payment. You are entitled to size exchange or product return within 14 calendar days from delivery, provided items remain unworn, unwashed, and with all original ROOTLAND tags attached.',
      ],
    },
    {
      title: isArabic ? 'سياسة الشحن والدفع داخل مصر' : 'Egyptian fulfilment & currency',
      paragraphs: [
        isArabic
          ? `جميع الأسعار بالجنيه المصري. نوفر الشحن لجميع محافظات مصر الـ 27، والشحن مجاني للطلبات من ${threshold} ج.م فأكثر.`
          : `All prices are in Egyptian Pounds. We ship to all 27 governorates, and shipping is free on orders of ${threshold} EGP or more.`,
        isArabic
          ? 'الدفع عند الاستلام: لا شيء يُدفع مقدماً. تدفع المبلغ كاملاً نقداً للمندوب عند وصول الطلب بعد معاينته.'
          : 'Cash on delivery: nothing is paid in advance. You pay the full amount in cash to the courier when the order arrives, after inspecting it.',
        isArabic
          ? 'الطلب المسبق: عند نفاد المقاس يمكن طلبه مسبقاً ويُدفع عند الاستلام مثل أي طلب، ويُشحن في الموعد المعلن على صفحة المنتج.'
          : 'Pre-orders: when a size is sold out it can be pre-ordered and is paid on delivery like any order. It ships on the date shown on the product page.',
      ],
    },
    {
      title: isArabic ? 'الملكية الفكرية والعلامة التجارية' : 'Intellectual property',
      paragraphs: [
        isArabic
          ? 'جميع تصاميم الهوديز، شعار روت لاند، هوية القطن المصري، والصور الدعائية محمية بموجب قوانين حماية حقوق الملكية الفكرية في جمهورية مصر العربية ولا يجوز نسخها أو إعادة استخدامها تجارياً دون إذن كتابي مسبق.'
          : 'All garment silhouettes, ROOTLAND typography, brand iconography, and campaign media are proprietary intellectual property protected under Egyptian Copyright and Trademark laws.',
      ],
    },
  ];

  return (
    <>
      <SEOHead
        title={isArabic ? 'الشروط والأحكام' : 'Terms & Conditions'}
        description="ROOTLAND store terms and conditions of purchase. Governed by Egyptian Consumer Protection Law No. 181/2018, 14-day doorstep exchange rights, and genuine Egyptian cotton warranty."
      />
      <LegalPage
        title={
          <>
            {isArabic ? 'الشروط والأحكام' : 'Terms &'} <span className="text-accent">{isArabic ? 'العامة' : 'conditions.'}</span>
          </>
        }
        meta={
          isArabic
            ? 'متوافقة مع أحكام قانون حماية المستهلك المصري رقم 181 لسنة 2018 ولائحته التنفيذية'
            : 'Governed by the provisions of Egyptian Consumer Protection Law No. 181 of 2018'
        }
        sections={sections}
        revealKey={isArabic}
      />
    </>
  );
};
