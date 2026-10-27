import { describe, it, expect } from 'vitest';
import { FitRecommendationService } from '../services/fitRecommendationService';
import { FitProfile } from '../types';
import { INITIAL_PRODUCTS } from '../data/products';

describe('FitRecommendationService', () => {
  it('recommends Large for someone wearing M with oversized honest fit explanation', () => {
    const profile: FitProfile = {
      heightCm: 175,
      weightKg: 73,
      ageRange: '25-34',
      bodyType: 'average',
      normalClothingSize: 'M',
      desiredFit: 'regular',
      genderPreference: 'unisex',
    };

    const recommendation = FitRecommendationService.calculateRecommendation(profile);

    expect(recommendation.recommendedSize).toBe('L');
    expect(recommendation.confidencePercentage).toBeGreaterThanOrEqual(88);
    expect(recommendation.fitExplanation).toContain('oversized');
  });

  it('adjusts to XL or XXL when oversized fit is requested for athletic build', () => {
    const profile: FitProfile = {
      heightCm: 178,
      weightKg: 80,
      ageRange: '25-34',
      bodyType: 'athletic',
      normalClothingSize: 'L',
      desiredFit: 'oversized',
      genderPreference: 'unisex',
    };

    const recommendation = FitRecommendationService.calculateRecommendation(
      profile,
      INITIAL_PRODUCTS[0]
    );

    expect(['XL', 'XXL']).toContain(recommendation.recommendedSize);
  });

  it('handles edge cases for tall and heavy body build with XXL recommendation', () => {
    const profile: FitProfile = {
      heightCm: 194,
      weightKg: 112,
      ageRange: '35-44',
      bodyType: 'stocky',
      normalClothingSize: 'XXL',
      desiredFit: 'regular',
      genderPreference: 'mens',
    };

    const recommendation = FitRecommendationService.calculateRecommendation(profile);

    expect(recommendation.recommendedSize).toBe('XXL');
    expect(recommendation.confidencePercentage).toBeGreaterThanOrEqual(85);
  });
});
