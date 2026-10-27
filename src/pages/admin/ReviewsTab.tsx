import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Product, Review } from '../../types';
import { DataService } from '../../services/dataService';
import { useToast } from '../../components/Toast';
import { Badge, Section, Segmented, Loading, ErrorNotice, Empty, adminError, cairoTime, useConfirm } from './ui';

type Filter = 'waiting' | 'published' | 'all';

/** The rating as five drawn stars. */
function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} of 5`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          strokeWidth={1.75}
          className={`h-3.5 w-3.5 ${n <= rating ? 'text-accent' : 'text-fg/25'}`}
          fill={n <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

/** Customer reviews arrive hidden; publishing shows them on the product page and the homepage. */
export const ReviewsTab: React.FC<{ products: Product[] }> = ({ products }) => {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('waiting');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(
    () =>
      DataService.subscribeToAllReviews(
        (list) => {
          setReviews(list);
          setState('ready');
        },
        (message) => {
          setError(message);
          setState('error');
        }
      ),
    []
  );

  const productName = (id: string) => {
    const p = products.find((x) => x.id === id);
    return p ? p.nameEn || p.name : id;
  };
  const waiting = reviews.filter((r) => !r.published).length;
  const shown = reviews.filter((r) => (filter === 'all' ? true : filter === 'published' ? r.published : !r.published));

  const togglePublished = async (r: Review) => {
    setBusyId(r.id);
    try {
      await DataService.setReviewPublished(r.id, !r.published);
      showToast(r.published ? 'Review hidden' : 'Review published', r.authorName, 'success');
    } catch (err) {
      showToast('Could not change the review', adminError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: Review) => {
    if (!(await confirmAction(`Delete the review by ${r.authorName}? This cannot be undone.`, 'Delete review'))) return;
    setBusyId(r.id);
    try {
      await DataService.deleteReview(r.id);
      showToast('Review deleted', r.authorName, 'info');
    } catch (err) {
      showToast('Could not delete the review', adminError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Section
      title="Customer reviews"
      count={state === 'ready' ? shown.length : undefined}
      flush
      actions={
        <Segmented
          label="Show reviews"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'waiting', label: state === 'ready' ? `Waiting (${waiting})` : 'Waiting' },
            { value: 'published', label: 'Published' },
            { value: 'all', label: 'All' },
          ]}
        />
      }
    >
      {state === 'loading' && <Loading label="Loading reviews…" />}
      {state === 'error' && (
        <div className="px-5 py-5 sm:px-6">
          <ErrorNotice message={`Reviews could not be loaded: ${error}`} />
        </div>
      )}
      {state === 'ready' && shown.length === 0 && (
        <Empty>
          {filter === 'waiting'
            ? 'No reviews are waiting for approval. New ones appear here, hidden, until you publish them.'
            : filter === 'published'
              ? 'No published reviews yet.'
              : 'No reviews yet.'}
        </Empty>
      )}
      {state === 'ready' && shown.length > 0 && (
        <ul className="divide-y divide-fg/10">
          {shown.map((r) => (
            <li key={r.id} className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Stars rating={r.rating} />
                  <span className="text-body">
                    {productName(r.productId)} {r.sizePurchased && `· size ${r.sizePurchased}`} · {r.fitVote}
                  </span>
                </div>
                {r.title && <p className="font-semibold text-fg">{r.title}</p>}
                <p className="max-w-[75ch] whitespace-pre-line text-sm leading-relaxed text-body">{r.comment}</p>
                <p className="text-xs text-mut">
                  {r.authorName}
                  {r.location && ` · ${r.location}`} · {cairoTime(r.createdAt)} ·{' '}
                  {r.verifiedBuyer ? <span className="text-ok">Verified buyer (delivered order)</span> : 'Not linked to a delivered order'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                <Badge tone={r.published ? 'ok' : 'warn'}>{r.published ? 'Published' : 'Waiting'}</Badge>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => togglePublished(r)}
                    disabled={busyId === r.id}
                    className={`pill pill--sm ${r.published ? '' : 'pill--solid'}`}
                  >
                    {r.published ? 'Hide' : 'Publish'}
                  </button>
                  <button type="button" onClick={() => remove(r)} disabled={busyId === r.id} className="pill pill--sm pill--danger">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};
