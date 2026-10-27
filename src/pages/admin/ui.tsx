import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { errorMessage } from '../../lib/supabase';

/** Shared pieces of the admin console (English only, bone surface, no small caps labels). */

export const fieldClass =
  'w-full rounded-lg border border-fg/15 bg-[#efefeb] px-3.5 py-2.5 text-sm text-fg transition-colors duration-200 hover:border-fg/30 focus:border-fg focus:outline-none disabled:cursor-not-allowed disabled:opacity-55';
/** A native select with the admin's own chevron (see .admin-select in index.css). */
export const selectClass = `${fieldClass} admin-select cursor-pointer pe-10`;
export const labelClass = 'mb-1.5 block text-[13px] font-medium text-body';
/** Round icon-only button, e.g. closing a panel. */
export const iconButtonClass =
  'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-fg/15 text-fg transition-colors duration-200 hover:border-fg cursor-pointer';
/** Table cells inside a flush panel: the first and last columns line up with the panel's padding. Add the alignment per column. */
export const thClass = 'whitespace-nowrap px-3 py-3 text-[13px] font-medium text-mut first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6';
export const tdClass = 'px-3 py-3.5 first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6';
/** Inline links: a quiet underline that darkens on hover. */
export const linkClass = 'underline decoration-fg/30 underline-offset-4 transition-colors duration-200 hover:decoration-fg';

export function egp(amount: number): string {
  return `${amount.toLocaleString('en-US')} EGP`;
}

/** Date and time in Cairo, e.g. "26 Oct 2026, 14:05". */
export function cairoTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Cairo calendar day of a timestamp, e.g. "2026-10-26". */
export function cairoDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

/** Readable message for a failed admin action. */
export function adminError(err: unknown): string {
  const message = errorMessage(err);
  if (
    message === 'NOT_ALLOWED' ||
    /row-level security|permission denied|multiple \(or no\) rows/i.test(message)
  ) {
    return 'Your role is not allowed to make this change, or the record no longer exists.';
  }
  if (/duplicate key/i.test(message)) return 'That already exists.';
  if (message.startsWith('OUT_OF_STOCK:')) {
    return `Not enough stock for ${message.slice('OUT_OF_STOCK:'.length)}. Add stock in Inventory first.`;
  }
  if (message.startsWith('SETTINGS_INVALID:')) return message.slice('SETTINGS_INVALID:'.length).trim();
  if (message === 'INVALID_STOCK') return 'Stock must be a whole number from 0 to 100000.';
  if (message === 'ORDER_NOT_FOUND') return 'This order no longer exists.';
  if (/violates check constraint/i.test(message)) return `A value is not allowed (${message}).`;
  if (message.includes('Failed to fetch')) return 'Could not reach the database. Check your connection and try again.';
  return message;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'New',
  confirmed: 'Confirmed',
  processing: 'Preparing',
  shipped: 'With the courier',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refused: 'Refused at the door',
  returned: 'Returned',
};

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refused', 'returned'];

export const OPEN_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped'];

export const CLOSED_STATUSES: OrderStatus[] = ['cancelled', 'refused', 'returned'];

export type Tone = 'neutral' | 'ok' | 'warn' | 'err';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-fg/[0.07] text-fg',
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-warn/12 text-warn',
  err: 'bg-err/8 text-err',
};

/** A small rounded state label with a dot, in one of four tones. */
export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none ${TONE_CLASS[tone]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone: Tone =
    status === 'pending' ? 'warn' : status === 'delivered' ? 'ok' : CLOSED_STATUSES.includes(status) ? 'err' : 'neutral';
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

/**
 * A panel: a titled card on the bone canvas. The body is padded, or `flush` for lists and tables
 * whose rows run edge to edge.
 */
export function Section({
  title,
  count,
  description,
  actions,
  flush = false,
  className = '',
  children,
}: {
  title: string;
  count?: number;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-fg/10 bg-bg-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug tracking-[-0.01em] text-fg">
            {title}
            {count !== undefined && <span className="ms-2 font-normal tabular-nums text-mut">{count}</span>}
          </h2>
          {description && <p className="mt-0.5 max-w-[70ch] text-[13px] leading-relaxed text-mut">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={`border-t border-fg/10 ${flush ? '' : 'space-y-5 px-5 py-5 sm:px-6'}`}>{children}</div>
    </section>
  );
}

/** Placeholder rows while a list loads, with the label for screen readers and sighted staff alike. */
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-3 px-5 py-5 sm:px-6">
      <p className="text-sm text-mut">{label}</p>
      <div aria-hidden="true" className="space-y-2">
        {[100, 100, 66].map((width, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-fg/[0.06]" style={{ width: `${width}%`, animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-err/25 bg-err/8 px-4 py-3.5 text-sm text-err">
      <span className="flex min-w-0 items-start gap-2.5">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="pill pill--sm">
          Try again
        </button>
      )}
    </div>
  );
}

/** What a list shows when it has nothing in it; sits inside a flush panel. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm leading-relaxed text-body sm:px-6">{children}</p>;
}

/** One order in a flush list: number, customer, total, when and where, and its status. */
export function OrderRow({ order, active = false, onOpen }: { order: Order; active?: boolean; onOpen?: () => void }) {
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <button
      type="button"
      disabled={!onOpen}
      onClick={onOpen}
      aria-current={active ? 'true' : undefined}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 text-start transition-colors duration-200 enabled:cursor-pointer sm:px-6 ${
        active ? 'bg-fg/[0.06]' : 'enabled:hover:bg-fg/[0.03]'
      }`}
    >
      <span className="min-w-0 truncate text-sm">
        <span className="font-semibold tabular-nums text-fg">{order.orderNumber}</span>
        <span className="text-body"> · {order.shippingAddress.fullName}</span>
      </span>
      <span className="text-end text-sm font-medium tabular-nums text-fg">{egp(order.total)}</span>
      <span className="min-w-0 truncate text-xs text-mut">
        {cairoTime(order.createdAt)} · {order.shippingAddress.governorate} · {pieces} {pieces === 1 ? 'piece' : 'pieces'}
        {order.isPreorder ? ' · pre-order' : ''}
      </span>
      <span className="text-end">
        <StatusPill status={order.orderStatus} />
      </span>
    </button>
  );
}

/** The save bar that stays in reach at the bottom of a long form. */
export function SaveBar({ note, error, children }: { note: string; error: string | null; children: React.ReactNode }) {
  return (
    <div
      data-surface="night"
      className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl px-5 py-3.5 shadow-[0_18px_40px_-12px_rgba(12,12,12,0.55)] sm:px-6"
    >
      {error ? (
        <p role="alert" className="text-sm text-err">
          {error}
        </p>
      ) : (
        <p className="text-sm text-body">{note}</p>
      )}
      {children}
    </div>
  );
}

/** A row of mutually exclusive filter buttons. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-full border border-fg/15 bg-[#efefeb] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 cursor-pointer ${
            value === option.value ? 'bg-fg text-bg' : 'text-body hover:text-fg'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** WhatsApp chat with a customer (Egyptian mobile 01xxxxxxxxx). */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  const international = digits.startsWith('0') ? `2${digits}` : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

type ConfirmAction = (message: string, confirmLabel: string) => Promise<boolean>;

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

const ConfirmContext = createContext<ConfirmAction | null>(null);

/**
 * Asks before a risky action with an on-page dialog instead of window.confirm. Browsers can block
 * window.confirm (the in-app browser does, and Chrome once "Prevent this page from creating additional
 * dialogs" is ticked), and a blocked one answers "Cancel" without showing anything.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirmAction = useCallback<ConfirmAction>(
    (message, confirmLabel) => new Promise((resolve) => setRequest({ message, confirmLabel, resolve })),
    []
  );

  return (
    <ConfirmContext.Provider value={confirmAction}>
      {children}
      {request && (
        <ConfirmDialog
          request={request}
          onAnswer={(ok) => {
            setRequest(null);
            request.resolve(ok);
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/** Resolves true when the person presses the confirm button; false on Cancel, Escape or a click outside. */
export function useConfirm(): ConfirmAction {
  const confirmAction = useContext(ConfirmContext);
  if (!confirmAction) throw new Error('useConfirm needs a ConfirmProvider above it.');
  return confirmAction;
}

function ConfirmDialog({ request, onAnswer }: { request: ConfirmRequest; onAnswer: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const answer = useRef(onAnswer);
  answer.current = onAnswer;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    // Capture phase, so Escape here does not also reach the page's own Escape handlers.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        answer.current(false);
      } else if (e.key === 'Tab') {
        // Two buttons: Tab moves between them and never leaves the dialog.
        e.preventDefault();
        (document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current)?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      opener?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night/60" onClick={() => onAnswer(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-message"
        className="relative w-full max-w-md rounded-2xl border border-fg/10 bg-bg-2 p-6 shadow-[0_24px_60px_-16px_rgba(12,12,12,0.5)]"
      >
        <p id="admin-confirm-message" className="text-[15px] leading-relaxed text-fg">
          {request.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={() => onAnswer(false)} className="pill pill--sm">
            Cancel
          </button>
          <button ref={confirmRef} type="button" onClick={() => onAnswer(true)} className="pill pill--sm pill--solid">
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
