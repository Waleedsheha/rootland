/** Message for a coupon the database refused (reason codes from check_coupon / place_order). */
export function couponReasonText(
  reason: string,
  minOrderAmount: number | undefined,
  isArabic: boolean,
  formatPrice: (amount: number) => string
): string {
  const L = (en: string, ar: string) => (isArabic ? ar : en);
  switch (reason) {
    case 'INVALID':
      return L('This code is not valid.', 'هذا الكود غير صالح.');
    case 'NOT_STARTED':
      return L('This code is not active yet.', 'هذا الكود لم يبدأ بعد.');
    case 'EXPIRED':
      return L('This code has expired.', 'انتهت صلاحية هذا الكود.');
    case 'USED_UP':
      return L('This code has reached its usage limit.', 'وصل هذا الكود إلى الحد الأقصى للاستخدام.');
    case 'ALREADY_USED':
      return L('You have already used this code.', 'لقد استخدمت هذا الكود من قبل.');
    case 'MIN_ORDER':
      return minOrderAmount
        ? L(`This code needs an order of ${formatPrice(minOrderAmount)} or more.`, `هذا الكود يتطلب طلباً بقيمة ${formatPrice(minOrderAmount)} أو أكثر.`)
        : L('Your order is below the minimum for this code.', 'طلبك أقل من الحد الأدنى لهذا الكود.');
    default:
      console.error('[couponReasonText] unknown coupon reason:', reason);
      return L('This code cannot be used.', 'لا يمكن استخدام هذا الكود.');
  }
}
