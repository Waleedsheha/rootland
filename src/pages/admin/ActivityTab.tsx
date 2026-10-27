import React, { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { DataService, AuditLogRecord } from '../../services/dataService';
import { Section, Loading, ErrorNotice, Empty, adminError, cairoTime, fieldClass, thClass, tdClass } from './ui';

const LIMIT = 300;

/** Who changed what: orders, stock, products, codes, reviews, settings and staff (owner only). */
export const ActivityTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setState('loading');
    DataService.fetchAuditLogs(LIMIT)
      .then((list) => {
        setLogs(list);
        setState('ready');
      })
      .catch((err) => {
        setError(adminError(err));
        setState('error');
      });
  };
  useEffect(load, []);

  const query = search.trim().toLowerCase();
  const shown = logs.filter(
    (l) => !query || [l.actor, l.action, l.resource, l.resourceId, l.details].some((field) => field.toLowerCase().includes(query))
  );

  return (
    <Section
      title="Changes"
      count={state === 'ready' ? shown.length : undefined}
      description={`The latest ${LIMIT}, newest first.`}
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
            placeholder="Person, action or order number"
            aria-label="Filter activity"
            className={`${fieldClass} ps-10`}
          />
        </div>
      </div>
      {state === 'loading' && <Loading label="Loading activity…" />}
      {state === 'error' && (
        <div className="px-5 py-5 sm:px-6">
          <ErrorNotice message={`Activity could not be loaded: ${error}`} onRetry={load} />
        </div>
      )}
      {state === 'ready' && shown.length === 0 && <Empty>{logs.length === 0 ? 'No activity yet.' : 'Nothing matches this filter.'}</Empty>}
      {state === 'ready' && shown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fg/10">
                <th className={`${thClass} text-start`}>When</th>
                <th className={`${thClass} text-start`}>Who</th>
                <th className={`${thClass} text-start`}>What</th>
                <th className={`${thClass} text-start`}>Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/10">
              {shown.map((l) => (
                <tr key={l.id} className="align-top transition-colors duration-200 hover:bg-fg/[0.03]">
                  <td className={`${tdClass} whitespace-nowrap tabular-nums text-mut`}>{cairoTime(l.createdAt)}</td>
                  <td className={`${tdClass} text-fg`}>{l.actor}</td>
                  <td className={`${tdClass} whitespace-nowrap text-fg`}>
                    {l.action}
                    <span className="block text-xs text-mut">
                      {l.resource} · {l.resourceId}
                    </span>
                  </td>
                  <td className={`${tdClass} max-w-[48ch] break-words text-body`}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
};
