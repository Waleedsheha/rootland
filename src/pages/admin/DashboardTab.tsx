import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Order, Product } from '../../types';
import { CLOSED_STATUSES, OPEN_STATUSES, Badge, Section, OrderRow, Loading, ErrorNotice, Empty, egp, cairoDay } from './ui';

interface DashboardTabProps {
  orders: Order[];
  ordersState: 'loading' | 'ready' | 'error';
  ordersError: string;
  products: Product[];
  productsReady: boolean;
  /** Opens an order in the Orders tab (absent for roles without that tab). */
  onOpenOrder?: (orderId: string) => void;
  onOpenOrders?: () => void;
}

const LOW_STOCK = 3;

export const DashboardTab: React.FC<DashboardTabProps> = ({ orders, ordersState, ordersError, products, productsReady, onOpenOrder, onOpenOrders }) => {
  const now = new Date();
  const today = cairoDay(now.toISOString());
  const monthPrefix = today.slice(0, 7);
  const monthName = now.toLocaleString('en-GB', { timeZone: 'Africa/Cairo', month: 'long' });
  const counted = orders.filter((o) => !CLOSED_STATUSES.includes(o.orderStatus));
  const todayOrders = orders.filter((o) => cairoDay(o.createdAt) === today);
  const monthOrders = counted.filter((o) => cairoDay(o.createdAt).startsWith(monthPrefix));
  const openOrders = orders.filter((o) => OPEN_STATUSES.includes(o.orderStatus));
  const newOrders = orders.filter((o) => o.orderStatus === 'pending');
  const collected = orders.filter((o) => o.orderStatus === 'delivered').reduce((sum, o) => sum + o.total, 0);
  const toCollect = openOrders.reduce((sum, o) => sum + o.total, 0);

  const unitsByProduct = new Map<string, { name: string; units: number }>();
  for (const o of counted) {
    for (const item of o.items) {
      const entry = unitsByProduct.get(item.productId);
      if (entry) entry.units += item.quantity;
      else unitsByProduct.set(item.productId, { name: item.productName, units: item.quantity });
    }
  }
  const topProducts = [...unitsByProduct.values()].sort((a, b) => b.units - a.units);
  const maxUnits = topProducts.length > 0 ? topProducts[0].units : 0;

  const lowStock = products.flatMap((p) =>
    p.variants.filter((v) => v.stockCount <= LOW_STOCK).map((v) => ({ product: p.nameEn || p.name, variant: v }))
  );

  const kpis: { label: string; value: string; hint?: string }[] = [
    { label: 'Orders today', value: String(todayOrders.length) },
    { label: 'New, to confirm', value: String(newOrders.length), hint: 'Placed, not confirmed yet' },
    { label: 'Open orders', value: String(openOrders.length), hint: 'Not delivered or closed' },
    { label: 'Cash to collect', value: egp(toCollect), hint: 'From open orders, on delivery' },
    { label: 'Cash collected', value: egp(collected), hint: 'From delivered orders' },
    {
      label: 'This month',
      value: egp(monthOrders.reduce((s, o) => s + o.total, 0)),
      hint: `${monthOrders.length} ${monthOrders.length === 1 ? 'order' : 'orders'} in ${monthName}`,
    },
  ];

  return (
    <div className="space-y-6">
      {ordersState === 'error' ? (
        <ErrorNotice message={`Orders could not be loaded: ${ordersError}`} />
      ) : (
        <section aria-label="Key numbers" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-fg/10 bg-fg/10 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="min-w-0 bg-bg-2 px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-[13px] font-medium text-body">{kpi.label}</p>
              {ordersState === 'ready' ? (
                <p className="mt-2.5 text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-fg sm:text-[28px]">{kpi.value}</p>
              ) : (
                <span aria-hidden="true" className="mt-2.5 block h-7 w-24 animate-pulse rounded-md bg-fg/[0.08]" />
              )}
              {kpi.hint && <p className="mt-2 text-xs text-mut">{kpi.hint}</p>}
            </div>
          ))}
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {ordersState !== 'error' && (
          <Section
            title="Latest orders"
            flush
            actions={
              onOpenOrders && (
                <button type="button" onClick={onOpenOrders} className="pill pill--sm">
                  All orders
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )
            }
          >
            {ordersState === 'loading' && <Loading label="Loading orders…" />}
            {ordersState === 'ready' && orders.length === 0 && <Empty>No orders yet. New orders appear here the moment they are placed.</Empty>}
            {ordersState === 'ready' && orders.length > 0 && (
              <ul className="divide-y divide-fg/10">
                {orders.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <OrderRow order={o} onOpen={onOpenOrder ? () => onOpenOrder(o.id) : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        <div className="space-y-6">
          <Section title="Low stock" description={`Sizes with ${LOW_STOCK} pieces or fewer.`} flush>
            {!productsReady ? (
              <Loading label="Loading stock…" />
            ) : lowStock.length === 0 ? (
              <Empty>Every size has more than {LOW_STOCK} pieces.</Empty>
            ) : (
              <ul className="divide-y divide-fg/10">
                {lowStock.map(({ product, variant }) => (
                  <li key={variant.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full border border-fg/25" style={{ backgroundColor: variant.colorHex }} />
                      <span className="min-w-0 truncate text-fg">
                        {product}
                        <span className="text-mut">
                          {' '}
                          · {variant.colorName} {variant.size}
                        </span>
                      </span>
                    </span>
                    {variant.stockCount === 0 ? <Badge tone="err">Sold out</Badge> : <Badge tone="warn">{variant.stockCount} left</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {ordersState === 'ready' && (
            <Section title="Units sold" description="Every order except cancelled, refused and returned ones.">
              {topProducts.length === 0 ? (
                <p className="text-sm text-body">No pieces sold yet.</p>
              ) : (
                <ul className="space-y-4">
                  {topProducts.map((p) => (
                    <li key={p.name} className="text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-fg">{p.name}</span>
                        <span className="font-medium tabular-nums text-fg">{p.units}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((p.units / maxUnits) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};
