import { Order } from '../types';
import { safeStorage } from '../utils/storage';
import { DataService, PlaceOrderInput } from './dataService';

const ORDERS_STORAGE_KEY = 'rootland_orders_v2';

/**
 * Orders are cash on delivery and placed through the database (place_order), which checks
 * prices, stock and the coupon again. The last 20 orders placed in this browser are kept
 * locally so a guest can reopen the confirmation page.
 */
export class OrderService {
  public static getOrders(): Order[] {
    const data = safeStorage.getItem(ORDERS_STORAGE_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read saved orders', e);
      return [];
    }
  }

  public static async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const order = await DataService.placeOrder(input);
    const saved = [order, ...this.getOrders().filter((o) => o.id !== order.id)].slice(0, 20);
    safeStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(saved));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rootland_orders_updated'));
    return order;
  }

  /** This browser's copy first, then the database (the customer's own orders, or any order for staff). */
  public static async findOrder(orderNumber: string): Promise<Order | null> {
    const clean = orderNumber.replace(/^#/, '').trim().toUpperCase();
    const local = this.getOrders().find((o) => o.orderNumber === clean);
    if (local) return local;
    return DataService.fetchOrderByNumber(clean);
  }
}
