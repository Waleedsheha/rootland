import { Product, CartItem, Cart, Order, B2BQuoteRequest } from '../types';

export interface AnalyticsEvent {
  eventName: string;
  parameters: Record<string, any>;
  timestamp: string;
}

export class AnalyticsService {
  private static eventsLog: AnalyticsEvent[] = [];

  public static track(eventName: string, parameters: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      eventName,
      parameters,
      timestamp: new Date().toISOString(),
    };

    this.eventsLog.unshift(event);
    if (this.eventsLog.length > 100) this.eventsLog.pop();

    // Browser console logging in development
    if (import.meta.env.DEV) {
      console.log(`[ROOTLAND Analytics] ${eventName}`, parameters);
    }

    // Google Analytics 4 dispatch if gtag exists
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, parameters);
    }

    // Meta Pixel dispatch if fbq exists
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('trackCustom', eventName, parameters);
    }
  }

  public static trackPageView(path: string): void {
    this.track('page_view', { page_path: path, page_title: document.title });
  }

  public static trackViewItem(product: Product): void {
    this.track('view_item', {
      currency: 'EGP',
      value: product.salePrice || product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.salePrice || product.price,
          item_category: 'Hoodies',
        },
      ],
    });
  }

  public static trackAddToCart(item: CartItem): void {
    this.track('add_to_cart', {
      currency: 'EGP',
      value: item.unitPrice * item.quantity,
      items: [
        {
          item_id: item.productId,
          item_name: item.productName,
          price: item.unitPrice,
          quantity: item.quantity,
          item_variant: `${item.colorName} / ${item.size}`,
        },
      ],
    });
  }

  public static trackBeginCheckout(cart: Cart): void {
    this.track('begin_checkout', {
      currency: 'EGP',
      value: cart.total,
      items_count: cart.items.length,
      coupon: cart.discountCode,
    });
  }

  public static trackPurchase(order: Order): void {
    this.track('purchase', {
      transaction_id: order.orderNumber,
      value: order.total,
      currency: 'EGP',
      shipping: order.shippingFee,
      payment_type: order.paymentMethod,
      items_count: order.items.length,
    });
  }

  public static trackSearch(query: string, resultCount: number): void {
    this.track('search', { search_term: query, results_count: resultCount });
  }

  public static trackB2BLead(lead: B2BQuoteRequest): void {
    this.track('generate_lead', {
      lead_type: 'B2B_Quote',
      company_name: lead.companyName,
      estimated_quantity: lead.estimatedQuantity,
      estimated_budget: lead.estimatedBudgetEgp,
    });
  }

  public static getRecentEvents(): AnalyticsEvent[] {
    return [...this.eventsLog];
  }
}
