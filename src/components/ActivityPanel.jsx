import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '<1m';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export default function ActivityPanel() {
  const { activityLog } = useApp();
  const { t } = useLang();

  return (
    <aside style={{
      width: 260,
      background: '#ffffff',
      borderLeft: '1px solid #f0ede8',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflowY: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 18px 12px',
        borderBottom: '1px solid #f0ede8',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', letterSpacing: '0.03em' }}>
          {t('activityPanel')}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {activityLog.length === 0 ? (
          <div style={{ padding: '24px 18px', fontSize: 13, color: '#b0b8c4' }}>
            {t('noActivity')}
          </div>
        ) : (
          activityLog.slice(0, 60).map((entry, i) => (
            <div key={i} style={{
              padding: '10px 18px',
              borderBottom: '1px solid #f5f3f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>
                  {entry.user}
                </span>
                <span style={{ fontSize: 11, color: '#b0b8c4', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#7a8394', lineHeight: 1.5, marginBottom: 2 }}>
                {entry.action}
              </div>
              {entry.orderId && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#6B7FD4',
                  background: '#6B7FD410', padding: '1px 7px', borderRadius: 6,
                }}>
                  {entry.orderId}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
