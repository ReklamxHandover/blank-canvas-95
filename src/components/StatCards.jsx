import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { Delta, DeltaIcon, DeltaValue } from '@/components/delta';

function StatCard({ label, value, delta, hint }) {
  return (
    <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="p-5">
        <div className="text-xs font-normal text-muted-foreground">{label}</div>
        <p className="mt-3 text-balance text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
      </div>
      <div
        className="flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs"
        style={{ backgroundColor: 'var(--stat-footer, #f9f9f9)' }}
      >
        {delta === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Delta value={delta} variant="default">
            <DeltaIcon />
            <DeltaValue />
          </Delta>
        )}
        <span className="text-pretty text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}

function pct(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

export default function StatCards() {
  const { orders } = useApp();
  const { t } = useLang();

  const weekAgo = Date.now() - 7 * 86400000;
  const past = orders.filter(o => new Date(o.createdAt).getTime() <= weekAgo);

  const sumInProgress = (list) =>
    list.filter(o => !o.deletedAt && !o.paid && o.price !== null)
      .reduce((s, o) => s + o.price, 0);

  const totalInProgress = sumInProgress(orders);
  const totalInProgressPast = sumInProgress(past);

  const activeCount = orders.filter(o => !o.deletedAt).length;
  const activeCountPast = past.filter(o => !o.deletedAt).length;

  const waitingPrice = orders.filter(o => !o.deletedAt && o.price === null).length;
  const waitingPricePast = past.filter(o => !o.deletedAt && o.price === null).length;

  const totalCount = orders.length;
  const totalCountPast = past.length;

  const fmt = (n) => n.toLocaleString('sv-SE') + ' kr';
  const hint = t('vsLastWeek') || 'vs last week';

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t('totalInProgress')} value={fmt(totalInProgress)} delta={pct(totalInProgress, totalInProgressPast)} hint={hint} />
      <StatCard label={t('activeOrders')} value={activeCount} delta={pct(activeCount, activeCountPast)} hint={hint} />
      <StatCard label={t('waitingPriceCard')} value={waitingPrice} delta={pct(waitingPrice, waitingPricePast)} hint={hint} />
      <StatCard label={t('totalOrders')} value={totalCount} delta={pct(totalCount, totalCountPast)} hint={hint} />
    </div>
  );
}
