import { Product, CartItem, Cart, Order } from '../types';
import { StoreSettingsService } from './storeSettingsService';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    ttq?: {
      track: (eventName: string, params?: Record<string, any>) => void;
      page: () => void;
      load?: (pixelId: string) => void;
    };
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export class TrackingService {
  private static metaInitialized = false;
  private static tiktokInitialized = false;
  private static ga4Initialized = false;

  public static initializeFromSettings(): void {
    if (typeof window === 'undefined') return;
    const settings = StoreSettingsService.getSettingsSync();

    // 1. Meta Pixel (Facebook & Instagram)
    const metaId = settings.metaPixelId;
    if (metaId && !this.metaInitialized) {
      try {
        /* eslint-disable */
        (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        if (window.fbq) {
          window.fbq('init', metaId);
          this.metaInitialized = true;
        }
      } catch (err) {
        console.warn('Meta Pixel initialization notice:', err);
      }
    }

    // 2. TikTok Pixel
    const tiktokId = settings.tiktokPixelId;
    if (tiktokId && !this.tiktokInitialized) {
      try {
        /* eslint-disable */
        (function (w: any, d: any, t: any) {
          w.TiktokAnalyticsObject = t;
          var ttq = (w[t] = w[t] || []);
          ttq.methods = [
            'page',
            'track',
            'identify',
            'instances',
            'debug',
            'on',
            'off',
            'once',
            'ready',
            'alias',
            'group',
            'enableCookie',
            'disableCookie',
          ];
          ttq.setAndDefer = function (t: any, e: any) {
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
          ttq.instance = function (t: any) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
            return e;
          };
          ttq.load = function (e: any, n: any) {
            var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
            (ttq._i = ttq._i || {}), (ttq._i[e] = []), (ttq._i[e]._u = i);
            (ttq._t = ttq._t || {}), (ttq._t[e] = +new Date());
            (ttq._o = ttq._o || {}), (ttq._o[e] = n || {});
            var o = document.createElement('script');
            (o.type = 'text/javascript'), (o.async = !0), (o.src = i + '?sdkid=' + e + '&lib=' + t);
            var a = document.getElementsByTagName('script')[0];
            a.parentNode?.insertBefore(o, a);
          };
          ttq.load(tiktokId);
        })(window, document, 'ttq');
        this.tiktokInitialized = true;
      } catch (err) {
        console.warn('TikTok Pixel initialization notice:', err);
      }
    }

    // 3. Google Analytics 4 (GA4)
    const ga4Id = settings.ga4MeasurementId;
    if (ga4Id && !this.ga4Initialized) {
      try {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
          window.dataLayer?.push(arguments);
        };
        window.gtag('js', new Date());
        window.gtag('config', ga4Id, { send_page_view: false });
        this.ga4Initialized = true;
      } catch (err) {
        console.warn('GA4 initialization notice:', err);
      }
    }
  }

  public static trackPageView(path: string, title?: string): void {
    this.initializeFromSettings();
    const pageTitle = title || (typeof document !== 'undefined' ? document.title : 'ROOTLAND');

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.page();
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: pageTitle,
      });
    }

    if (import.meta.env.DEV) {
      console.log(`[Tracking] PageView: ${path} (${pageTitle})`);
    }
  }

  public static trackViewContent(product: Product): void {
    this.initializeFromSettings();
    const value = product.salePrice || product.price;

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_category: 'Hoodies',
        content_ids: [product.id, product.slug],
        content_type: 'product',
        value,
        currency: 'EGP',
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('ViewContent', {
        content_id: product.id,
        content_name: product.name,
        content_type: 'product',
        value,
        currency: 'EGP',
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        currency: 'EGP',
        value,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            price: value,
            item_category: 'Essential Hoodies',
          },
        ],
      });
    }

    if (import.meta.env.DEV) {
      console.log(`[Tracking] ViewContent: ${product.name} (${value} EGP)`);
    }
  }

  public static trackAddToCart(item: CartItem): void {
    this.initializeFromSettings();
    const value = item.unitPrice * item.quantity;

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: item.productName,
        content_ids: [item.productId],
        content_type: 'product',
        value,
        currency: 'EGP',
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('AddToCart', {
        content_id: item.productId,
        content_name: item.productName,
        content_type: 'product',
        value,
        currency: 'EGP',
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'EGP',
        value,
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

    if (import.meta.env.DEV) {
      console.log(`[Tracking] AddToCart: ${item.productName} (${value} EGP)`);
    }
  }

  public static trackInitiateCheckout(cart: Cart): void {
    this.initializeFromSettings();

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        num_items: cart.items.reduce((s, i) => s + i.quantity, 0),
        value: cart.total,
        currency: 'EGP',
        content_ids: cart.items.map((i) => i.productId),
        content_type: 'product',
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('InitiateCheckout', {
        value: cart.total,
        currency: 'EGP',
        contents: cart.items.map((i) => ({
          content_id: i.productId,
          content_name: i.productName,
          quantity: i.quantity,
          price: i.unitPrice,
        })),
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'EGP',
        value: cart.total,
        items: cart.items.map((i) => ({
          item_id: i.productId,
          item_name: i.productName,
          price: i.unitPrice,
          quantity: i.quantity,
          item_variant: `${i.colorName} / ${i.size}`,
        })),
      });
    }

    if (import.meta.env.DEV) {
      console.log(`[Tracking] InitiateCheckout: ${cart.total} EGP`);
    }
  }

  public static trackPurchase(order: Order): void {
    this.initializeFromSettings();

    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', 'Purchase', {
        value: order.total,
        currency: 'EGP',
        content_type: 'product',
        num_items: order.items.reduce((s, i) => s + i.quantity, 0),
        order_id: order.orderNumber,
      });
    }

    // TikTok Pixel
    if (window.ttq) {
      window.ttq.track('CompletePayment', {
        content_id: order.orderNumber,
        value: order.total,
        currency: 'EGP',
      });
    }

    // GA4
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: order.orderNumber,
        value: order.total,
        currency: 'EGP',
        shipping: order.shippingFee,
        items: order.items.map((i) => ({
          item_id: i.productId,
          item_name: i.productName,
          price: i.unitPrice,
          quantity: i.quantity,
          item_variant: `${i.colorName} / ${i.size}`,
        })),
      });
    }

    if (import.meta.env.DEV) {
      console.log(`[Tracking] Purchase: #${order.orderNumber} - ${order.total} EGP`);
    }
  }
}
