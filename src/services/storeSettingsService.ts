import { supabase, errorMessage } from '../lib/supabase';
import type { GovernorateConfig, SiteContent, StoreSettings } from '../data/storeDefaults';

export { ALL_27_EGYPT_GOVERNORATES } from '../data/storeDefaults';
export type { GovernorateConfig, SiteContent, StoreSettings } from '../data/storeDefaults';

/**
 * Store settings (shipping fees for the 27 governorates, free-shipping threshold, pre-orders,
 * contact details, tracking pixels) live in the `settings` row "store"; storefront text in "content".
 * main.tsx loads both before the app paints, so the sync getters always return database values.
 */
export class StoreSettingsService {
  private static settings: StoreSettings | null = null;

  public static async load(): Promise<StoreSettings> {
    const { data, error } = await supabase.from('settings').select('data').eq('id', 'store').single();
    if (error) throw new Error(`Store settings could not be loaded: ${errorMessage(error)}`);
    this.settings = data.data as StoreSettings;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_settings_updated'));
    return this.settings;
  }

  public static getSettingsSync(): StoreSettings {
    if (!this.settings) throw new Error('Store settings are read before they were loaded.');
    return this.settings;
  }

  /** Reloads from the database (for screens that want the latest values). */
  public static async getSettings(): Promise<StoreSettings> {
    return this.load();
  }

  /** Owner only (enforced by row level security); the database rejects incomplete shipping data. */
  public static async updateSettings(next: StoreSettings): Promise<StoreSettings> {
    const { data, error } = await supabase.from('settings').update({ data: next }).eq('id', 'store').select('data').single();
    if (error) throw new Error(errorMessage(error));
    this.settings = data.data as StoreSettings;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_settings_updated'));
    return this.settings;
  }

  public static governorate(id: string): GovernorateConfig {
    const gov = this.getSettingsSync().governorates.find((g) => g.id === id);
    if (!gov) throw new Error(`Unknown governorate: ${id}`);
    return gov;
  }
}

/**
 * Editable storefront text (announcement bar, hero). The Content and Marketing roles can edit it
 * without touching shipping or payment settings.
 */
export class SiteContentService {
  private static content: SiteContent | null = null;

  public static async load(): Promise<SiteContent> {
    const { data, error } = await supabase.from('settings').select('data').eq('id', 'content').single();
    if (error) throw new Error(`Site content could not be loaded: ${errorMessage(error)}`);
    this.content = data.data as SiteContent;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_content_updated'));
    return this.content;
  }

  public static getContentSync(): SiteContent {
    if (!this.content) throw new Error('Site content is read before it was loaded.');
    return this.content;
  }

  public static async getContent(): Promise<SiteContent> {
    return this.load();
  }

  public static async updateContent(next: SiteContent): Promise<SiteContent> {
    const { data, error } = await supabase.from('settings').update({ data: next }).eq('id', 'content').select('data').single();
    if (error) throw new Error(errorMessage(error));
    this.content = data.data as SiteContent;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_content_updated'));
    return this.content;
  }

  /** The admin text for the current language; empty admin fields keep the built-in copy from the i18n files. */
  public static pick(content: SiteContent, key: 'announcement' | 'heroTitle' | 'heroSubtitle', isArabic: boolean, builtIn: string): string {
    const value = content[`${key}${isArabic ? 'Ar' : 'En'}` as keyof SiteContent];
    return value.trim() ? value : builtIn;
  }
}
