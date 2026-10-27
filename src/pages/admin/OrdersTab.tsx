import React, { useEffect, useState } from 'react';
import { Copy, MessageCircle, Search, X } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { DataService } from '../../services/dataService';
import { useToast } from '../../components/Toast';
import { normalizeImagePath } from '../../utils/imageUtils';
import {
  OPEN_STATUSES,
  ORDER_STATUSES,
  STATUS_LABEL,
  Section,
  StatusPill,
  OrderRow,
  Loading,
  ErrorNotice,
  Empty,
  adminError,
  cairoTime,
  egp,
  fieldClass,
  selectClass,
  labelClass,
  linkClass,
  iconButtonClass,
  whatsappLink,
  useConfirm,
} from './ui';

interface OrdersTabProps {
  orders: Order[];
  ordersState: 'loading' | 'ready' | 'error';
  ordersError: string;
  selectedOrderId: string | null;
  onSelect: (orderId: string | null) => void;
}

type StatusFilter = 'all' | 'open' | OrderStatus;

export const OrdersTab: React.FC<OrdersTabProps> = ({ orders, ordersState, ordersError, selectedOrderId, onSelect }) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [search, setSearch] = useState('');
  const [preordersOnly, setPreordersOnly] = useState(false);

  const query = search.trim().toLowerCase();
  const digits = query.replace(/[^0-9]/g, '');
  const filtered = orders.filter((o) => {
    if (statusFilter === 'open' && !OPEN_STATUSES.includes(o.orderStatus)) return false;
    if (statusFilter !== 'open' && statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
    if (preordersOnly && !o.isPreorder) return false;
    if (!query) return true;
    return (
      o.orderNumber.toLowerCase().includes(query) ||
      o.shippingAddress.fullName.toLowerCase().includes(query) ||
      o.customerEmail.includes(query) ||
      (digits.length >= 3 && o.customerPhone.includes(digits))
    );
  });
  const selected = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;
  const listTitle = statusFilter === 'open' ? 'Open orders' : statusFilter === 'all' ? 'All orders' : STATUS_LABEL[statusFilter];

  if (ordersState === 'loading') {
    return (
      <div className="rounded-2xl border border-fg/10 bg-bg-2">
        <Loading label="Loading orders…" />
      </div>
    );
  }
  if (ordersState === 'error') return <ErrorNotice message={`Orders could not be loaded: ${ordersError}`} />;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className={selected ? 'hidden xl:block' : ''}>
        <Section
          title={listTitle}
          count={filtered.length}
          description={statusFilter === 'open' ? 'New, confirmed, preparing or with the courier.' : undefined}
          flush
        >
          <div className="space-y-3 border-b border-fg/10 px-5 py-4 sm:px-6">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mut" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Number, name, phone or email"
                aria-label="Search orders"
                className={`${fieldClass} ps-10`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filter by status"
                className={`${selectClass} !w-auto !py-2`}
              >
                <option value="open">Open orders</option>
                <option value="all">All orders</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <label className="flex w-fit items-center gap-2.5 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={preordersOnly} onChange={(e) => setPreordersOnly(e.target.checked)} className="accent-fg" />
                Pre-orders only
              </label>
            </div>
          </div>

          {orders.length === 0 ? (
            <Empty>No orders yet. New orders appear here the moment they are placed.</Empty>
          ) : filtered.length === 0 ? (
            <Empty>No orders match these filters.</Empty>
          ) : (
            <ul className="divide-y divide-fg/10">
              {filtered.map((o) => (
                <li key={o.id}>
                  <OrderRow order={o} active={o.id === selectedOrderId} onOpen={() => onSelect(o.id)} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {selected ? (
        <OrderDetail key={selected.id} order={selected} onClose={() => onSelect(null)} />
      ) : selectedOrderId ? (
        <ErrorNotice message="This order is not in the list any more." />
      ) : (
        <p className="hidden rounded-2xl border border-dashed border-fg/20 px-8 py-16 text-center text-sm leading-relaxed text-body xl:block">
          Choose an order to see the customer, the address and the timeline, and to change its status.
        </p>
      )}
    </div>
  );
};

function addressText(o: Order): string {
  const a = o.shippingAddress;
  return [
    a.fullName,
    a.phone,
    [a.streetAddress, a.buildingNumber && `Building ${a.buildingNumber}`, a.floorApartment && `Floor/Apt ${a.floorApartment}`].filter(Boolean).join(', '),
    [a.district, a.city, a.governorate].filter(Boolean).join(', '),
    a.nearestLandmark && `Landmark: ${a.nearestLandmark}`,
    `Cash on delivery: ${egp(o.total)}`,
    `Order ${o.orderNumber}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const subheadClass = 'text-sm font-semibold text-fg';
const blockClass = 'px-5 py-5 sm:px-6';

const OrderDetail: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [courier, setCourier] = useState(order.courier);
  const [tracking, setTracking] = useState(order.trackingNumber);
  const [savingShipping, setSavingShipping] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesState, setNotesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [savingNotes, setSavingNotes] = useState(false);
  const a = order.shippingAddress;

  useEffect(() => {
    let active = true;
    DataService.fetchInternalNotes(order.id)
      .then((text) => {
        if (!active) return;
        setNotes(text);
        setNotesState('ready');
      })
      .catch((err) => {
        console.error('[OrdersTab] internal notes could not be loaded:', err);
        if (active) setNotesState('error');
      });
    return () => {
      active = false;
    };
  }, [order.id]);

  const handleStatus = async () => {
    if (!nextStatus) return;
    const releases = (nextStatus === 'cancelled' || nextStatus === 'refused') && !order.stockReleased;
    const retakes = !['cancelled', 'refused'].includes(nextStatus) && order.stockReleased;
    const question = releases
      ? `Mark ${order.orderNumber} as "${STATUS_LABEL[nextStatus]}"? Its in-stock pieces go back to stock.`
      : retakes
        ? `Reopen ${order.orderNumber} as "${STATUS_LABEL[nextStatus]}"? Its pieces will be taken from stock again.`
        : nextStatus === 'returned'
          ? `Mark ${order.orderNumber} as returned? Stock does not change; add the pieces back in Inventory if they can be sold again.`
          : '';
    if (question && !(await confirmAction(question, 'Update order'))) return;
    setSavingStatus(true);
    try {
      await DataService.updateOrderStatus(order.id, nextStatus, statusNote.trim());
      showToast('Order updated', `${order.orderNumber}: ${STATUS_LABEL[nextStatus]}`, 'success');
      setNextStatus('');
      setStatusNote('');
    } catch (err) {
      showToast('Could not update the order', adminError(err), 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShipping(true);
    try {
      await DataService.updateOrderShipping(order.id, courier, tracking);
      showToast('Shipping saved', order.orderNumber, 'success');
    } catch (err) {
      showToast('Could not save shipping', adminError(err), 'error');
    } finally {
      setSavingShipping(false);
    }
  };

  const handleNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotes(true);
    try {
      await DataService.saveInternalNotes(order.id, notes);
      showToast('Notes saved', order.orderNumber, 'success');
    } catch (err) {
      showToast('Could not save notes', adminError(err), 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(addressText(order));
      showToast('Address copied', 'Paste it into the Bosta shipment.', 'info');
    } catch (err) {
      console.error('[OrdersTab] clipboard failed:', err);
      showToast('Could not copy', 'Your browser blocked the clipboard. Select the address and copy it by hand.', 'error');
    }
  };

  const greeting =
    order.customerLanguage === 'ar'
      ? `أهلاً ${a.fullName}، معك روت لاند بخصوص طلبك رقم ${order.orderNumber}.`
      : `Hi ${a.fullName}, this is RootLand about your order ${order.orderNumber}.`;
  const timeline = [...order.timeline].reverse();

  return (
    <article className="rounded-2xl border border-fg/10 bg-bg-2 xl:sticky xl:top-6 xl:max-h-[calc(100svh-48px)] xl:overflow-y-auto">
      <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums text-fg">{order.orderNumber}</h2>
            <StatusPill status={order.orderStatus} />
          </div>
          <p className="mt-1.5 text-[13px] text-mut">
            Placed {cairoTime(order.createdAt)} · {order.userId ? 'Customer account' : 'Guest checkout'} · {order.customerLanguage === 'ar' ? 'Arabic' : 'English'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the order" className={iconButtonClass}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="divide-y divide-fg/10 border-t border-fg/10">
        {order.isPreorder && order.preorderNote && (
          <div className={blockClass}>
            <p className="rounded-xl bg-fg/[0.05] px-4 py-3 text-sm text-fg">Pre-order: {order.preorderNote}</p>
          </div>
        )}

        {/* Status */}
        <section className={`space-y-3 ${blockClass}`}>
          <h3 className={subheadClass}>Change status</h3>
          <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus | '')} aria-label="New status" className={selectClass}>
              <option value="">Choose a status</option>
              {ORDER_STATUSES.filter((s) => s !== order.orderStatus).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              maxLength={300}
              placeholder="Note for the timeline (optional)"
              aria-label="Status note"
              className={fieldClass}
            />
            <button type="button" onClick={handleStatus} disabled={!nextStatus || savingStatus} className="pill pill--solid">
              {savingStatus ? 'Saving…' : 'Update'}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-mut">
            Delivered marks the cash as collected. Cancelled and refused return in-stock pieces to stock once.
            {order.stockReleased ? ' This order’s stock has already been returned.' : ''}
          </p>
        </section>

        {/* Customer and address */}
        <section className={`grid gap-6 sm:grid-cols-2 ${blockClass}`}>
          <div className="text-sm">
            <h3 className={`mb-2 ${subheadClass}`}>Customer</h3>
            <div className="space-y-1">
              <p className="text-fg">{a.fullName}</p>
              <p>
                <a href={`tel:${order.customerPhone}`} className={`tabular-nums text-fg ${linkClass}`}>
                  {order.customerPhone}
                </a>
              </p>
              {order.customerEmail && (
                <p className="truncate">
                  <a href={`mailto:${order.customerEmail}`} className={`text-fg ${linkClass}`}>
                    {order.customerEmail}
                  </a>
                </p>
              )}
            </div>
            <div className="pt-3">
              <a href={whatsappLink(order.customerPhone, greeting)} target="_blank" rel="noopener noreferrer" className="pill pill--sm">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp the customer
              </a>
            </div>
          </div>
          <div className="text-sm">
            <h3 className={`mb-2 ${subheadClass}`}>Delivery address</h3>
            <div className="space-y-1">
              <p className="whitespace-pre-line text-fg">
                {[a.streetAddress, a.buildingNumber && `Building ${a.buildingNumber}`, a.floorApartment && `Floor/Apt ${a.floorApartment}`].filter(Boolean).join(', ')}
                {'\n'}
                {[a.district, a.city, a.governorate].filter(Boolean).join(', ')}
              </p>
              {a.nearestLandmark && <p className="text-mut">Landmark: {a.nearestLandmark}</p>}
            </div>
            <div className="pt-3">
              <button type="button" onClick={handleCopy} className="pill pill--sm">
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy address for Bosta
              </button>
            </div>
          </div>
        </section>

        {order.notes && (
          <section className={`text-sm ${blockClass}`}>
            <h3 className={`mb-1.5 ${subheadClass}`}>Customer note</h3>
            <p className="whitespace-pre-line leading-relaxed text-body">{order.notes}</p>
          </section>
        )}

        {/* Items and totals */}
        <section className={`space-y-3 ${blockClass}`}>
          <h3 className={subheadClass}>Items</h3>
          <ul className="divide-y divide-fg/10">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-3 text-sm first:pt-1">
                <img src={normalizeImagePath(item.image)} alt="" className="h-14 w-12 shrink-0 rounded-md bg-bg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-fg">{item.productName}</p>
                  <p className="text-xs text-mut">
                    {item.colorName} · {item.size} · {item.sku} · {item.quantity} × {egp(item.unitPrice)}
                    {item.isPreorder ? ' · pre-order' : ''}
                  </p>
                </div>
                <span className="font-medium tabular-nums text-fg">{egp(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="ms-auto max-w-xs space-y-1.5 border-t border-fg/10 pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-mut">Subtotal</dt>
              <dd className="tabular-nums text-fg">{egp(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-mut">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                <dd className="tabular-nums text-ok">-{egp(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-mut">Delivery ({a.governorate})</dt>
              <dd className="tabular-nums text-fg">{order.shippingFee === 0 ? 'Free' : egp(order.shippingFee)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-fg/10 pt-2">
              <dt className="font-semibold text-fg">{order.paymentStatus === 'paid' ? 'Collected' : 'Cash on delivery'}</dt>
              <dd className="font-semibold tabular-nums text-fg">{egp(order.total)}</dd>
            </div>
          </dl>
        </section>

        {/* Shipping */}
        <form onSubmit={handleShipping} className={`space-y-3 ${blockClass}`}>
          <h3 className={subheadClass}>Courier and tracking</h3>
          <div className="grid items-end gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="order-courier" className={labelClass}>
                Courier
              </label>
              <input id="order-courier" type="text" maxLength={80} value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Bosta" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="order-tracking" className={labelClass}>
                Tracking number
              </label>
              <input id="order-tracking" type="text" maxLength={80} value={tracking} onChange={(e) => setTracking(e.target.value)} className={`${fieldClass} tabular-nums`} />
            </div>
            <button type="submit" disabled={savingShipping} className="pill">
              {savingShipping ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-mut">The customer sees these on the tracking page.</p>
        </form>

        {/* Internal notes */}
        <form onSubmit={handleNotes} className={`space-y-3 ${blockClass}`}>
          <label htmlFor="order-notes" className={`block ${subheadClass}`}>
            Internal notes
          </label>
          {notesState === 'loading' && (
            <div role="status" className="h-[86px] animate-pulse rounded-lg bg-fg/[0.06]">
              <span className="sr-only">Loading notes…</span>
            </div>
          )}
          {notesState === 'error' && <ErrorNotice message="Internal notes could not be loaded." />}
          {notesState === 'ready' && (
            <>
              <textarea id="order-notes" rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-mut">Only staff see these.</p>
                <button type="submit" disabled={savingNotes} className="pill pill--sm">
                  {savingNotes ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Timeline */}
        <section className={`space-y-4 ${blockClass}`}>
          <h3 className={subheadClass}>Timeline</h3>
          <ol className="ms-[5px] space-y-5 border-s border-fg/15">
            {timeline.map((event, i) => (
              <li key={i} className="relative ps-5 text-sm">
                <span
                  aria-hidden="true"
                  className={`absolute -start-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-bg-2 ${i === 0 ? 'bg-accent' : 'bg-mut'}`}
                />
                <p className="text-fg">
                  {STATUS_LABEL[event.status]}
                  {event.note ? <span className="text-body"> · {event.note}</span> : null}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-mut">{cairoTime(event.timestamp)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
};
