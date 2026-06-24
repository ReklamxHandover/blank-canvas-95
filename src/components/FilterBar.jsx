import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILTERS = [
  { id: 'waitingDesign', labelKey: 'waitingDesign' },
  { id: 'waitingProduction', labelKey: 'waitingProduction' },
  { id: 'waitingPrice', labelKey: 'waitingPriceFilter' },
  { id: 'notInvoiced', labelKey: 'notInvoiced' },
  { id: 'unpaidInvoice', labelKey: 'unpaidInvoice' },
  { id: 'needsAttention', labelKey: 'needsAttentionFilter' },
];

export default function FilterBar() {
  const { activeFilters, toggleFilter, clearFilters } = useApp();
  const { t } = useLang();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {FILTERS.map(({ id, labelKey }) => {
        const isActive = activeFilters.has(id);
        return (
          <button
            key={id}
            onClick={() => toggleFilter(id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
              isActive
                ? 'border-primary bg-primary/10 font-semibold text-primary'
                : 'border-border bg-card font-medium text-muted-foreground hover:bg-accent'
            )}
          >
            {t(labelKey)}
          </button>
        );
      })}

      {activeFilters.size > 0 && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          <X size={12} strokeWidth={2} />
          {t('clearFilters')}
        </button>
      )}
    </div>
  );
}
