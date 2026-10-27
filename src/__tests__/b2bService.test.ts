import { describe, it, expect, vi, afterEach } from 'vitest';

// Tests must never reach the production database: any use of the Supabase client throws.
vi.mock('../lib/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: () => {
        throw new Error('Tests must not reach the database');
      },
    }
  ),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

import { B2BService } from '../services/b2bService';
import { DataService } from '../services/dataService';

describe('B2BService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves a quote request and returns its reference', async () => {
    const spy = vi.spyOn(DataService, 'submitB2BLead').mockResolvedValue('B2B-TEST1');
    const response = await B2BService.submitQuoteRequest({
      companyName: 'Test Café',
      contactPerson: 'Test Person',
      email: 'test@example.com',
      phone: '01000000000',
      businessType: 'Restaurant / Café',
      employeeCount: '20-50',
      estimatedQuantity: 120,
      productType: 'RootLand Essential Hoodie – Black',
      preferredColors: 'Black',
      brandingTechnique: 'Custom Printed Logo',
      requiredDeliveryDate: '2026-12-01',
      additionalRequirements: '',
      hasLogoArtwork: true,
    });
    expect(spy).toHaveBeenCalled();
    expect(response.leadId).toBe('B2B-TEST1');
  });

  it('reports an error instead of silently losing the request', async () => {
    vi.spyOn(DataService, 'submitB2BLead').mockRejectedValue(new Error('TOO_MANY_REQUESTS'));
    await expect(
      B2BService.submitQuoteRequest({
        companyName: 'X',
        contactPerson: 'Y',
        email: 'x@example.com',
        phone: '01000000000',
        businessType: 'Other',
        employeeCount: '10-20',
        estimatedQuantity: 100,
        productType: 'Both colors',
        preferredColors: '',
        brandingTechnique: 'Plain (No Logo)',
        requiredDeliveryDate: '2026-12-01',
        additionalRequirements: '',
        hasLogoArtwork: false,
      })
    ).rejects.toThrow();
  });
});
