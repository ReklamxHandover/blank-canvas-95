import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import StatCards from './StatCards.jsx';
import FilterBar from './FilterBar.jsx';
import OrderTable from './OrderTable.jsx';
import DesignerView from './DesignerView.jsx';
import ProducerView from './ProducerView.jsx';
import { Search } from 'lucide-react';

export default function OrdersPage({ scope = 'offers' }) {
  const { currentUser, searchQuery, setSearchQuery, getFilteredOrders } = useApp();
  const { t } = useLang();
  const role = currentUser.role;

  if (role === 'designer') return <DesignerView />;
  if (role === 'producer') return <ProducerView />;

  const isOwner = role === 'owner';
  const filteredOrders = getFilteredOrders(scope);
  const readOnly = scope === 'completed';

  const title =
    scope === 'orders' ? t('ongoingOrders') :
    scope === 'completed' ? t('completedOrders') :
    null;

  return (
    <div>
      {scope === 'offers' && <StatCards />}

      {title && (
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 30,
          color: 'var(--foreground)',
          marginBottom: 20,
        }}>
          {title}
        </h1>
      )}

      {/* Search */}
      <div className="relative" style={{ marginBottom: isOwner && scope === 'offers' ? 12 : 20 }}>
        <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('searchOrders')}
          className="w-full rounded-[10px] border border-border bg-card text-foreground placeholder:text-muted-foreground py-2.5 pr-3.5 pl-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Owner filter bar — only on Offerter */}
      {isOwner && scope === 'offers' && <FilterBar />}

      {/* Table */}
      <OrderTable orders={filteredOrders} readOnly={readOnly} />
    </div>
  );
}
