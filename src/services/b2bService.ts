import { B2BQuoteRequest } from '../types';
import { DataService } from './dataService';

export interface BulkPriceTier {
  minQuantity: number;
  maxQuantity: number;
  discountPercentage: number;
  basePriceEgp: number;
  embroideryFeeEgp: number;
  leadTimeDays: number;
  samplingTimeDays: string;
  leadTimeWeeks: string;
}

export const BULK_PRICE_TIERS: BulkPriceTier[] = [
  {
    minQuantity: 25,
    maxQuantity: 50,
    discountPercentage: 20,
    basePriceEgp: 1550,
    embroideryFeeEgp: 75,
    leadTimeDays: 7,
    samplingTimeDays: '3-4 Business Days',
    leadTimeWeeks: '1-2 Weeks',
  },
  {
    minQuantity: 51,
    maxQuantity: 150,
    discountPercentage: 30,
    basePriceEgp: 1350,
    embroideryFeeEgp: 0, // Included
    leadTimeDays: 10,
    samplingTimeDays: '2-3 Business Days',
    leadTimeWeeks: '2 Weeks',
  },
  {
    minQuantity: 151,
    maxQuantity: 500,
    discountPercentage: 40,
    basePriceEgp: 1150,
    embroideryFeeEgp: 0, // Included
    leadTimeDays: 14,
    samplingTimeDays: '2 Business Days',
    leadTimeWeeks: '2-3 Weeks',
  },
  {
    minQuantity: 501,
    maxQuantity: 5000,
    discountPercentage: 50,
    basePriceEgp: 950,
    embroideryFeeEgp: 0, // Included
    leadTimeDays: 20,
    samplingTimeDays: '1-2 Business Days',
    leadTimeWeeks: '3-4 Weeks',
  },
];

export class B2BService {
  public static calculateBulkEstimate(quantity: number, includeEmbroidery: boolean = true) {
    let selectedTier = BULK_PRICE_TIERS[0];
    for (const tier of BULK_PRICE_TIERS) {
      if (quantity >= tier.minQuantity) {
        selectedTier = tier;
      }
    }

    let unitPrice = selectedTier.basePriceEgp;
    if (includeEmbroidery && selectedTier.embroideryFeeEgp > 0) {
      unitPrice += selectedTier.embroideryFeeEgp;
    }

    const totalEstimatedEgp = unitPrice * quantity;
    const retailEquivalent = 1950 * quantity;
    const savingsEgp = retailEquivalent - totalEstimatedEgp;
    const savingsPercentage = Math.round((savingsEgp / retailEquivalent) * 100);

    return {
      tier: selectedTier,
      unitPrice,
      totalEstimatedEgp,
      retailEquivalent,
      savingsEgp,
      savingsPercentage,
      leadTimeDays: selectedTier.leadTimeDays,
    };
  }

  public static calculateVolumeEstimate(quantity: number, includeEmbroidery: boolean = true) {
    const res = this.calculateBulkEstimate(quantity, includeEmbroidery);
    return {
      tier: {
        minUnits: res.tier.minQuantity,
        maxUnits: res.tier.maxQuantity,
        discountPercentage: res.tier.discountPercentage,
        basePricePerUnitEgp: res.tier.basePriceEgp,
        sampleTurnaroundDays: 2,
        productionTurnaroundDays: res.leadTimeDays,
        embroideryIncluded: res.tier.embroideryFeeEgp === 0,
      },
      quantity,
      unitPrice: res.unitPrice,
      subtotal: res.totalEstimatedEgp,
      standardRetailEquivalent: res.retailEquivalent,
      totalSavings: res.savingsEgp,
      savingsPercentage: res.savingsPercentage,
      turnaroundDays: res.leadTimeDays,
    };
  }

  /** Saves the request in Supabase; throws if it could not be saved so the customer can use WhatsApp instead. */
  public static async submitQuoteRequest(
    request: Omit<B2BQuoteRequest, 'id' | 'createdAt' | 'status' | 'notes'>
  ): Promise<{ success: boolean; leadId: string; message: string }> {
    const leadId = await DataService.submitB2BLead(request);
    return {
      success: true,
      leadId,
      message: 'Your B2B quote request has been received. Our manufacturing director in Egypt will respond within 4 business hours with custom fabric swatches and cost model.',
    };
  }
}
