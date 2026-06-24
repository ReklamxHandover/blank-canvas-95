import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import PipelineDots from './PipelineDots.jsx';
import { Send } from 'lucide-react';
import { deadlineRowTint, isOrderOverdue, daysUntilDeadline, deadlinePillColor } from '../lib/deadline';
import { countCompleteItems } from './ProductionChecklist.jsx';


function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPrice(price, t) {
  if (price === null || price === undefined) return (
    <span style={{ color: '#E8A838', fontWeight: 600, fontSize: 12 }}>{t('noPrice')}</span>
  );
  return (
    <span style={{ fontWeight: 600, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
      {price.toLocaleString('sv-SE')} {t('kr')}
    </span>
  );
}

export default function OrderTable({ orders, readOnly = false }) {
  const { setSelectedOrderId, setSelectedClientId, getClient, currentUser, updatePipelineStage } = useApp();
  const { t } = useLang();
  const role = currentUser.role;
  const isStaff = role === 'staff' && !readOnly;

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card px-8 py-16 text-center shadow-sm">
        <div className="text-base font-medium text-muted-foreground">{t('noOrders')}</div>
        <div className="mt-1.5 text-sm text-muted-foreground/70">{t('noOrdersDesc')}</div>
      </div>
    );
  }

  const handleSendToDesigner = (e, orderId) => {
    e.stopPropagation();
    updatePipelineStage(orderId, 'design', 'active', '');
  };

  const columns = [
    { key: 'orderId', width: 100 },
    { key: 'client', width: 170 },
    { key: 'product', width: 'auto' },
    { key: 'pipeline', width: 340 },
    { key: 'price', width: 120 },
    { key: 'deadline', width: 130 },
    { key: 'created', width: 110 },
  ];
  if (isStaff) columns.push({ key: '', width: 180, raw: true });


  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>

        <thead>
          <tr className="border-b border-border">
            {columns.map(({ key, width, raw }, i) => (
              <th key={key || `c${i}`} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                style={{ width: width !== 'auto' ? width : undefined }}>
                {key && !raw ? t(key) : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => {
            const client = getClient(order.clientId);
            const productNames = order.products.map(p => p.name).join(', ');
            const isLast = idx === orders.length - 1;

            const canSendToDesigner = isStaff
              && order.pipeline.forhandling?.status === 'pris_godkant'
              && order.pipeline.design?.status === 'not_started';
            const readyForInvoicing = isStaff && order.pipeline.faktura?.status === 'active';

            const overdue = readOnly ? false : isOrderOverdue(order);
            const tint = readOnly
              ? { bg: 'var(--row-deadline-green)', hoverBg: 'var(--row-deadline-green-hover)' }
              : deadlineRowTint(order.deadline);

            // Row color priority: ready-for-invoicing keeps its existing amber band.
            // Otherwise, use the deadline gradient tint when a deadline exists.
            let baseBg = 'transparent';
            let hoverBg = 'var(--accent)';
            if (readyForInvoicing) {
              baseBg = '#FFF8E8';
              hoverBg = '#FFF1D0';
            } else if (tint) {
              baseBg = tint.bg;
              hoverBg = tint.hoverBg;
            }

            const days = daysUntilDeadline(order.deadline);
            const deadlineLabel = order.deadline ? formatDate(order.deadline) : '—';
            const isOrder = order.pipeline.forhandling?.status === 'pris_godkant';
            const pillColor = isOrder ? (readOnly ? '#2d8a4a' : deadlinePillColor(order.deadline)) : null;
            const idColor = 'var(--foreground)';

            return (
              <tr
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                  background: baseBg,
                  opacity: readOnly ? 0.75 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = baseBg}
              >
                <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 800, color: idColor, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {order.id}
                    {isOrder && (
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: pillColor,
                        flexShrink: 0,
                      }} />
                    )}
                    {order.manufacturer === 'ReklamX' && (() => {
                      const total = (order.products || []).length;
                      const done = countCompleteItems(order.products);
                      const complete = done === total && total > 0;
                      return (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: complete ? 'var(--checklist-pill-done-fg)' : 'var(--checklist-pill-fg)',
                          background: complete ? 'var(--checklist-pill-done-bg)' : 'var(--checklist-pill-bg)',
                          padding: '2px 7px', borderRadius: 10,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {done}/{total}
                        </span>
                      );
                    })()}
                  </div>
                </td>


                <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--foreground)', maxWidth: 170 }}>
                  {client ? (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelectedClientId(client.id); }}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontWeight: 500, color: 'var(--foreground)', textAlign: 'left',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: 170, fontFamily: 'inherit', fontSize: 13,
                      }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {client.companyName || '—'}
                    </button>
                  ) : (
                    <div style={{ fontWeight: 500 }}>—</div>
                  )}
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted-foreground)', minWidth: 120 }}>
                  <div style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}>
                    {productNames}
                  </div>
                </td>
                <td style={{ padding: '10px 20px' }} onClick={e => e.stopPropagation()}>
                  <PipelineDots order={order} overdue={overdue} />
                </td>
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                  {formatPrice(order.price, t)}
                </td>
                <td style={{ padding: '14px 20px', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {order.deadline ? (
                    <div>
                      <div style={{ color: overdue ? '#B94B4B' : 'var(--foreground)', fontWeight: overdue ? 600 : 500 }}>
                        {deadlineLabel}
                      </div>
                      <div style={{ color: overdue ? '#B94B4B' : '#7a8394', fontSize: 11, marginTop: 2 }}>
                        {days < 0
                          ? `${Math.abs(days)} ${t('daysOverdue')}`
                          : days === 0
                            ? t('dueToday')
                            : `${days} ${t('daysLeft')}`}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--muted-foreground)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                  {formatDate(order.createdAt)}
                </td>

                {isStaff && (
                  <td style={{ padding: '10px 20px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    {canSendToDesigner ? (
                      <button
                        onClick={(e) => handleSendToDesigner(e, order.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px',
                          background: '#ffffff',
                          border: 'none', borderRadius: 8,
                          color: '#000000', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Send size={12} strokeWidth={2.2} />
                        {t('sendToDesigner')}
                      </button>
                    ) : readyForInvoicing ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: '#E8A83820',
                        color: '#c47d1a',
                        borderRadius: 8,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {t('readyForInvoicing')}
                      </span>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
