import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { RotateCcw, Info } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BinView() {
  const { orders, restoreOrder, getClient } = useApp();
  const { t } = useLang();

  const deletedOrders = orders.filter(o => o.deletedAt !== null);

  return (
    <div>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: 30,
        color: 'var(--foreground)',
        marginBottom: 20,
      }}>
        {t('binTitle')}
      </h1>

      {/* Permanent note */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 16px',
        background: 'var(--muted)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: 28,
      }}>
        <Info size={15} color="#b0b8c4" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
          {t('binNote')}
        </p>
      </div>

      {deletedOrders.length === 0 ? (
        <div style={{
          background: 'var(--card)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border)',
          padding: '60px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: 6 }}>{t('emptyBin')}</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{t('emptyBinDesc')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deletedOrders.map(order => {
            const client = getClient(order.clientId);
            return (
              <div key={order.id} style={{
                background: 'var(--card)',
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7FD4', whiteSpace: 'nowrap' }}>
                    {order.id}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
                      {client?.companyName || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                      {order.products.map(p => p.name).join(', ')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500 }}>{t('movedToBin')}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{formatDate(order.deletedAt)}</div>
                  </div>
                  <button
                    onClick={() => restoreOrder(order.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '9px 18px',
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 13, fontWeight: 500,
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--muted)'}
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    {t('restore')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
