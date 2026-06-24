import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sv-SE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityLogPage() {
  const { activityLog } = useApp();
  const { t } = useLang();

  return (
    <div>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: 30,
        color: 'var(--foreground)',
        marginBottom: 28,
      }}>
        {t('activityLogTitle')}
      </h1>

      <div style={{
        background: 'var(--card)',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        {activityLog.length === 0 ? (
          <div style={{ padding: '60px 32px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 14 }}>
            {t('noActivity')}
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>

            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['who', 'action', 'order', 'time'].map(key => (
                  <th key={key} style={{
                    padding: '13px 20px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--muted-foreground)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                  }}>
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityLog.map((entry, i) => (
                <tr key={i} style={{
                  borderBottom: i === activityLog.length - 1 ? 'none' : '1px solid var(--border)',
                }}>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                    {entry.user}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                    {entry.action}
                  </td>
                  <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                    {entry.orderId ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7FD4', background: '#6B7FD410', padding: '2px 9px', borderRadius: 6 }}>
                        {entry.orderId}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(entry.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
