import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

const FIELDS = [
  { key: 'company_name', labelKey: 'companyName' },
  { key: 'logo_url', labelKey: 'logoUrlLabel' },
  { key: 'address', labelKey: 'addressLabel' },
  { key: 'phone', labelKey: 'phone' },
  { key: 'email', labelKey: 'email' },
  { key: 'bankgiro', labelKey: 'bankgiroLabel' },
  { key: 'org_number', labelKey: 'orgNumber' },
  { key: 'momsreg', labelKey: 'momsregLabel' },
];

export default function BusinessSettingsView() {
  const { currentUser } = useApp();
  const { t } = useLang();
  const isOwner = currentUser?.role === 'owner';

  const [row, setRow] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('id', 1).maybeSingle();
      setRow(data || { id: 1, ...Object.fromEntries(FIELDS.map(f => [f.key, ''])) });
    })();
  }, []);

  if (!isOwner) return null;
  if (!row) return <div style={{ color: '#7a8394' }}>…</div>;

  const saveField = async (key, value) => {
    setSavingKey(key);
    setStatus('');
    const patch = { [key]: value, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('business_settings')
      .upsert({ id: 1, ...row, ...patch }, { onConflict: 'id' });
    setSavingKey(null);
    if (error) {
      setStatus(error.message);
    } else {
      setStatus(t('saved'));
      setTimeout(() => setStatus(''), 1500);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
          {t('businessSettings')}
        </h1>
        {status && <span style={{ fontSize: 12, color: '#4CAF88', fontWeight: 600 }}>{status}</span>}
      </div>

      <div className="responsive-business-card" style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: 28, maxWidth: 720,
      }}>
        {row.logo_url && (
          <div style={{ marginBottom: 24 }}>
            <div style={labelStyle}>{t('logoPreview')}</div>
            <img
              src={row.logo_url}
              alt="logo"
              style={{ maxHeight: 60, maxWidth: 220, marginTop: 6, objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          {FIELDS.map(({ key, labelKey }) => (
            <div key={key} style={key === 'address' || key === 'logo_url' ? { gridColumn: '1 / -1' } : null}>
              <div style={labelStyle}>{t(labelKey)}</div>
              <input
                type="text"
                value={row[key] || ''}
                onChange={(e) => setRow(r => ({ ...r, [key]: e.target.value }))}
                onBlur={(e) => saveField(key, e.target.value)}
                disabled={savingKey === key}
                style={{
                  width: '100%', padding: '9px 11px', fontSize: 14, color: '#1a1a2e',
                  border: '1px solid #e2ddd7', borderRadius: 8, background: '#fff',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: '#7a8394' }}>
          {t('businessSettingsHint')}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#b0b8c4',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
};
