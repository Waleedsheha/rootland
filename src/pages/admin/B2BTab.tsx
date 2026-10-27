import React, { useEffect, useState } from 'react';
import { B2BQuoteRequest } from '../../types';
import { DataService } from '../../services/dataService';
import { useToast } from '../../components/Toast';
import { Badge, Section, Loading, ErrorNotice, Empty, Tone, adminError, cairoTime, egp, fieldClass, selectClass, labelClass, linkClass, whatsappLink } from './ui';

type LeadStatus = NonNullable<B2BQuoteRequest['status']>;

const STATUS_TEXT: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quote sent',
  sampling: 'Sampling',
  in_production: 'In production',
  completed: 'Completed',
};

const STATUS_TONE: Record<LeadStatus, Tone> = {
  new: 'warn',
  contacted: 'neutral',
  quoted: 'neutral',
  sampling: 'neutral',
  in_production: 'neutral',
  completed: 'ok',
};

/** Bulk and uniform requests from the B2B page. */
export const B2BTab: React.FC = () => {
  const [leads, setLeads] = useState<B2BQuoteRequest[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');

  useEffect(
    () =>
      DataService.subscribeToB2BLeads(
        (list) => {
          setLeads(list);
          setState('ready');
        },
        (message) => {
          setError(message);
          setState('error');
        }
      ),
    []
  );

  const shown = leads.filter((l) => filter === 'all' || l.status === filter);
  const fresh = leads.filter((l) => l.status === 'new').length;

  return (
    <Section
      title="Requests"
      count={state === 'ready' ? shown.length : undefined}
      description={state === 'ready' ? (fresh === 1 ? '1 new request to answer.' : `${fresh} new requests to answer.`) : undefined}
      flush
      actions={
        <select value={filter} onChange={(e) => setFilter(e.target.value as LeadStatus | 'all')} aria-label="Filter requests" className={`${selectClass} !w-auto !py-2`}>
          <option value="all">All requests</option>
          {(Object.keys(STATUS_TEXT) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_TEXT[s]}
            </option>
          ))}
        </select>
      }
    >
      {state === 'loading' && <Loading label="Loading requests…" />}
      {state === 'error' && (
        <div className="px-5 py-5 sm:px-6">
          <ErrorNotice message={`Requests could not be loaded: ${error}`} />
        </div>
      )}
      {state === 'ready' && shown.length === 0 && (
        <Empty>{leads.length === 0 ? 'No bulk requests yet. Requests sent from the B2B page appear here.' : 'No requests with this status.'}</Empty>
      )}
      {state === 'ready' && shown.length > 0 && (
        <ul className="divide-y divide-fg/10">
          {shown.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </Section>
  );
};

const LeadRow: React.FC<{ lead: B2BQuoteRequest }> = ({ lead }) => {
  const { showToast } = useToast();
  const savedStatus = lead.status ?? 'new';
  const [status, setStatus] = useState<LeadStatus>(savedStatus);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);
  const changed = status !== savedStatus || notes !== (lead.notes ?? '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.id) return;
    setSaving(true);
    try {
      await DataService.updateB2BLead(lead.id, { status, notes });
      showToast('Request updated', lead.companyName, 'success');
    } catch (err) {
      showToast('Could not update the request', adminError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const details: [string, string][] = [
    ['Quantity', `${lead.estimatedQuantity.toLocaleString('en-US')} pieces`],
    ['Business', lead.businessType],
    ['Team size', lead.employeeCount],
    ['Product', lead.productType],
    ['Colours', lead.preferredColors],
    ['Branding', lead.brandingTechnique],
    ['Needed by', lead.requiredDeliveryDate],
    ['Logo artwork', lead.hasLogoArtwork ? (lead.logoFileName ? `Yes (${lead.logoFileName})` : 'Yes') : 'No'],
  ];
  if (lead.estimatedBudgetEgp !== undefined) details.push(['Budget', egp(lead.estimatedBudgetEgp)]);

  return (
    <li className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4 text-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-base font-semibold text-fg">{lead.companyName}</p>
            <Badge tone={STATUS_TONE[savedStatus]}>{STATUS_TEXT[savedStatus]}</Badge>
          </div>
          <p className="mt-1 text-body">
            {lead.contactPerson} ·{' '}
            <a href={`mailto:${lead.email}`} className={linkClass}>
              {lead.email}
            </a>{' '}
            ·{' '}
            <a
              href={whatsappLink(lead.phone, `Hi ${lead.contactPerson}, this is RootLand about your bulk request for ${lead.companyName}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={`tabular-nums ${linkClass}`}
            >
              {lead.phone}
            </a>
          </p>
          {lead.createdAt && <p className="mt-1 text-xs text-mut">Received {cairoTime(lead.createdAt)}</p>}
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-mut">{label}</dt>
                <dd className="mt-0.5 text-fg">{value}</dd>
              </div>
            ))}
        </dl>
        {lead.additionalRequirements && <p className="whitespace-pre-line rounded-xl bg-fg/[0.04] px-4 py-3 leading-relaxed text-body">{lead.additionalRequirements}</p>}
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label htmlFor={`lead-status-${lead.id}`} className={labelClass}>
            Status
          </label>
          <select id={`lead-status-${lead.id}`} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className={selectClass}>
            {(Object.keys(STATUS_TEXT) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_TEXT[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`lead-notes-${lead.id}`} className={labelClass}>
            Notes
          </label>
          <textarea id={`lead-notes-${lead.id}`} rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} />
        </div>
        <button type="submit" disabled={!changed || saving} className="pill pill--sm pill--solid">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </li>
  );
};
