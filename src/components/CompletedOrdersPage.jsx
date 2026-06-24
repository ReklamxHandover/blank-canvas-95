import { useLang } from '../context/LanguageContext.jsx';
import OrdersPage from './OrdersPage.jsx';
import { Info } from 'lucide-react';

export default function CompletedOrdersPage() {
  const { t } = useLang();
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        background: 'var(--muted)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: 20,
      }}>
        <Info size={15} color="#b0b8c4" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
          {t('completedOrdersNote')}
        </p>
      </div>
      <OrdersPage scope="completed" />
    </div>
  );
}
