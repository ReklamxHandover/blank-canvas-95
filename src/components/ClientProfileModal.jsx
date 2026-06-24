import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STAGES = ['brief', 'forhandling', 'design', 'produktion', 'leverans', 'faktura', 'betald'];

function currentStage(order) {
  // rightmost stage that isn't 'not_started'
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const s = order.pipeline?.[STAGES[i]]?.status;
    if (s && s !== 'not_started') return { stage: STAGES[i], status: s };
  }
  return { stage: 'brief', status: 'not_started' };
}

function Field({ label, value, editable, onChange, multiline }) {
  if (!editable) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#1a1a2e', whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>{value || '—'}</div>
      </div>
    );
  }
  const common = {
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    style: {
      width: '100%', padding: '8px 10px', fontSize: 14, color: '#1a1a2e',
      border: '1px solid #e2ddd7', borderRadius: 8, background: '#fff',
      fontFamily: 'inherit', boxSizing: 'border-box',
    },
  };
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      {multiline
        ? <textarea rows={3} {...common} />
        : <input type="text" {...common} />}
    </div>
  );
}

export default function ClientProfileModal() {
  const {
    selectedClientId, setSelectedClientId,
    clients, orders, currentUser,
    updateClient, setSelectedOrderId,
  } = useApp();
  const { t } = useLang();

  const client = clients.find(c => c.id === selectedClientId);
  const canEdit = currentUser?.role === 'owner';

  const [draft, setDraft] = useState(null);

  useEffect(() => {
    setDraft(client ? { ...client } : null);
  }, [client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = useMemo(() => {
    if (!client) return [];
    return orders
      .filter(o => o.clientId === client.id && !o.deletedAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, client?.id]);

  if (!client || !draft) return null;

  const commit = (key, value) => {
    if (!canEdit) return;
    setDraft(d => ({ ...d, [key]: value }));
  };
  const saveField = (key) => {
    if (!canEdit) return;
    if (draft[key] === client[key]) return;
    updateClient(client.id, { [key]: draft[key] });
  };

  const close = () => setSelectedClientId(null);

  const openOrder = (id) => {
    setSelectedClientId(null);
    setSelectedOrderId(id);
  };

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,30,0.45)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="responsive-client-modal"
        style={{
          width: '100%', maxWidth: 780, maxHeight: '88vh',
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1px solid #f0ede8',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('clientProfile')}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginTop: 2 }}>
              {client.companyName || '—'}
            </div>
          </div>
          <button onClick={close} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 6, color: '#7a8394',
          }}><X size={20} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '24px 28px' }}>
          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            <Field
              label={t('companyName')}
              value={draft.companyName}
              editable={canEdit}
              onChange={v => commit('companyName', v)}
            />
            <Field label={t('kundnrLabel')} value={client.kundnr ?? '—'} editable={false} />
            <Field
              label={t('phone')}
              value={draft.phone}
              editable={canEdit}
              onChange={v => commit('phone', v)}
            />
            <Field
              label={t('email')}
              value={draft.email}
              editable={canEdit}
              onChange={v => commit('email', v)}
            />
            <Field
              label={t('addressLabel')}
              value={draft.address}
              editable={canEdit}
              onChange={v => commit('address', v)}
            />
            <Field
              label={t('contactPerson')}
              value={draft.contactPerson}
              editable={canEdit}
              onChange={v => commit('contactPerson', v)}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field
                label={t('notes')}
                value={draft.notes}
                editable={canEdit}
                onChange={v => commit('notes', v)}
                multiline
              />
            </div>
          </div>

          {canEdit && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                onClick={() => {
                  ['companyName','phone','email','address','contactPerson','notes'].forEach(saveField);
                }}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: 8,
                  background: '#1a1a2e', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >{t('save')}</button>
            </div>
          )}

          {/* History */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>
              {t('orderHistory')} ({history.length})
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: '#b0b8c4', padding: '16px 0' }}>{t('noOrders')}</div>
            ) : (
              <div style={{ border: '1px solid #f0ede8', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 13 }}>

                  <thead>
                    <tr style={{ background: '#faf9f7', borderBottom: '1px solid #f0ede8' }}>
                      <th style={th}>{t('orderId')}</th>
                      <th style={th}>{t('created')}</th>
                      <th style={th}>{t('currentStatus')}</th>
                      <th style={th}>{t('deadline')}</th>
                      <th style={{ ...th, textAlign: 'right' }}>{t('price')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(o => {
                      const cur = currentStage(o);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => openOrder(o.id)}
                          style={{ borderTop: '1px solid #f5f3f0', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ ...td, fontWeight: 600, color: '#6B7FD4' }}>{o.id}</td>
                          <td style={td}>{formatDate(o.createdAt)}</td>
                          <td style={td}>
                            <span>{t(`stage_${cur.stage}`) || cur.stage}</span>
                            <span style={{ color: '#b0b8c4' }}> · </span>
                            <span style={{ color: '#7a8394' }}>{t(`status_${cur.status}`) || cur.status}</span>
                          </td>
                          <td style={td}>{o.deadline ? formatDate(o.deadline) : '—'}</td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {o.price !== null && o.price !== undefined
                              ? `${Number(o.price).toLocaleString('sv-SE')} ${t('kr')}`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: '0.06em' };
const td = { padding: '10px 14px', color: '#1a1a2e' };
