import React, { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { DataService, CustomerAccount } from '../../services/dataService';
import { Section, Loading, ErrorNotice, Empty, adminError, cairoTime, egp, fieldClass, linkClass, thClass, tdClass, whatsappLink } from './ui';

/** Registered customer accounts with sign-in details and what they ordered (guest orders are in Orders). */
export const CustomersTab: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setState('loading');
    DataService.fetchCustomers()
      .then((list) => {
        setCustomers(list);
        setState('ready');
      })
      .catch((err) => {
        setError(adminError(err));
        setState('error');
      });
  };

  useEffect(load, []);

  const query = search.trim().toLowerCase();
  const filtered = customers.filter(
    (c) => !query || c.email.toLowerCase().includes(query) || c.fullName.toLowerCase().includes(query) || (c.phone !== undefined && c.phone.includes(query))
  );

  return (
    <Section
      title="Customer accounts"
      count={customers.length}
      description="Spent counts every order except cancelled, refused and returned ones."
      flush
      actions={
        <button type="button" onClick={load} disabled={state === 'loading'} className="pill pill--sm">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      }
    >
      <div className="border-b border-fg/10 px-5 py-4 sm:px-6">
        <div className="relative max-w-md">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mut" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or phone"
            aria-label="Search customers"
            className={`${fieldClass} ps-10`}
          />
        </div>
      </div>

      {state === 'loading' && <Loading label="Loading customers…" />}
      {state === 'error' && (
        <div className="px-5 py-5 sm:px-6">
          <ErrorNotice message={`Customers could not be loaded: ${error}`} onRetry={load} />
        </div>
      )}
      {state === 'ready' && customers.length === 0 && <Empty>No customer accounts yet. Accounts appear here as soon as someone signs up on the store.</Empty>}
      {state === 'ready' && customers.length > 0 && filtered.length === 0 && <Empty>No customer matches “{search}”.</Empty>}
      {state === 'ready' && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fg/10">
                <th className={`${thClass} text-start`}>Customer</th>
                <th className={`${thClass} text-start`}>Phone</th>
                <th className={`${thClass} text-start`}>Joined</th>
                <th className={`${thClass} text-start`}>Last sign-in</th>
                <th className={`${thClass} text-end`}>Orders</th>
                <th className={`${thClass} text-end`}>Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/10">
              {filtered.map((c) => (
                <tr key={c.id} className="align-top transition-colors duration-200 hover:bg-fg/[0.03]">
                  <td className={tdClass}>
                    <div className="font-medium text-fg">{c.fullName || 'No name given'}</div>
                    <a href={`mailto:${c.email}`} className={`text-mut ${linkClass}`}>
                      {c.email}
                    </a>
                    {!c.emailConfirmedAt && <div className="mt-1 text-xs text-warn">Email not confirmed</div>}
                  </td>
                  <td className={tdClass}>
                    {c.phone ? (
                      <a
                        href={whatsappLink(c.phone, `Hi ${c.fullName}, this is RootLand.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`whitespace-nowrap tabular-nums text-fg ${linkClass}`}
                      >
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-mut">Not given</span>
                    )}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-body`}>{cairoTime(c.createdAt)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-body`}>{c.lastSignInAt ? cairoTime(c.lastSignInAt) : 'Never'}</td>
                  <td className={`${tdClass} text-end tabular-nums text-fg`}>{c.orderCount}</td>
                  <td className={`${tdClass} whitespace-nowrap text-end font-medium tabular-nums text-fg`}>{egp(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
};
