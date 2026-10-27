import React, { useEffect, useState } from 'react';
import { DataService, StaffMember, StaffRole } from '../../services/dataService';
import { ROLE_TABS } from '../../services/authService';
import { useToast } from '../../components/Toast';
import { Section, Loading, ErrorNotice, Empty, adminError, cairoTime, fieldClass, selectClass, labelClass, useConfirm } from './ui';

/** The database keeps this account an owner; it cannot be demoted or removed. */
const MAIN_OWNER = 'rootland.store@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'Owner',
  ORDERS: 'Orders team',
  CONTENT: 'Content team',
  MARKETING: 'Marketing team',
};

const ROLE_SCOPE: Record<StaffRole, string> = {
  OWNER: 'Everything, including store settings, staff and the activity log.',
  ORDERS: 'Dashboard, orders (status, courier, notes) and customer accounts.',
  CONTENT: 'Products, inventory, reviews and storefront text.',
  MARKETING: 'Dashboard, discount codes, bulk requests and storefront text.',
};

const ROLES = Object.keys(ROLE_TABS) as StaffRole[];

export const StaffTab: React.FC<{ currentEmail: string }> = ({ currentEmail }) => {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('ORDERS');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  useEffect(
    () =>
      DataService.subscribeToStaff(
        (list) => {
          setStaff(list);
          setState('ready');
        },
        (message) => {
          setLoadError(message);
          setState('error');
        }
      ),
    []
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setFormError('Enter the email address the person signs in with.');
    if (staff.some((s) => s.email === clean)) return setFormError(`${clean} already has access. Change the role in the list instead.`);
    setAdding(true);
    try {
      await DataService.addStaff(clean, role, currentEmail);
      setEmail('');
      showToast('Access added', `${clean} · ${ROLE_LABEL[role]}`, 'success');
    } catch (err) {
      setFormError(adminError(err));
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (member: StaffMember, next: StaffRole) => {
    if (
      member.email === currentEmail &&
      next !== 'OWNER' &&
      !(await confirmAction('Change your own role? You will lose owner access straight away.', 'Change my role'))
    ) {
      return;
    }
    setBusyEmail(member.email);
    try {
      await DataService.updateStaffRole(member.email, next);
      showToast('Role changed', `${member.email} · ${ROLE_LABEL[next]}`, 'success');
    } catch (err) {
      showToast('Could not change the role', adminError(err), 'error');
    } finally {
      setBusyEmail(null);
    }
  };

  const remove = async (member: StaffMember) => {
    const question =
      member.email === currentEmail ? 'Remove your own staff access? You will be locked out of the admin.' : `Remove admin access for ${member.email}? Their customer account stays.`;
    if (!(await confirmAction(question, 'Remove access'))) return;
    setBusyEmail(member.email);
    try {
      await DataService.removeStaff(member.email);
      showToast('Access removed', member.email, 'info');
    } catch (err) {
      showToast('Could not remove access', adminError(err), 'error');
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
      <Section title="Give someone access" description="Access only counts for confirmed email addresses." className="xl:sticky xl:top-6">
        <form onSubmit={handleAdd} className="space-y-4" noValidate>
          <div>
            <label htmlFor="staff-email" className={labelClass}>
              Email
            </label>
            <input id="staff-email" type="email" dir="ltr" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="staff-role" className={labelClass}>
              Role
            </label>
            <select id="staff-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={selectClass}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-mut">{ROLE_SCOPE[role]}</p>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-err">
              {formError}
            </p>
          )}
          <button type="submit" disabled={adding} className="pill pill--solid">
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        <div className="space-y-2 border-t border-fg/10 pt-5 text-[13px] leading-relaxed text-body">
          <p>
            The person signs in on the store with this email, the way customers do, or creates an account with it first and confirms the address. Once they
            are signed in, an Admin button appears in the store’s header; if they were already signed in, they reload the page.
          </p>
          <p>Because access needs a confirmed address, nobody can claim a staff email they do not own.</p>
        </div>
      </Section>

      <Section title="Staff" count={state === 'ready' ? staff.length : undefined} flush>
        {state === 'loading' && <Loading label="Loading staff…" />}
        {state === 'error' && (
          <div className="px-5 py-5 sm:px-6">
            <ErrorNotice message={`Staff could not be loaded: ${loadError}`} />
          </div>
        )}
        {state === 'ready' && staff.length === 0 && <Empty>No staff yet.</Empty>}
        {state === 'ready' && staff.length > 0 && (
          <ul className="divide-y divide-fg/10">
            {staff.map((member) => {
              const locked = member.email === MAIN_OWNER;
              return (
                <li key={member.email} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fg/[0.08] text-sm font-semibold uppercase text-fg"
                    >
                      {member.email.charAt(0)}
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="truncate text-fg">
                        {member.email}
                        {member.email === currentEmail && <span className="text-mut"> (you)</span>}
                      </p>
                      <p className="text-xs text-mut">
                        Added by {member.addedBy} · {cairoTime(member.createdAt)}
                        {locked ? ' · main owner, always an owner' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      disabled={locked || busyEmail === member.email}
                      onChange={(e) => changeRole(member, e.target.value as StaffRole)}
                      aria-label={`Role for ${member.email}`}
                      className={`${selectClass} !w-auto !py-2`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => remove(member)} disabled={locked || busyEmail === member.email} className="pill pill--sm pill--danger">
                      Remove
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
