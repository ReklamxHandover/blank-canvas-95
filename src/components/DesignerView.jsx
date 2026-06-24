import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Paperclip, Upload, Send, Download } from 'lucide-react';
import ExpandableNote from './ExpandableNote.jsx';

export default function DesignerView() {
  const { orders, updatePipelineStage, updateOrder } = useApp();
  const { t } = useLang();

  const [attentionInputs, setAttentionInputs] = useState({});
  const [attachmentsByOrder, setAttachmentsByOrder] = useState({});
  const [uploadedThisSession, setUploadedThisSession] = useState({}); // orderId -> count
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileInputRefs = useRef({});

  const myOrders = orders.filter(o =>
    !o.deletedAt &&
    o.pipeline.design.status === 'active'
  );

  useEffect(() => {
    const ids = myOrders.map(o => o.id);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('order_attachments')
        .select('*')
        .in('order_id', ids)
        .order('created_at', { ascending: false });
      if (cancelled || !data) return;
      const grouped = {};
      data.forEach(a => {
        (grouped[a.order_id] = grouped[a.order_id] || []).push(a);
      });
      setAttachmentsByOrder(grouped);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myOrders.map(o => o.id).join(',')]);

  const handleFlagAttention = (orderId) => {
    const note = attentionInputs[orderId] || '';
    updateOrder(orderId, { needsAttention: true, needsAttentionNote: note }, `Design flaggad: behöver åtgärd`);
    updatePipelineStage(orderId, 'design', 'behover_atgard', note);
  };

  const handleUpload = async (e, orderId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFor(orderId);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${orderId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('order-attachments')
        .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: row, error: insErr } = await supabase
        .from('order_attachments')
        .insert({
          order_id: orderId,
          file_name: file.name,
          storage_path: path,
          file_size: file.size,
          file_type: file.type || '',
          uploaded_by: user?.id || null,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setAttachmentsByOrder(prev => ({ ...prev, [orderId]: [row, ...(prev[orderId] || [])] }));
      setUploadedThisSession(prev => ({ ...prev, [orderId]: (prev[orderId] || 0) + 1 }));
    } catch (err) {
      console.error('Upload failed', err);
      alert('Uppladdning misslyckades: ' + (err.message || 'okänt fel'));
    } finally {
      setUploadingFor(null);
      if (fileInputRefs.current[orderId]) fileInputRefs.current[orderId].value = '';
    }
  };

  const handleDownload = async (att) => {
    const { data, error } = await supabase.storage
      .from('order-attachments')
      .createSignedUrl(att.storage_path, 3600);
    if (error || !data?.signedUrl) { alert('Kunde inte skapa länk.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendToProduction = (orderId) => {
    updatePipelineStage(orderId, 'design', 'done', '');
    updatePipelineStage(orderId, 'produktion', 'active', '');
  };

  if (myOrders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 32px', color: '#b0b8c4' }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{t('noOrders')}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: 30,
        color: '#1a1a2e',
        marginBottom: 28,
      }}>
        {t('designerView')}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {myOrders.map(order => {
          const status = order.pipeline.design.status;
          const atts = attachmentsByOrder[order.id] || [];
          const canSend = (uploadedThisSession[order.id] || 0) > 0;
          return (
            <div key={order.id} style={{
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              padding: '28px 32px',
              borderLeft: status === 'behover_atgard' ? '4px solid #E8A838' : '4px solid #6B7FD4',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#b0b8c4', fontWeight: 600, marginBottom: 4 }}>{order.id}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
                    {order.products.map(p => p.name).join(' + ')}
                  </div>
                </div>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12, fontWeight: 600,
                  background: status === 'behover_atgard' ? '#E8A83818' : '#6B7FD418',
                  color: status === 'behover_atgard' ? '#E8A838' : '#6B7FD4',
                }}>
                  {t(`status_${status}`)}
                </div>
              </div>

              {/* Products */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {order.products.map(p => (
                  <div key={p.id} style={{ padding: '12px 16px', background: '#faf9f7', borderRadius: 10, border: '1px solid #f0ede8' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
                      {p.name} <span style={{ color: '#b0b8c4', fontWeight: 400 }}>× {p.quantity}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7a8394', lineHeight: 1.6 }}>{p.specs}</div>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div style={{ fontSize: 13, color: '#7a8394', marginBottom: 14, fontStyle: 'italic' }}>
                  {order.notes}
                </div>
              )}

              {order.folderPath && (
                <div style={{
                  marginBottom: 14,
                  padding: '10px 14px',
                  background: '#faf9f7',
                  border: '1px solid #f0ede8',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#1a1a2e',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  wordBreak: 'break-all',
                }}>
                  <span style={{ color: '#b0b8c4', fontFamily: 'inherit', marginRight: 6, fontWeight: 600 }}>{t('folderPathLabel')}:</span>
                  {order.folderPath}
                </div>
              )}

              {/* Attachments from staff/owner */}
              {atts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    {t('attachments')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {atts.map(f => (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', background: '#faf9f7',
                        border: '1px solid #f0ede8', borderRadius: 8,
                        fontSize: 13, color: '#1a1a2e',
                      }}>
                        <Paperclip size={13} color="#b0b8c4" strokeWidth={2} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</span>
                        <button onClick={() => handleDownload(f)} style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#6B7FD4', display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 500,
                        }}>
                          <Download size={13} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {order.needsAttention && (
                <div style={{ padding: '10px 14px', background: '#E8A83810', border: '1px solid #E8A83830', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#c47d1a' }}>
                  <AlertTriangle size={13} strokeWidth={2} style={{ display: 'inline', marginRight: 6 }} />
                  {order.needsAttentionNote}
                </div>
              )}

              {/* Upload + actions — all stretch end-to-end */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex' }}>
                  <ExpandableNote
                    value={attentionInputs[order.id] || ''}
                    onChange={(v) => setAttentionInputs(prev => ({ ...prev, [order.id]: v }))}
                    placeholder={t('attentionNote')}
                    rows={1}
                    collapsedStyle={{ height: 40, padding: '10px 32px 10px 12px', lineHeight: 1.2 }}
                  />
                </div>
                <input
                  ref={el => { fileInputRefs.current[order.id] = el; }}
                  type="file"
                  onChange={(e) => handleUpload(e, order.id)}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRefs.current[order.id]?.click()}
                  disabled={uploadingFor === order.id}
                  style={{
                    flex: 1, height: 40, padding: '0 14px', background: '#ffffff', border: '1px solid #e8e4df',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#1a1a2e',
                    cursor: uploadingFor === order.id ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Upload size={13} strokeWidth={2} />
                  {uploadingFor === order.id ? 'Laddar upp…' : t('uploadDesignFile')}
                </button>
                <button
                  onClick={() => handleFlagAttention(order.id)}
                  style={{
                    flex: 1, height: 40, padding: '0 14px', background: '#faf9f7', border: '1px solid #E8A838',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#E8A838', cursor: 'pointer',
                    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <AlertTriangle size={13} strokeWidth={2} />
                  {t('flagAttention')}
                </button>
                <button
                  onClick={() => handleSendToProduction(order.id)}
                  style={{
                    flex: 1, height: 40, padding: '0 14px',
                    background: 'linear-gradient(135deg, #6B7FD4, #9B5FD4)',
                    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    color: '#ffffff', cursor: 'pointer',
                    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <Send size={13} strokeWidth={2} />
                  {t('sendToProduction')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
