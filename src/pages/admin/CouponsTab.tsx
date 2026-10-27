import React, { useEffect, useState } from 'react';
import { CouponItem } from '../../types';
import { DataService } from '../../services/dataService';
import { useToast } from '../../components/Toast';
import { Badge, Section, Loading, ErrorNotice, Empty, Tone, adminError, cairoTime, egp, fieldClass, selectClass, labelClass, useConfirm } from './ui';

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

/** "2026-10-26T14:05" in this browser's time zone, for a datetime-local input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ruleText(c: CouponItem): string {
  const parts = [c.discountType === 'percentage' ? `${c.discountValue}% off` : `${egp(c.discountValue)} off`];
  if (c.minOrderAmount > 0) parts.push(`orders from ${egp(c.minOrderAmount)}`);
  if (c.freeShipping) parts.push('free delivery');
  if (c.oneUsePerCustomer) parts.push('once per customer');
  return parts.join(' · ');
}

interface FormState {
  code: string;
  discountType: CouponItem['discountType'];
  discountValue: string;
  minOrderAmount: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  oneUsePerCustomer: boolean;
  freeShipping: boolean;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '0',
  startDate: '',
  endDate: '',
  usageLimit: '',
  oneUsePerCustomer: false,
  freeShipping: false,
  active: true,
};

export const CouponsTab: React.FC = () => {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  useEffect(
    () =>
      DataService.subscribeToCoupons(
        (list) => {
          setCoupons(list);
          setState('ready');
        },
        (message) => {
          setLoadError(message);
          setState('error');
        }
      ),
    []
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const startEdit = (c: CouponItem) => {
    setEditingCode(c.code);
    setFormError(null);
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      startDate: c.startDate ? toLocalInput(c.startDate) : '',
      endDate: c.endDate ? toLocalInput(c.endDate) : '',
      usageLimit: c.usageLimit !== undefined ? String(c.usageLimit) : '',
      oneUsePerCustomer: c.oneUsePerCustomer,
      freeShipping: c.freeShipping,
      active: c.active,
    });
  };

  const resetForm = () => {
    setEditingCode(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discountValue);
    const minOrder = Number(form.minOrderAmount);
    const limit = form.usageLimit.trim() === '' ? undefined : Number(form.usageLimit);
    const start = form.startDate ? new Date(form.startDate).toISOString() : undefined;
    const end = form.endDate ? new Date(form.endDate).toISOString() : undefined;

    if (!CODE_RE.test(code)) return setFormError('The code needs 3 to 32 letters, digits, - or _.');
    if (!editingCode && coupons.some((c) => c.code === code)) return setFormError(`${code} already exists. Edit it in the list instead.`);
    if (!Number.isInteger(value) || value <= 0) return setFormError('The discount must be a whole number above 0.');
    if (form.discountType === 'percentage' && value > 100) return setFormError('A percentage discount cannot be above 100.');
    if (!Number.isInteger(minOrder) || minOrder < 0) return setFormError('The minimum order must be a whole number of pounds (0 for none).');
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) return setFormError('The usage limit must be a whole number above 0, or empty for no limit.');
    if (start && end && end <= start) return setFormError('The end date must be after the start date.');

    setSaving(true);
    try {
      await DataService.saveCoupon({
        code,
        discountType: form.discountType,
        discountValue: value,
        minOrderAmount: minOrder,
        startDate: start,
        endDate: end,
        usageLimit: limit,
        oneUsePerCustomer: form.oneUsePerCustomer,
        freeShipping: form.freeShipping,
        active: form.active,
      });
      showToast(editingCode ? 'Code updated' : 'Code created', code, 'success');
      resetForm();
    } catch (err) {
      setFormError(adminError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: CouponItem) => {
    setBusyCode(c.code);
    try {
      await DataService.setCouponActive(c.code, !c.active);
      showToast(c.active ? 'Code paused' : 'Code active', c.code, 'success');
    } catch (err) {
      showToast('Could not change the code', adminError(err), 'error');
    } finally {
      setBusyCode(null);
    }
  };

  const remove = async (c: CouponItem) => {
    if (!(await confirmAction(`Delete ${c.code}? Orders that used it keep their discount.`, 'Delete code'))) return;
    setBusyCode(c.code);
    try {
      await DataService.deleteCoupon(c.code);
      if (editingCode === c.code) resetForm();
      showToast('Code deleted', c.code, 'info');
    } catch (err) {
      showToast('Could not delete the code', adminError(err), 'error');
    } finally {
      setBusyCode(null);
    }
  };

  const now = new Date().toISOString();
  const validity = (c: CouponItem): { text: string; tone: Tone } => {
    if (!c.active) return { text: 'Paused', tone: 'neutral' };
    if (c.startDate && c.startDate > now) return { text: `Starts ${cairoTime(c.startDate)}`, tone: 'warn' };
    if (c.endDate && c.endDate <= now) return { text: `Ended ${cairoTime(c.endDate)}`, tone: 'err' };
    if (c.usageLimit !== undefined && c.usageCount >= c.usageLimit) return { text: 'Used up', tone: 'err' };
    return { text: c.endDate ? `Active until ${cairoTime(c.endDate)}` : 'Active', tone: 'ok' };
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Section
        title={editingCode ? `Edit ${editingCode}` : 'New discount code'}
        description="The discount applies to the items, not to delivery."
        className="xl:sticky xl:top-6"
      >
        <form onSubmit={handleSave} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="c-code" className={labelClass}>
                Code
              </label>
              <input
                id="c-code"
                value={form.code}
                disabled={Boolean(editingCode)}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                autoCapitalize="characters"
                className={`${fieldClass} font-semibold uppercase tracking-[0.04em]`}
              />
            </div>
            <div>
              <label htmlFor="c-type" className={labelClass}>
                Type
              </label>
              <select id="c-type" value={form.discountType} onChange={(e) => set('discountType', e.target.value as CouponItem['discountType'])} className={selectClass}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount (EGP)</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-value" className={labelClass}>
                {form.discountType === 'percentage' ? 'Percent off' : 'EGP off'}
              </label>
              <input id="c-value" type="number" min={1} step={1} inputMode="numeric" value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="c-min" className={labelClass}>
                Minimum order (EGP)
              </label>
              <input id="c-min" type="number" min={0} step={1} inputMode="numeric" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="c-limit" className={labelClass}>
                Total uses (empty for no limit)
              </label>
              <input id="c-limit" type="number" min={1} step={1} inputMode="numeric" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="c-start" className={labelClass}>
                Starts (optional)
              </label>
              <input id="c-start" type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="c-end" className={labelClass}>
                Ends (optional)
              </label>
              <input id="c-end" type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={fieldClass} />
            </div>
          </div>
          <div className="space-y-2.5 text-sm text-body">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.oneUsePerCustomer} onChange={(e) => set('oneUsePerCustomer', e.target.checked)} className="accent-fg" />
              Once per customer (checked by mobile number and account)
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.freeShipping} onChange={(e) => set('freeShipping', e.target.checked)} className="accent-fg" />
              Free delivery
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="accent-fg" />
              Active
            </label>
          </div>
          <p className="text-xs text-mut">Dates use this computer’s time zone.</p>
          {formError && (
            <p role="alert" className="text-sm text-err">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="pill pill--solid">
              {saving ? 'Saving…' : editingCode ? 'Save changes' : 'Create code'}
            </button>
            {editingCode && (
              <button type="button" onClick={resetForm} className="pill">
                Cancel
              </button>
            )}
          </div>
        </form>
      </Section>

      <Section title="Discount codes" count={state === 'ready' ? coupons.length : undefined} flush>
        {state === 'loading' && <Loading label="Loading codes…" />}
        {state === 'error' && (
          <div className="px-5 py-5 sm:px-6">
            <ErrorNotice message={`Codes could not be loaded: ${loadError}`} />
          </div>
        )}
        {state === 'ready' && coupons.length === 0 && <Empty>No discount codes yet. Create one with the form; customers type it at checkout.</Empty>}
        {state === 'ready' && coupons.length > 0 && (
          <ul className="divide-y divide-fg/10">
            {coupons.map((c) => {
              const v = validity(c);
              return (
                <li
                  key={c.code}
                  className={`grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 ${editingCode === c.code ? 'bg-fg/[0.06]' : ''}`}
                >
                  <div className="min-w-0 space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-semibold tracking-[0.04em] text-fg">{c.code}</p>
                      <Badge tone={v.tone}>{v.text}</Badge>
                    </div>
                    <p className="text-body">{ruleText(c)}</p>
                    <p className="text-xs text-mut">
                      Used {c.usageCount}
                      {c.usageLimit !== undefined ? ` of ${c.usageLimit}` : ''} times
                      {c.startDate && c.startDate <= now ? ` · started ${cairoTime(c.startDate)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button type="button" onClick={() => startEdit(c)} className="pill pill--sm">
                      Edit
                    </button>
                    <button type="button" onClick={() => toggleActive(c)} disabled={busyCode === c.code} className="pill pill--sm">
                      {c.active ? 'Pause' : 'Activate'}
                    </button>
                    <button type="button" onClick={() => remove(c)} disabled={busyCode === c.code} className="pill pill--sm pill--danger">
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
};
