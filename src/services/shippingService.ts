export interface ShippingRate {
  governorate: string;
  zone: string;
  standardFeeEgp: number;
  expressFeeEgp: number;
  estimatedStandardDays: string;
  estimatedExpressDays: string;
}

export const EGYPT_SHIPPING_RATES: Record<string, ShippingRate> = {
  Cairo: {
    governorate: 'Cairo',
    zone: 'Zone 1 (Capital Metro)',
    standardFeeEgp: 65,
    expressFeeEgp: 120,
    estimatedStandardDays: '1-2 Days',
    estimatedExpressDays: 'Same-Day / 24h',
  },
  Giza: {
    governorate: 'Giza',
    zone: 'Zone 1 (Capital Metro)',
    standardFeeEgp: 65,
    expressFeeEgp: 120,
    estimatedStandardDays: '1-2 Days',
    estimatedExpressDays: 'Same-Day / 24h',
  },
  Alexandria: {
    governorate: 'Alexandria',
    zone: 'Zone 2 (North Coast / Delta)',
    standardFeeEgp: 85,
    expressFeeEgp: 150,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '24-48h',
  },
  'Al Daqahliyah': {
    governorate: 'Al Daqahliyah',
    zone: 'Zone 2 (North Coast / Delta)',
    standardFeeEgp: 85,
    expressFeeEgp: 150,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '48h',
  },
  'Al Gharbiyah': {
    governorate: 'Al Gharbiyah',
    zone: 'Zone 2 (North Coast / Delta)',
    standardFeeEgp: 85,
    expressFeeEgp: 150,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '48h',
  },
  'Al Sharqiyah': {
    governorate: 'Al Sharqiyah',
    zone: 'Zone 2 (North Coast / Delta)',
    standardFeeEgp: 85,
    expressFeeEgp: 150,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '48h',
  },
  'Port Said': {
    governorate: 'Port Said',
    zone: 'Zone 3 (Canal Cities)',
    standardFeeEgp: 95,
    expressFeeEgp: 160,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '48h',
  },
  Suez: {
    governorate: 'Suez',
    zone: 'Zone 3 (Canal Cities)',
    standardFeeEgp: 95,
    expressFeeEgp: 160,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '48h',
  },
  Ismailia: {
    governorate: 'Ismailia',
    zone: 'Zone 3 (Canal Cities)',
    standardFeeEgp: 95,
    expressFeeEgp: 160,
    estimatedStandardDays: '2-3 Days',
    estimatedExpressDays: '48h',
  },
  'Red Sea': {
    governorate: 'Red Sea',
    zone: 'Zone 4 (Resorts & Coastal)',
    standardFeeEgp: 140,
    expressFeeEgp: 220,
    estimatedStandardDays: '3-4 Days',
    estimatedExpressDays: '2-3 Days',
  },
  'South Sinai': {
    governorate: 'South Sinai',
    zone: 'Zone 4 (Resorts & Coastal)',
    standardFeeEgp: 140,
    expressFeeEgp: 220,
    estimatedStandardDays: '3-4 Days',
    estimatedExpressDays: '2-3 Days',
  },
  Asyut: {
    governorate: 'Asyut',
    zone: 'Zone 5 (Upper Egypt)',
    standardFeeEgp: 130,
    expressFeeEgp: 210,
    estimatedStandardDays: '3-4 Days',
    estimatedExpressDays: '2-3 Days',
  },
  Luxor: {
    governorate: 'Luxor',
    zone: 'Zone 5 (Upper Egypt)',
    standardFeeEgp: 130,
    expressFeeEgp: 210,
    estimatedStandardDays: '3-4 Days',
    estimatedExpressDays: '2-3 Days',
  },
  Aswan: {
    governorate: 'Aswan',
    zone: 'Zone 5 (Upper Egypt)',
    standardFeeEgp: 130,
    expressFeeEgp: 210,
    estimatedStandardDays: '3-4 Days',
    estimatedExpressDays: '2-3 Days',
  },
};

export class ShippingService {
  public static readonly FREE_SHIPPING_THRESHOLD_EGP = 3000;

  public static calculateShipping(
    governorate = 'Cairo',
    subtotal = 0,
    speed: 'standard' | 'express' | 'sameday' = 'standard'
  ): {
    fee: number;
    isFree: boolean;
    estimatedDays: string;
    zone: string;
  } {
    const rate = EGYPT_SHIPPING_RATES[governorate] || EGYPT_SHIPPING_RATES['Cairo'];

    if (subtotal >= this.FREE_SHIPPING_THRESHOLD_EGP && speed === 'standard') {
      return {
        fee: 0,
        isFree: true,
        estimatedDays: rate.estimatedStandardDays,
        zone: rate.zone,
      };
    }

    if (speed === 'express' || speed === 'sameday') {
      return {
        fee: rate.expressFeeEgp,
        isFree: false,
        estimatedDays: rate.estimatedExpressDays,
        zone: rate.zone,
      };
    }

    return {
      fee: rate.standardFeeEgp,
      isFree: false,
      estimatedDays: rate.estimatedStandardDays,
      zone: rate.zone,
    };
  }

  public static getAvailableGovernorates(): string[] {
    return Object.keys(EGYPT_SHIPPING_RATES);
  }
}
