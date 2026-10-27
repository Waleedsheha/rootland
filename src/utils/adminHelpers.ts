import { Order, B2BQuoteRequest } from '../types';

/**
 * Synthesizes a subtle, pleasant audio chime using the Web Audio API
 * when a new order arrives. No external audio assets required.
 */
export function playNewOrderChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.5, now + 0.3); // C6
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.start(now);
    osc.stop(now + 0.7);
  } catch {
    // Autoplay restrictions or audio context not allowed
  }
}

/**
 * Downloads a CSV string as a file in the browser
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports orders to CSV format
 */
export function exportOrdersToCSV(orders: Order[]): void {
  const headers = [
    'Order Number',
    'Date',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Governorate',
    'City',
    'Street Address',
    'Items Summary',
    'Total (EGP)',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Courier',
    'Tracking Number',
  ];

  const rows = orders.map((o) => {
    const itemsSummary = o.items.map((i) => `${i.productName} (${i.colorName}, ${i.size}) x${i.quantity}`).join('; ');
    return [
      `"${o.orderNumber}"`,
      `"${new Date(o.createdAt).toLocaleDateString()}"`,
      `"${(o.shippingAddress?.fullName || '').replace(/"/g, '""')}"`,
      `"${(o.customerEmail || '').replace(/"/g, '""')}"`,
      `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
      `"${(o.shippingAddress?.governorate || '').replace(/"/g, '""')}"`,
      `"${(o.shippingAddress?.city || '').replace(/"/g, '""')}"`,
      `"${(o.shippingAddress?.streetAddress || '').replace(/"/g, '""')}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      o.total,
      `"${o.paymentMethod.toUpperCase()}"`,
      `"${o.paymentStatus}"`,
      `"${o.orderStatus.toUpperCase()}"`,
      `"${o.courier || ''}"`,
      `"${o.trackingNumber || ''}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`rootland_orders_${dateStr}.csv`, csv);
}

export interface AggregatedCustomer {
  email: string;
  name: string;
  phone: string;
  governorate: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: Order[];
}

/**
 * Exports customers aggregated from real orders to CSV
 */
export function exportCustomersToCSV(customers: AggregatedCustomer[]): void {
  const headers = [
    'Customer Name',
    'Email',
    'Phone',
    'Governorate',
    'Total Orders',
    'Total Spent (EGP)',
    'Last Order Date',
  ];

  const rows = customers.map((c) => [
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.email.replace(/"/g, '""')}"`,
    `"${c.phone.replace(/"/g, '""')}"`,
    `"${c.governorate.replace(/"/g, '""')}"`,
    c.orderCount,
    c.totalSpent,
    `"${new Date(c.lastOrderDate).toLocaleDateString()}"`,
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`rootland_customers_${dateStr}.csv`, csv);
}

/**
 * Exports B2B Leads to CSV
 */
export function exportB2BLeadsToCSV(leads: B2BQuoteRequest[]): void {
  const headers = [
    'Lead ID',
    'Company Name',
    'Contact Person',
    'Email',
    'Phone',
    'Business Type',
    'Garment Type',
    'Est. Quantity',
    'Status',
    'Date Submitted',
  ];

  const rows = leads.map((l) => [
    `"${l.id || ''}"`,
    `"${(l.companyName || '').replace(/"/g, '""')}"`,
    `"${(l.contactPerson || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.businessType || '').replace(/"/g, '""')}"`,
    `"${(l.productType || '').replace(/"/g, '""')}"`,
    l.estimatedQuantity || 0,
    `"${(l.status || 'new').toUpperCase()}"`,
    `"${l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ''}"`,
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`rootland_b2b_leads_${dateStr}.csv`, csv);
}
