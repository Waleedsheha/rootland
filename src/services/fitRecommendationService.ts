import { FitProfile, FitRecommendation, Product } from '../types';

export class FitRecommendationService {
  /**
   * Deterministic, honest sizing algorithm for RootLand's unisex oversized cut.
   * Available sizes are L, XL, and XXL only.
   * - Cut is oversized.
   * - People who normally wear M get a relaxed oversized fit in L.
   * - People who wear S may find L too big, stated honestly.
   */
  public static calculateRecommendation(
    profile: FitProfile,
    _targetProduct?: Product,
    lang: 'en' | 'ar' = 'en'
  ): FitRecommendation {
    const ar = lang === 'ar';
    const { heightCm, weightKg, desiredFit, bodyType, normalClothingSize } = profile;

    // Estimate chest circumference from height, weight, and body build
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    let estimatedChestCircumference = 70 + (bmi * 1.5) + (weightKg * 0.15);

    if (bodyType === 'athletic') {
      estimatedChestCircumference += 4;
    } else if (bodyType === 'stocky') {
      estimatedChestCircumference += 6;
    } else if (bodyType === 'slim') {
      estimatedChestCircumference -= 3;
    }

    // Determine baseline size among L, XL, XXL only
    let baseSize: 'L' | 'XL' | 'XXL' = 'L';
    const wearsSmall = normalClothingSize === 'S' || estimatedChestCircumference < 94 || (heightCm < 172 && weightKg < 66);
    const wearsMedium = normalClothingSize === 'M' || (!wearsSmall && estimatedChestCircumference < 104 && weightKg < 82);

    if (wearsSmall || wearsMedium) {
      baseSize = 'L';
    } else if (estimatedChestCircumference < 114 || weightKg < 98) {
      baseSize = 'XL';
    } else {
      baseSize = 'XXL';
    }

    const validSizes: ('L' | 'XL' | 'XXL')[] = ['L', 'XL', 'XXL'];
    let recommendedSize: 'L' | 'XL' | 'XXL' = baseSize;
    let alternativeSize: 'L' | 'XL' | 'XXL' | undefined = undefined;

    if (desiredFit === 'oversized') {
      if (baseSize === 'L') {
        if (!wearsSmall && !wearsMedium) {
          recommendedSize = 'XL';
          alternativeSize = 'L';
        } else {
          recommendedSize = 'L';
          alternativeSize = 'XL';
        }
      } else if (baseSize === 'XL') {
        recommendedSize = 'XXL';
        alternativeSize = 'XL';
      } else {
        recommendedSize = 'XXL';
      }
    } else if (desiredFit === 'slim') {
      if (baseSize === 'XXL') {
        recommendedSize = 'XL';
        alternativeSize = 'XXL';
      } else if (baseSize === 'XL') {
        recommendedSize = 'L';
        alternativeSize = 'XL';
      } else {
        recommendedSize = 'L';
      }
    } else {
      // Regular / relaxed classic
      recommendedSize = baseSize;
      if (baseSize === 'L') {
        alternativeSize = wearsSmall ? undefined : 'XL';
      } else if (baseSize === 'XL') {
        alternativeSize = 'XXL';
      } else {
        alternativeSize = 'XL';
      }
    }

    const confidence = Math.min(97, Math.max(88, Math.round(96 - Math.abs(bmi - 24) * 0.7)));

    let fitHeadline = ar ? `المقاس المقترح: ${recommendedSize}` : `Recommended size: ${recommendedSize}`;
    let fitExplanation = '';

    if (wearsSmall) {
      fitHeadline = ar ? 'مقاس L (تنبيه بصراحة)' : 'Size L (honest fit note)';
      fitExplanation = ar
        ? 'قصّة الهودي أوفر سايز. إذا كنت تلبس مقاس S فقد تجد مقاس L واسعاً عليك. إذا كنت تحب الشكل الواسع جداً فمقاس L هو الاختيار المناسب.'
        : 'The cut is oversized. If you usually wear S, size L may feel too big. If you like a very loose look, L is the right pick.';
    } else if (wearsMedium) {
      fitHeadline = ar ? 'المقاس المقترح: L' : 'Recommended size: L';
      fitExplanation = ar
        ? 'القصّة أوفر سايز، ومن يلبس مقاس M يحصل على لبسة واسعة ومريحة في مقاس L مع كتف نازل ومساحة في الصدر.'
        : 'The cut is oversized. If you usually wear M, size L gives a relaxed oversized fit with a dropped shoulder and room in the chest.';
    } else {
      fitExplanation = ar
        ? `بناءً على طولك (${heightCm} سم) ووزنك (${weightKg} كجم) واللبسة التي تفضلها، مقاس ${recommendedSize} يعطيك المساحة المناسبة في الصدر.`
        : `Based on your height (${heightCm} cm), weight (${weightKg} kg) and preferred fit, size ${recommendedSize} gives you the right room in the chest.`;
    }

    const alternativeExplanation = alternativeSize
      ? ar
        ? `إذا أردت لبسة ${desiredFit === 'oversized' ? 'أقرب للجسم' : 'أوسع'}، جرّب مقاس ${alternativeSize}.`
        : `For a ${desiredFit === 'oversized' ? 'closer' : 'looser'} look, try size ${alternativeSize}.`
      : undefined;

    return {
      recommendedSize,
      alternativeSize: alternativeSize !== recommendedSize ? alternativeSize : undefined,
      confidencePercentage: confidence,
      fitHeadline,
      fitExplanation,
      alternativeExplanation,
      measurementsComparison: {
        chestTolerance: desiredFit === 'oversized' ? '+14cm chest ease' : '+8cm chest ease',
        lengthFeel: heightCm > 185 ? 'Sits cleanly at mid-hip' : 'Comfortable low-waist drape',
        shoulderSilhouette: 'Dropped shoulder seam aligns naturally with upper arm',
      },
    };
  }

  public static async analyzeImageForFit(_file: File): Promise<{ detectedBodyType: string; suggestedSize: 'L' | 'XL' | 'XXL' }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          detectedBodyType: 'athletic',
          suggestedSize: 'L',
        });
      }, 1000);
    });
  }
}
