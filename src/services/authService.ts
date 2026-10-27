import type { Session } from '@supabase/supabase-js';
import { supabase, errorMessage } from '../lib/supabase';
import { Customer, FitProfile, OrderAddress, WishlistItem } from '../types';
import { safeStorage } from '../utils/storage';

const WISHLIST_STORAGE_KEY = 'rootland_wishlist_v1';

export type AdminRole = 'OWNER' | 'ORDERS' | 'CONTENT' | 'MARKETING';

export interface UserRoleInfo {
  role: AdminRole | 'CUSTOMER';
  isAdmin: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canManageContent: boolean;
  canManageMarketing: boolean;
  canManageSettings: boolean;
  /** Admin dashboard tabs this role may open */
  allowedTabs: string[];
}

/** What each admin role can open in the dashboard (the database enforces the same split with row level security). */
export const ROLE_TABS: Record<AdminRole, string[]> = {
  OWNER: ['dashboard', 'orders', 'customers', 'products', 'inventory', 'reviews', 'coupons', 'b2b', 'content', 'settings', 'staff', 'activity'],
  ORDERS: ['dashboard', 'orders', 'customers'],
  CONTENT: ['products', 'inventory', 'content', 'reviews'],
  MARKETING: ['dashboard', 'coupons', 'b2b', 'content'],
};

export function buildRoleInfo(role: AdminRole): UserRoleInfo {
  return {
    role,
    isAdmin: true,
    canManageProducts: role === 'OWNER' || role === 'CONTENT',
    canManageOrders: role === 'OWNER' || role === 'ORDERS',
    canManageStaff: role === 'OWNER',
    canViewAnalytics: role === 'OWNER' || role === 'MARKETING',
    canManageContent: role === 'OWNER' || role === 'CONTENT' || role === 'MARKETING',
    canManageMarketing: role === 'OWNER' || role === 'MARKETING',
    canManageSettings: role === 'OWNER',
    allowedTabs: ROLE_TABS[role],
  };
}

export const CUSTOMER_ROLE: UserRoleInfo = {
  role: 'CUSTOMER',
  isAdmin: false,
  canManageProducts: false,
  canManageOrders: false,
  canManageStaff: false,
  canViewAnalytics: false,
  canManageContent: false,
  canManageMarketing: false,
  canManageSettings: false,
  allowedTabs: [],
};

const ADMIN_ROLES: AdminRole[] = ['OWNER', 'ORDERS', 'CONTENT', 'MARKETING'];

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

/** Where links in sign-up and password-reset emails send the customer back to. */
function siteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function customerFromRow(row: Record<string, any>): Customer {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone ?? undefined,
    addresses: row.addresses as OrderAddress[],
    createdAt: row.created_at,
    savedFitProfile: row.fit_profile ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Accounts run on Supabase Auth (email + password). Each account has a row in `profiles`
 * (created by a database trigger at sign-up). Components listen for `rootland_auth_updated`
 * and read the signed-in customer through getCurrentUser().
 */
export class AuthService {
  private static current: Customer | null = null;
  private static session: Session | null = null;
  private static ready = false;
  private static loadError: string | null = null;
  /** Staff role of the signed-in account, loaded with its profile (null for customers). */
  private static staffRole: AdminRole | null = null;

  /** Restores the saved session and follows sign-ins, sign-outs and password-recovery links. */
  public static initAuthListener(): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      this.session = session;
      if (event === 'PASSWORD_RECOVERY' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('rootland_password_recovery'));
      }
      // Supabase asks not to call other Supabase methods inside this callback; load the profile right after it.
      setTimeout(() => {
        this.loadProfile().catch((err) => {
          console.error('[AuthService] profile could not be loaded:', errorMessage(err));
          this.loadError = errorMessage(err);
          this.current = null;
          this.staffRole = null;
          this.ready = true;
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_auth_updated'));
        });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }

  private static async loadProfile(): Promise<Customer | null> {
    const user = this.session?.user;
    if (!user) {
      this.staffRole = null;
      this.setCurrent(null);
      return null;
    }
    const [profile, role] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.rpc('my_staff_role'),
    ]);
    if (profile.error) throw profile.error;
    if (role.error) throw role.error;
    if (role.data !== null && !ADMIN_ROLES.includes(role.data as AdminRole)) throw new Error(`Unknown staff role: ${role.data}`);
    this.staffRole = role.data as AdminRole | null;
    const customer = customerFromRow(profile.data);
    this.setCurrent(customer);
    return customer;
  }

  private static setCurrent(customer: Customer | null): void {
    this.current = customer;
    this.ready = true;
    this.loadError = null;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_auth_updated'));
  }

  /** True once the saved session (if any) has been restored and the profile loaded, or loading it failed. */
  public static isReady(): boolean {
    return this.ready;
  }

  /** Why the signed-in account could not be loaded (the session exists but its profile did not load). */
  public static getLoadError(): string | null {
    return this.loadError;
  }

  public static getCurrentUser(): Customer | null {
    return this.current;
  }

  /** The signed-in account's staff role, or null for customers and signed-out visitors. */
  public static getStaffRole(): AdminRole | null {
    return this.staffRole;
  }

  public static async signIn(email: string, password: string): Promise<Customer> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    this.session = data.session;
    const customer = await this.loadProfile();
    if (!customer) throw new Error('Signed in, but the account profile is missing.');
    return customer;
  }

  /**
   * Creates the account. With email confirmation on (the default), Supabase emails a link and the
   * customer is signed in after clicking it, so needsEmailConfirmation is true.
   */
  public static async signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { full_name: input.fullName.trim(), phone: input.phone.trim() },
        emailRedirectTo: siteUrl('/account'),
      },
    });
    if (error) throw error;
    if (data.session) {
      this.session = data.session;
      await this.loadProfile();
      return { needsEmailConfirmation: false };
    }
    return { needsEmailConfirmation: true };
  }

  public static async resendConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: siteUrl('/account') },
    });
    if (error) throw error;
  }

  /** Emails a link to /reset-password where the customer chooses a new password. */
  public static async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl('/reset-password') });
    if (error) throw error;
  }

  /** Sets a new password for the signed-in account (used by the reset-password page). */
  public static async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  public static async hasSession(): Promise<boolean> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return Boolean(data.session);
  }

  public static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.session = null;
    this.staffRole = null;
    this.setCurrent(null);
  }

  /** Staff role of the signed-in account (only counts once its email is confirmed). */
  public static async getUserRole(): Promise<UserRoleInfo> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return CUSTOMER_ROLE;
    const { data, error } = await supabase.rpc('my_staff_role');
    if (error) throw error;
    if (data === null) return CUSTOMER_ROLE;
    if (!ADMIN_ROLES.includes(data as AdminRole)) throw new Error(`Unknown staff role: ${data}`);
    return buildRoleInfo(data as AdminRole);
  }

  public static async updateProfile(patch: { fullName: string; phone: string }): Promise<Customer> {
    const user = this.current;
    if (!user) throw new Error('Not signed in.');
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: patch.fullName.trim(), phone: patch.phone.trim() || null })
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    const customer = customerFromRow(data);
    this.setCurrent(customer);
    return customer;
  }

  /** Keeps an order's delivery address on the account (newest first, at most 3) for the next checkout. */
  public static async saveDeliveryAddress(address: OrderAddress): Promise<void> {
    const user = this.current;
    if (!user) throw new Error('Not signed in.');
    const sameAs = (a: OrderAddress) =>
      a.fullName === address.fullName &&
      a.phone === address.phone &&
      a.governorateId === address.governorateId &&
      a.city === address.city &&
      a.district === address.district &&
      a.streetAddress === address.streetAddress &&
      a.buildingNumber === address.buildingNumber &&
      a.floorApartment === address.floorApartment &&
      a.nearestLandmark === address.nearestLandmark;
    const addresses = [address, ...user.addresses.filter((a) => !sameAs(a))].slice(0, 3);
    const { data, error } = await supabase.from('profiles').update({ addresses }).eq('id', user.id).select('*').single();
    if (error) throw error;
    this.setCurrent(customerFromRow(data));
  }

  /** Saves the fit-tool answers to the signed-in customer's profile. */
  public static async saveFitProfile(profile: FitProfile): Promise<void> {
    const user = this.current;
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ fit_profile: profile })
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    this.setCurrent(customerFromRow(data));
  }

  /** Friendly message for a Supabase Auth error, in the visitor's language. */
  public static formatAuthError(err: unknown, isArabic: boolean): string {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
    const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status: unknown }).status) : 0;
    const message = errorMessage(err);
    const L = (en: string, ar: string) => (isArabic ? ar : en);

    if (code === 'invalid_credentials' || message === 'Invalid login credentials') {
      return L('Incorrect email or password.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    if (code === 'email_not_confirmed' || message === 'Email not confirmed') {
      return L(
        'Please confirm your email first. Use the link we sent you, or send it again below.',
        'يرجى تأكيد بريدك الإلكتروني أولاً. استخدم الرابط الذي أرسلناه لك، أو أعد إرساله من الأسفل.'
      );
    }
    if (code === 'user_already_exists' || code === 'email_exists') {
      return L('An account with this email already exists. Sign in instead.', 'يوجد حساب بهذا البريد بالفعل. سجّل الدخول بدلاً من ذلك.');
    }
    if (code === 'weak_password') {
      return L('Choose a stronger password of at least 8 characters.', 'اختر كلمة مرور أقوى من 8 أحرف على الأقل.');
    }
    if (code === 'same_password') {
      return L('Choose a password different from your current one.', 'اختر كلمة مرور مختلفة عن الحالية.');
    }
    if (code === 'email_address_invalid' || code === 'validation_failed') {
      return L('This email address is not valid.', 'البريد الإلكتروني غير صحيح.');
    }
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
      return L('Too many attempts. Please wait a few minutes and try again.', 'محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى.');
    }
    if (code === 'signup_disabled') {
      return L('New accounts are paused right now.', 'إنشاء الحسابات متوقف حالياً.');
    }
    if (message.includes('Error sending') && message.includes('email')) {
      return L(
        'We could not send the email right now. Please try again later, or contact us on WhatsApp.',
        'تعذر إرسال البريد الآن. حاول لاحقاً أو تواصل معنا على واتساب.'
      );
    }
    if (message.includes('Failed to fetch') || (code === 'unexpected_failure' && status === 0)) {
      return L('Could not reach the server. Check your connection and try again.', 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.');
    }
    const detail = [code, status ? String(status) : '', message].filter(Boolean).join(' · ');
    return L(`Something went wrong (${detail}). Please try again.`, `حدث خطأ (${detail}). حاول مرة أخرى.`);
  }

  // ----- Wishlist (kept in this browser) -----

  public static getWishlist(): WishlistItem[] {
    const data = safeStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read the wishlist', e);
      return [];
    }
  }

  public static toggleWishlist(productId: string): boolean {
    const list = this.getWishlist();
    const exists = list.some((w) => w.productId === productId);
    const updated = exists
      ? list.filter((w) => w.productId !== productId)
      : [...list, { productId, addedAt: new Date().toISOString() }];
    safeStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_wishlist_updated'));
    return !exists;
  }

  public static isInWishlist(productId: string): boolean {
    return this.getWishlist().some((w) => w.productId === productId);
  }
}
