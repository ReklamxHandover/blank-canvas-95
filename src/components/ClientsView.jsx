import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

export default function ClientsView() {
  const { clients, orders, setSelectedClientId } = useApp();
  const { t } = useLang();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const counts = new Map();
    orders.forEach(o => {
      if (o.deletedAt) return;
      counts.set(o.clientId, (counts.get(o.clientId) || 0) + 1);
    });
    const needle = q.trim().toLowerCase();
    return [...clients]
      .filter(c => {
        if (!needle) return true;
        return (
          (c.companyName || '').toLowerCase().includes(needle) ||
          (c.contactPerson || '').toLowerCase().includes(needle) ||
          (c.email || '').toLowerCase().includes(needle) ||
          String(c.kundnr || '').includes(needle)
        );
      })
      .sort((a, b) => (a.companyName || '').localeCompare(b.companyName || '', 'sv'))
      .map(c => ({ ...c, orderCount: counts.get(c.id) || 0 }));
  }, [clients, orders, q]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{t('clientsTitle')}</h1>
        <input
          type="text"
          placeholder={t('searchClient')}
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full sm:w-[300px]"
          style={{
            padding: '8px 12px', fontSize: 13,
            border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)',
          }}
        />
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>

          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={th}>{t('kundnrLabel')}</th>
              <th style={th}>{t('companyName')}</th>
              <th style={th}>{t('contactPerson')}</th>
              <th style={th}>{t('phone')}</th>
              <th style={th}>{t('email')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('orderHistory')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>—</td></tr>
            )}
            {rows.map((c, idx) => (
              <tr
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                style={{
                  borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ ...td, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{c.kundnr ?? '—'}</td>
                <td style={{ ...td, fontWeight: 600, color: 'var(--foreground)' }}>{c.companyName || '—'}</td>
                <td style={td}>{c.contactPerson || '—'}</td>
                <td style={td}>{c.phone || '—'}</td>
                <td style={td}>{c.email || '—'}</td>
                <td style={{ ...td, textAlign: 'right', color: 'var(--muted-foreground)' }}>{c.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' };
const td = { padding: '14px 20px', fontSize: 13, color: 'var(--foreground)' };
