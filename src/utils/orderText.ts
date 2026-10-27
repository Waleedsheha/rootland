import { OrderStatus } from '../types';

const LABELS: Record<OrderStatus, { en: string; ar: string }> = {
  pending: { en: 'Received', ar: 'تم الاستلام' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  processing: { en: 'Preparing', ar: 'جاري التجهيز' },
  shipped: { en: 'With the courier', ar: 'مع شركة الشحن' },
  delivered: { en: 'Delivered', ar: 'تم التسليم' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  refused: { en: 'Refused at delivery', ar: 'رُفض الاستلام' },
  returned: { en: 'Returned', ar: 'مرتجع' },
};

export function orderStatusLabel(status: OrderStatus, isArabic: boolean): string {
  return isArabic ? LABELS[status].ar : LABELS[status].en;
}

/** Progress through the happy path (1 received … 5 delivered); 0 for cancelled, refused or returned. */
export function orderStep(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 1;
    case 'confirmed':
      return 2;
    case 'processing':
      return 3;
    case 'shipped':
      return 4;
    case 'delivered':
      return 5;
    case 'cancelled':
    case 'refused':
    case 'returned':
      return 0;
  }
}
