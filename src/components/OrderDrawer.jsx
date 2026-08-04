import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { supabase } from '@/integrations/supabase/client';
import { X, Check, Trash2, Paperclip, ChevronDown, Upload, Download, Lock, Unlock, Plus, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { getStatusColor } from './PipelineDots.jsx';
import ExpandableNote from './ExpandableNote.jsx';
import { BufferedInput, BufferedTextarea } from './BufferedField.jsx';
import { LookupAutocomplete } from './Lookups.jsx';
import ProductNameAutocomplete from './ProductNameAutocomplete.jsx';
import ValuesBuilder from './ValuesBuilder.jsx';
import ProductionChecklist from './ProductionChecklist.jsx';
import DocumentBuilderModal from './DocumentBuilderModal.jsx';
import ExtraCostsEditor, { ExtraCostsReadOnly } from './ExtraCostsEditor.jsx';
import { OfferTotals, computeOfferTotals } from './CreateOrderModal.jsx';

let _ecLocalKey = 1;
const newExtraKey = () => `ec_local_${++_ecLocalKey}`;

const STAGES = ['brief', 'forhandling', 'design', 'produktion', 'leverans', 'faktura', 'betald'];
const STAGE_OPTIONS = {
  brief: ['not_started', 'active', 'done'],
  forhandling: ['not_started', 'under_forhandling', 'pris_godkant'],
  design: ['not_started', 'active', 'behover_atgard', 'done'],
  produktion: ['not_started', 'active', 'done'],
  leverans: ['not_started', 'hamtas_av_kund', 'frakt', 'done'],
  faktura: ['not_started', 'skickad', 'done'],
  betald: ['not_started', 'done'],
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sv-SE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--foreground)', fontWeight: 400 }}>{children}</div>
    </div>
  );
}

const iconBtnStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30,
  background: 'var(--muted)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--foreground)',
  cursor: 'pointer',
};

export default function OrderDrawer() {
  const { selectedOrder, setSelectedOrderId, setSelectedClientId, getClient, currentUser, updateOrder, updatePipelineStage, softDeleteOrder } = useApp();
  const { t } = useLang();
  const [tab, setTab] = useState('details');
  const [saveState, setSaveState] = useState('idle'); // idle | saved
  const [docBuilderOpen, setDocBuilderOpen] = useState(false);
  const [windowed, setWindowed] = useState(false);
  const [winPos, setWinPos] = useState({ x: 120, y: 80 });
  const [winSize, setWinSize] = useState({ w: 960, h: 720 });

  const startDrag = (e) => {
    if (!windowed) return;
    if (e.target.closest('button, input, textarea, select, a')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const orig = { ...winPos };
    const move = (ev) => setWinPos({
      x: Math.max(0, Math.min(window.innerWidth - 100, orig.x + (ev.clientX - startX))),
      y: Math.max(0, Math.min(window.innerHeight - 60, orig.y + (ev.clientY - startY))),
    });
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const role = currentUser.role;
  const canSeeFinancials = role === 'owner' || role === 'staff';
  const canEdit = role === 'owner' || role === 'staff';

  const [invoiceSent, setInvoiceSent] = useState(selectedOrder?.invoiceSent ?? false);
  const [paid, setPaid] = useState(selectedOrder?.paid ?? false);
  const [notes, setNotes] = useState(selectedOrder?.notes ?? '');
  const [deadline, setDeadline] = useState(
    selectedOrder?.deadline ? new Date(selectedOrder.deadline).toISOString().slice(0, 10) : ''
  );
  const [folderPath, setFolderPath] = useState(selectedOrder?.folderPath ?? '');


  // ---------- Attachments (Supabase Storage + order_attachments table) ----------
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ---------- Extra costs (per product line) ----------
  // extrasByItem: { [item_id]: Array<{ key, id?, description, amount }> }
  const [extrasByItem, setExtrasByItem] = useState({});

  useEffect(() => {
    if (!selectedOrder?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('order_attachments')
        .select('*')
        .eq('order_id', selectedOrder.id)
        .order('created_at', { ascending: false });
      if (!cancelled) setAttachments(data || []);
    })();
    return () => { cancelled = true; };
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (!selectedOrder?.id) { setExtrasByItem({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('extra_costs')
        .select('*')
        .eq('offer_id', selectedOrder.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      const grouped = {};
      for (const r of (data || [])) {
        const k = String(r.item_id);
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push({ key: r.id, id: r.id, description: r.description || '', amount: r.amount });
      }
      setExtrasByItem(grouped);
    })();
    return () => { cancelled = true; };
  }, [selectedOrder?.id]);

  // Recompute orders.price = sum(qty*price) + sum(all extras)
  const recomputeOrderPrice = async (nextExtrasByItem) => {
    const map = nextExtrasByItem || extrasByItem;
    const itemsTotal = (selectedOrder.products || []).reduce((s, p) => {
      const pr = Number(p.price);
      return s + (Number.isFinite(pr) ? pr * (p.quantity || 1) : 0);
    }, 0);
    const extrasTotal = Object.values(map).flat().reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const total = itemsTotal + extrasTotal;
    if (Number(selectedOrder.price || 0) === total) return;
    await updateOrder(selectedOrder.id, { price: total });
  };

  const handleExtraAdd = async (itemId) => {
    const { data, error } = await supabase.from('extra_costs').insert({
      offer_id: selectedOrder.id, item_id: String(itemId), description: '', amount: 0,
    }).select().single();
    if (error) { console.error(error); return; }
    setExtrasByItem(prev => {
      const next = { ...prev, [itemId]: [...(prev[itemId] || []), { key: data.id, id: data.id, description: '', amount: 0 }] };
      recomputeOrderPrice(next);
      return next;
    });
  };

  const handleExtraChange = (itemId, key, field, val) => {
    setExtrasByItem(prev => {
      const list = (prev[itemId] || []).map(e => e.key === key ? { ...e, [field]: val } : e);
      return { ...prev, [itemId]: list };
    });
  };

  const handleExtraBlur = async (itemId, key) => {
    const row = (extrasByItem[itemId] || []).find(e => e.key === key);
    if (!row?.id) return;
    const amt = Number(row.amount);
    if ((row.amount !== '' && row.amount !== null) && !Number.isFinite(amt)) return;
    if (Number.isFinite(amt) && amt !== 0 && !String(row.description || '').trim()) return; // require label when amount set
    await supabase.from('extra_costs').update({
      description: row.description || '',
      amount: Number.isFinite(amt) ? amt : 0,
    }).eq('id', row.id);
    recomputeOrderPrice();
  };

  const handleExtraRemove = async (itemId, key) => {
    const row = (extrasByItem[itemId] || []).find(e => e.key === key);
    if (row?.id) await supabase.from('extra_costs').delete().eq('id', row.id);
    setExtrasByItem(prev => {
      const next = { ...prev, [itemId]: (prev[itemId] || []).filter(e => e.key !== key) };
      recomputeOrderPrice(next);
      return next;
    });
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder?.id) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${selectedOrder.id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('order-attachments')
        .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: row, error: insErr } = await supabase
        .from('order_attachments')
        .insert({
          order_id: selectedOrder.id,
          file_name: file.name,
          storage_path: path,
          file_size: file.size,
          file_type: file.type || '',
          uploaded_by: user?.id || null,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setAttachments(prev => [row, ...prev]);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Uppladdning misslyckades: ' + (err.message || 'okänt fel'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (att) => {
    const { data, error } = await supabase.storage
      .from('order-attachments')
      .createSignedUrl(att.storage_path, 3600);
    if (error || !data?.signedUrl) {
      alert('Kunde inte skapa nedladdningslänk.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const formatBytes = (b) => {
    if (!b) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), sizes.length - 1);
    return `${(b / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
  };

  const client = getClient(selectedOrder?.clientId);

  const handleSave = async () => {
    try {
      const changes = { notes };
      if (canSeeFinancials) {
        changes.invoiceSent = invoiceSent;
        changes.paid = paid;
      }
      if (canEdit) {
        const newDeadlineIso = deadline ? new Date(deadline + 'T12:00:00').toISOString() : null;
        const prevDay = selectedOrder.deadline ? new Date(selectedOrder.deadline).toISOString().slice(0, 10) : '';
        if (deadline !== prevDay) changes.deadline = newDeadlineIso;
        if ((folderPath || '') !== (selectedOrder.folderPath || '')) changes.folderPath = folderPath || '';
      }
      const logParts = [];
      if (notes !== selectedOrder.notes) logParts.push('Anteckningar uppdaterade');
      if ('deadline' in changes) logParts.push(deadline ? `Deadline satt till ${deadline}` : 'Deadline borttagen');
      if ('folderPath' in changes) logParts.push(folderPath ? 'Mappsökväg uppdaterad' : 'Mappsökväg borttagen');
      await updateOrder(selectedOrder.id, changes, logParts.length ? logParts.join(', ') : null);
      setSaveState('saved');
      // Return user to the list view they came from
      setTimeout(() => {
        setSaveState('idle');
        setSelectedOrderId(null);
      }, 600);
    } catch (e) {
      setSaveState('idle');
    }
  };


  const handleClose = () => setSelectedOrderId(null);

  if (!selectedOrder) return null;

  return (
    <>
      {/* Backdrop — hidden in windowed mode so the rest of the app is interactive */}
      {!windowed && (
        <div
          className="fade-in"
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40,
          }}
        />
      )}

      {/* Drawer */}
      <div
        className={windowed ? 'responsive-drawer-shell' : 'drawer-animate responsive-drawer-shell'}
        style={windowed ? {
          position: 'fixed',
          top: winPos.y, left: winPos.x,
          width: winSize.w, height: winSize.h,
          minWidth: 520, minHeight: 380,
          maxWidth: '98vw', maxHeight: '95vh',
          background: 'var(--background)',
          borderRadius: 14,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
          border: '1px solid var(--border)',
          resize: 'both',
          overflow: 'hidden',
        } : {
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: '90vh',
          background: 'var(--background)',
          borderRadius: '20px 20px 0 0',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Top-right window controls */}
        <div style={{
          position: 'absolute', top: 10, right: 12,
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 5,
        }}>
          <button
            onClick={() => setWindowed(w => !w)}
            title={windowed ? 'Maximera' : 'Fönsterläge'}
            style={iconBtnStyle}
          >
            {windowed ? <Maximize2 size={15} strokeWidth={2} /> : <Minimize2 size={15} strokeWidth={2} />}
          </button>
          <button onClick={handleClose} title="Stäng" style={iconBtnStyle}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Drag handle / window title-bar */}
        <div
          onMouseDown={startDrag}
          style={{
            display: 'flex', justifyContent: 'center',
            padding: '14px 0 8px',
            cursor: windowed ? 'move' : 'default',
            userSelect: 'none',
          }}
        >
          <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>


        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
          padding: '8px clamp(14px, 4vw, 36px) 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', minWidth: 0 }}>

            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{selectedOrder.id}</span>
            {client ? (
              <button
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 15, fontWeight: 500, color: 'var(--foreground)', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                {client.companyName || '—'}
              </button>
            ) : (
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--foreground)' }}>—</span>
            )}
            {selectedOrder.needsAttention && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#E8A838',
                background: '#E8A83815', padding: '3px 10px', borderRadius: 10,
              }}>
                {t('needsAttention')}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>

            {['details', 'statusPipeline', 'changeLog'].map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: tab === tabKey ? 'var(--muted)' : 'transparent',
                  color: tab === tabKey ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: tab === tabKey ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: tab === tabKey ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {t(tabKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px clamp(14px, 4vw, 36px)' }}>
          {tab === 'details' && (
            <DetailsTab
              order={selectedOrder}
              client={client}
              canSeeFinancials={canSeeFinancials}
              canEdit={canEdit}
              invoiceSent={invoiceSent} setInvoiceSent={setInvoiceSent}
              paid={paid} setPaid={setPaid}
              notes={notes} setNotes={setNotes}
              deadline={deadline} setDeadline={setDeadline}
              folderPath={folderPath} setFolderPath={setFolderPath}
              attachments={attachments}
              uploading={uploading}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
              onDownload={handleDownload}
              formatBytes={formatBytes}
              extrasByItem={extrasByItem}
              onExtraAdd={handleExtraAdd}
              onExtraChange={handleExtraChange}
              onExtraBlur={handleExtraBlur}
              onExtraRemove={handleExtraRemove}
              t={t}
            />
          )}

          {tab === 'statusPipeline' && (
            <PipelineTab
              order={selectedOrder}
              canEdit={canEdit}
              updatePipelineStage={updatePipelineStage}
              t={t}
            />
          )}
          {tab === 'changeLog' && (
            <ChangelogTab order={selectedOrder} t={t} />
          )}
        </div>

        {/* Footer */}
        <div
          className="responsive-footer-grid responsive-tap"
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px clamp(14px, 4vw, 36px)',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            background: 'var(--card)',
            borderRadius: '0 0 0 0',
          }}
        >

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'start', flexWrap: 'wrap' }}>
            <button
              onClick={() => setDocBuilderOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--foreground)',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <FileText size={14} strokeWidth={1.75} />
              Skapa dokument
            </button>
            {canEdit && (
              <button
                onClick={() => softDeleteOrder(selectedOrder.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px',
                  background: 'transparent',
                  border: '1px solid #f0c8c8',
                  borderRadius: 8,
                  color: '#D96B6B',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={14} strokeWidth={1.75} />
                {t('moveToBin')}
              </button>
            )}
          </div>

          {/* Centered save button */}
          <div style={{ justifySelf: 'center' }}>
            {canEdit && (
              <button
                onClick={handleSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 24px',
                  background: saveState === 'saved' ? 'var(--success)' : 'var(--primary)',
                  border: 'none',
                  borderRadius: 10,
                  color: saveState === 'saved' ? 'var(--success-foreground)' : 'var(--primary-foreground)',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  minWidth: 140,
                  justifyContent: 'center',
                }}
              >
                {saveState === 'saved' ? (
                  <><Check size={15} strokeWidth={2.5} /> {t('saved')}</>
                ) : (
                  t('saveChanges')
                )}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'end', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {t('lastUpdated')}: {formatDate(selectedOrder.updatedAt)}
            </span>
          </div>
        </div>
      </div>
      {docBuilderOpen && (
        <DocumentBuilderModal order={selectedOrder} onClose={() => setDocBuilderOpen(false)} />
      )}
    </>
  );
}

/* ---- Details Tab ---- */
function DetailsTab({ order, client, canSeeFinancials, canEdit, invoiceSent, setInvoiceSent, paid, setPaid, notes, setNotes, deadline, setDeadline, folderPath, setFolderPath, attachments = [], uploading, fileInputRef, onFileUpload, onDownload, formatBytes, extrasByItem = {}, onExtraAdd, onExtraChange, onExtraBlur, onExtraRemove, t }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(16px, 4vw, 32px)', maxWidth: 900 }}>
      {/* Left column */}
      <div>
        {/* Client section — owner/staff only */}
        {canSeeFinancials && client && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>{t('clientSection')}</SectionLabel>
            <div style={{
              background: 'var(--card)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: '16px 20px',
            }}>
              <Field label={t('companyName')}>{client.companyName}</Field>
              <Field label={t('contactPerson')}>{client.contactPerson}</Field>
              <Field label={t('email')}>{client.email}</Field>
              <Field label={t('phone')}>{client.phone}</Field>
              <Field label={t('orgNumber')}>{client.orgNumber}</Field>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 4 }}>
                  {t('clientTotalSpent')}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4CAF88', fontVariantNumeric: 'tabular-nums' }}>
                  {(client.totalSpent || 0).toLocaleString('sv-SE')} {t('kr')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>{t('notes')}</SectionLabel>
          {canEdit ? (
            <ExpandableNote
              value={notes}
              onChange={setNotes}
              placeholder="..."
              rows={5}
              collapsedStyle={{ background: 'var(--card)', fontSize: 14, padding: '12px 32px 12px 14px', borderRadius: 10, lineHeight: 1.6 }}
            />
          ) : (
            <div style={{ fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              {notes || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{t('noNotes')}</span>}
            </div>
          )}
        </div>

        {/* Folder path / project files reference */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>{t('folderPathLabel')}</SectionLabel>
          {canEdit ? (
            <BufferedInput
              type="text"
              value={folderPath}
              onChange={e => setFolderPath(e.target.value)}
              placeholder={t('folderPathHint')}
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, color: 'var(--foreground)', background: 'var(--card)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
          ) : (
            <div style={{
              padding: '10px 12px',
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
              fontSize: 13, color: folderPath ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontFamily: folderPath ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
              fontStyle: folderPath ? 'normal' : 'italic',
              wordBreak: 'break-all',
            }}>
              {folderPath || '—'}
            </div>
          )}
        </div>

        {/* Attachments */}
        <div>
          <SectionLabel>{t('attachments')}</SectionLabel>

          {/* Upload button */}
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={onFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13, fontWeight: 500,
                  color: uploading ? 'var(--muted-foreground)' : 'var(--foreground)',
                  cursor: uploading ? 'wait' : 'pointer',
                  marginBottom: 10,
                }}
              >
                <Upload size={13} strokeWidth={2} />
                {uploading ? 'Laddar upp…' : 'Ladda upp fil'}
              </button>
            </>
          )}

          {attachments.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{t('noAttachments')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachments.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13, color: 'var(--muted-foreground)',
                }}>
                  <Paperclip size={13} color="var(--muted-foreground)" strokeWidth={2} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--foreground)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                      {formatBytes(f.file_size)} · {formatDate(f.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownload(f)}
                    title="Ladda ner"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                      background: 'var(--muted)',
                      border: 'none',
                      borderRadius: 6,
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Download size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div>
        {/* Products — editable while forhandling not done */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>{t('productSection')}</SectionLabel>
          {canEdit ? (
            <EditableProducts
              order={order} t={t}
              extrasByItem={extrasByItem}
              onExtraAdd={onExtraAdd}
              onExtraChange={onExtraChange}
              onExtraBlur={onExtraBlur}
              onExtraRemove={onExtraRemove}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {order.products.map(p => (
                <ProductReadOnlyCard
                  key={p.id} p={p} t={t}
                  canSeeFinancials={canSeeFinancials}
                  showChecklist={order.manufacturer === 'ReklamX'}
                  extras={extrasByItem[String(p.id)] || []}
                />
              ))}
            </div>
          )}
        </div>

        {/* Price section — financials only. Total is derived from item prices + extras. */}
        {canSeeFinancials && (
          <div>
            <SectionLabel>{t('priceSection')}</SectionLabel>
            <div style={{
              background: 'var(--card)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: '16px 20px',
            }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 5 }}>
                  {t('derivedTotalLabel')}
                </label>
                {(order.products && order.products.length > 0)
                  ? <OfferTotals products={order.products} extrasByItem={extrasByItem} variant="prominent" />
                  : <span style={{ color: '#E8A838', fontSize: 14, fontWeight: 600 }}>{t('noPrice')}</span>}
              </div>

              <div style={{ marginBottom: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 5 }}>
                  {t('deadlineLabel')}
                </label>
                {canEdit ? (
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--foreground)',
                      background: 'var(--background)',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 14, color: 'var(--foreground)' }}>
                    {deadline || <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ToggleField
                  label={t('invoiceSent')}
                  value={invoiceSent}
                  onChange={setInvoiceSent}
                  disabled={!canEdit}
                />
                <ToggleField
                  label={t('paid')}
                  value={paid}
                  onChange={setPaid}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Read-only product card (for designer/producer roles) ---- */
function ProductReadOnlyCard({ p, t, canSeeFinancials, showChecklist, extras = [] }) {
  const extrasSum = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const hasPrice = p.price !== null && p.price !== undefined && p.price !== '';
  const lineTotal = (hasPrice ? Number(p.price) * (p.quantity || 1) : 0) + extrasSum;
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
        {p.name}
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', marginLeft: 8 }}>
          × {p.quantity} {t('quantityShort')}
        </span>
        {canSeeFinancials && hasPrice && (
          <span style={{ float: 'right', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
            {Number(p.price).toLocaleString('sv-SE')} kr {p.unit || '/styck'}
          </span>
        )}
        {canSeeFinancials && (hasPrice || extrasSum > 0) && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4CAF88', fontVariantNumeric: 'tabular-nums', marginTop: 4, textAlign: 'right' }}>
            {t('lineTotal')}: {lineTotal.toLocaleString('sv-SE')} kr
          </div>
        )}
      </div>
      {p.specs && (
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{p.specs}</div>
      )}
      {(p.article_number || p.serial_number || p.producer_article_number) && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {p.article_number && <span><b style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Art:</b> {p.article_number}{p.producer_article_number ? ` / ${p.producer_article_number}` : ''}</span>}
          {p.serial_number && <span><b style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>S/N:</b> {p.serial_number}</span>}
        </div>
      )}
      {Array.isArray(p.values) && p.values.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
          <ValuesReadOnly nodes={p.values} depth={0} />
        </div>
      )}
      {canSeeFinancials && <ExtraCostsReadOnly rows={extras} />}
      {showChecklist && (
        <ProductionChecklist value={p.production_checklist} readOnly />
      )}
    </div>
  );
}


function ToggleField({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => !disabled && onChange(!value)}
        style={{
          width: 42, height: 24,
          borderRadius: 12,
          background: value ? '#4CAF88' : 'var(--border)',
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3,
          left: value ? 20 : 3,
          width: 18, height: 18,
          borderRadius: '50%',
          background: 'var(--card)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

/* ---- Pipeline Tab ---- */
function PipelineTab({ order, canEdit, updatePipelineStage, t }) {
  const [stageEdits, setStageEdits] = useState({});

  const getEdit = (stage) => stageEdits[stage] || {
    status: order.pipeline[stage]?.status || 'not_started',
    notes: order.pipeline[stage]?.notes || '',
  };

  const setEdit = (stage, field, val) => {
    setStageEdits(prev => ({
      ...prev,
      [stage]: { ...getEdit(stage), [field]: val },
    }));
  };

  const handleSaveStage = (stage) => {
    const edit = getEdit(stage);
    if (stage === 'forhandling' && edit.status === 'pris_godkant') {
      const missing = (order.products || []).filter(
        p => p.price === null || p.price === undefined || p.price === '' || Number(p.price) <= 0
      );
      if (missing.length > 0) {
        const names = missing.map((p, i) => p.name?.trim() || `${t('itemNameFallback')} ${i + 1}`).join('\n• ');
        alert(`${t('pricesMissingBody')}\n\n${t('pricesMissingItems')}\n• ${names}`);
        return;
      }
    }
    updatePipelineStage(order.id, stage, edit.status, edit.notes);
  };


  return (
    <div style={{ maxWidth: 600 }}>
      {STAGES.map(stage => {
        const stageData = order.pipeline[stage];
        const edit = getEdit(stage);
        const color = getStatusColor(edit.status);

        return (
          <div key={stage} style={{
            display: 'flex',
            gap: 16,
            marginBottom: 0,
            paddingBottom: 20,
            paddingTop: 20,
            borderBottom: stage === 'betald' ? 'none' : '1px solid var(--border)',
          }}>
            {/* Timeline dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{
                width: 14, height: 14,
                borderRadius: '50%',
                background: color,
                border: `2px solid ${color === 'var(--border)' ? 'var(--border)' : color}`,
                flexShrink: 0,
                marginTop: 2,
              }} />
              {stage !== 'betald' && (
                <div style={{ width: 2, flex: 1, minHeight: 20, background: 'var(--muted)' }} />
              )}
            </div>

            {/* Stage content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
                  {t(`stage_${stage}`)}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 9px', borderRadius: 10,
                  background: `${color}18`,
                  color: color === 'var(--border)' ? 'var(--muted-foreground)' : color,
                }}>
                  {t(`status_${edit.status}`)}
                </span>
                {stageData?.updatedAt && (
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {formatDateTime(stageData.updatedAt)}
                  </span>
                )}
              </div>

              {canEdit && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <select
                    value={edit.status}
                    onChange={e => setEdit(stage, 'status', e.target.value)}
                    style={{
                      padding: '7px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--foreground)',
                      background: 'var(--card)',
                      cursor: 'pointer',
                    }}
                  >
                    {STAGE_OPTIONS[stage].map(opt => (
                      <option key={opt} value={opt}>{t(`status_${opt}`)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={edit.notes}
                    onChange={e => setEdit(stage, 'notes', e.target.value)}
                    placeholder={t('stageNotes')}
                    style={{
                      flex: 1, minWidth: 140,
                      padding: '7px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--foreground)',
                      background: 'var(--card)',
                    }}
                  />
                  <button
                    onClick={() => handleSaveStage(stage)}
                    style={{
                      padding: '7px 14px',
                      background: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      color: '#000000',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t('save')}
                  </button>
                </div>
              )}

              {!canEdit && stageData?.notes && (
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                  {stageData.notes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Changelog Tab ---- */
function ChangelogTab({ order, t }) {
  return (
    <div style={{ maxWidth: 620 }}>
      {order.changeLog.length === 0 ? (
        <div style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>{t('noActivity')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {order.changeLog.map((entry, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: 14,
              paddingBottom: 16,
              paddingTop: i === 0 ? 0 : 16,
              borderBottom: i === order.changeLog.length - 1 ? 'none' : '1px solid var(--border)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#6B7FD4', flexShrink: 0, marginTop: 5,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 3 }}>
                  {entry.action}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {entry.user} · {formatDateTime(entry.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const VALUE_DOT_COLORS = ['#6B7FD4', '#9B5FD4', '#D49B6B', '#7FB6A8'];

function ValuesReadOnly({ nodes, depth }) {
  return (
    <div>
      {nodes.map(n => (
        <div
          key={n.id}
          style={{
            marginLeft: depth === 0 ? 0 : 12,
            paddingLeft: depth === 0 ? 0 : 10,
            borderLeft: depth === 0 ? 'none' : `2px solid ${VALUE_DOT_COLORS[depth]}22`,
            marginBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: VALUE_DOT_COLORS[depth] || 'var(--muted-foreground)',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: depth === 0 ? 13 : 12.5,
              fontWeight: depth === 0 ? 600 : 500,
              color: depth === 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
            }}>
              {n.label || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>—</span>}
            </span>
          </div>
          {Array.isArray(n.children) && n.children.length > 0 && (
            <div style={{ marginTop: 3 }}>
              <ValuesReadOnly nodes={n.children} depth={depth + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---- Editable products (staff/owner). Locks when forhandling = pris_godkant. ---- */
function EditableProducts({ order, t, extrasByItem = {}, onExtraAdd, onExtraChange, onExtraBlur, onExtraRemove }) {
  const { updateOrder, manufacturers, articleNumbers, serialNumbers, refreshArticleNumbers, refreshSerialNumbers } = useApp();
  const isApproved = order.pipeline?.forhandling?.status === 'pris_godkant';
  const [unlocked, setUnlocked] = useState(false);
  const locked = isApproved && !unlocked;

  const manufacturerInhouse = !!(manufacturers || []).find(m => m.name === order.manufacturer)?.is_inhouse;
  const isReklamX = order.manufacturer === 'ReklamX';

  // Recompute the offer total (qty * item price + all extra costs) so it
  // stays correct on every product edit — not just when extras themselves
  // are touched. See computeOfferTotals in CreateOrderModal for the same math.
  const persistProducts = (next) => {
    const { exkl } = computeOfferTotals(next, extrasByItem);
    const hasPrice = next.some(p => p.price !== null && p.price !== undefined && p.price !== '')
      || Object.values(extrasByItem).flat().length > 0;
    updateOrder(order.id, { products: next, price: hasPrice ? exkl : null });
  };

  const handleChange = (id, field, val) => {
    persistProducts(order.products.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleMultiChange = (id, partial) => {
    persistProducts(order.products.map(p => p.id === id ? { ...p, ...partial } : p));
  };

  const handleAdd = () => {
    const newId = `p${Date.now().toString(36)}`;
    persistProducts([
      ...(order.products || []),
      { id: newId, name: '', quantity: 1, specs: '', article_number: '', serial_number: '', producer_article_number: '', price: '', unit: '/styck', values: [] },
    ]);
  };

  const handleRemove = (id) => {
    if ((order.products || []).length <= 1) return;
    persistProducts(order.products.filter(p => p.id !== id));
  };

  return (
    <>
      {isApproved && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '10px 14px', marginBottom: 10,
          background: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 500 }}>
            {locked ? <Lock size={14} color="var(--muted-foreground)" /> : <Unlock size={14} color="var(--foreground)" />}
            <span style={{ color: 'var(--foreground)' }}>
              {locked ? t('productsLockedBanner') : 'Produkter upplåsta för redigering.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUnlocked(u => !u)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: locked ? '#ffffff' : 'transparent',
              color: locked ? '#000000' : 'var(--foreground)',
              border: locked ? 'none' : '1px solid var(--border)',
            }}
          >
            {locked ? t('unlockProducts') : t('lockProducts')}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(order.products || []).map((p, idx) => (
          <ProductEditCard
            key={p.id}
            p={p}
            idx={idx}
            locked={locked}
            manufacturerInhouse={manufacturerInhouse}
            showChecklist={isReklamX}
            articleNumbers={articleNumbers}
            serialNumbers={serialNumbers}
            refreshArticleNumbers={refreshArticleNumbers}
            refreshSerialNumbers={refreshSerialNumbers}
            onChange={handleChange}
            onMultiChange={handleMultiChange}
            onRemove={(order.products || []).length > 1 ? () => handleRemove(p.id) : null}
            extras={extrasByItem[String(p.id)] || []}
            onExtraAdd={() => onExtraAdd && onExtraAdd(p.id)}
            onExtraChange={(key, field, val) => onExtraChange && onExtraChange(p.id, key, field, val)}
            onExtraBlur={(key) => onExtraBlur && onExtraBlur(p.id, key)}
            onExtraRemove={(key) => onExtraRemove && onExtraRemove(p.id, key)}
            t={t}
          />
        ))}

      </div>

      {!locked && (
        <button
          type="button"
          onClick={handleAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center',
            width: '100%', marginTop: 10,
            padding: '9px 16px',
            background: 'transparent',
            border: '1.5px dashed var(--border)',
            borderRadius: 8,
            color: 'var(--muted-foreground)',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          {t('addProduct')}
        </button>
      )}
    </>
  );
}

const editInput = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--foreground)',
  background: 'var(--card)',
  boxSizing: 'border-box',
};

function ProductEditCard({ p, locked, manufacturerInhouse, showChecklist, articleNumbers, serialNumbers, refreshArticleNumbers, refreshSerialNumbers, onChange, onMultiChange, onRemove, extras = [], onExtraAdd, onExtraChange, onExtraBlur, onExtraRemove, t }) {
  const priceMissing = !locked && (p.price === '' || p.price === null || p.price === undefined || Number(p.price) <= 0);
  // Local buffer for specs textarea so fast typing isn't throttled by parent re-renders / persistence
  const [specsLocal, setSpecsLocal] = useState(p.specs || '');
  const specsTimer = useRef(null);
  const specsDirty = useRef(false);
  useEffect(() => {
    if (!specsDirty.current) setSpecsLocal(p.specs || '');
  }, [p.specs]);
  useEffect(() => () => { if (specsTimer.current) clearTimeout(specsTimer.current); }, []);
  const handleSpecsChange = (e) => {
    const val = e.target.value;
    specsDirty.current = true;
    setSpecsLocal(val);
    if (specsTimer.current) clearTimeout(specsTimer.current);
    specsTimer.current = setTimeout(() => {
      specsDirty.current = false;
      onChange(p.id, 'specs', val);
    }, 350);
  };
  const flushSpecs = () => {
    if (specsTimer.current) { clearTimeout(specsTimer.current); specsTimer.current = null; }
    if (specsDirty.current) {
      specsDirty.current = false;
      onChange(p.id, 'specs', specsLocal);
    }
  };
  return (

    <div style={{
      background: 'var(--card)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      padding: '14px 16px',
    }}>
      <fieldset disabled={locked} style={{ opacity: locked ? 0.85 : 1, border: 0, padding: 0, margin: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <ProductNameAutocomplete
            value={p.name || ''}
            onChange={(v) => onChange(p.id, 'name', v)}
            onSelectItem={({ name, article_number }) => onMultiChange(p.id, { name, article_number })}
            placeholder={t('productName')}
            style={{ flex: 1, fontWeight: 600, background: 'var(--background)', padding: '10px 12px', fontSize: 13 }}
          />
          <input
            type="number"
            min={1}
            value={p.quantity ?? 1}
            onChange={e => onChange(p.id, 'quantity', parseInt(e.target.value) || 1)}
            style={{ ...editInput, width: 64, textAlign: 'center', background: 'var(--background)' }}
            title={t('quantity')}
          />
          {onRemove && !locked && (
            <button
              type="button"
              onClick={onRemove}
              title={t('removeProduct')}
              style={{ padding: '0 10px', background: 'none', border: '1px solid #f0c8c8', borderRadius: 8, cursor: 'pointer', color: '#D96B6B' }}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <textarea
          placeholder={t('specifications')}
          value={specsLocal}
          onChange={handleSpecsChange}
          onBlur={flushSpecs}
          rows={2}
          style={{ ...editInput, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }}
        />

        <div className="order-row-fields-grid" style={{ display: 'grid', gridTemplateColumns: manufacturerInhouse ? '1fr 1fr 1fr 80px 120px' : '1fr 1fr 1fr 1fr 80px 120px', gap: 6, marginBottom: 4 }}>
          <LookupAutocomplete
            value={p.article_number}
            onChange={(v) => onChange(p.id, 'article_number', v)}
            table="article_numbers"
            options={articleNumbers}
            refreshOptions={refreshArticleNumbers}
            placeholder={t('articleNumber')}
          />
          {!manufacturerInhouse && (
            <BufferedInput
              type="text"
              value={p.producer_article_number || ''}
              onChange={e => onChange(p.id, 'producer_article_number', e.target.value)}
              placeholder={t('producerArticleNumber')}
              style={{ ...editInput, fontSize: 12, padding: '8px 10px' }}
            />
          )}
          <LookupAutocomplete
            value={p.serial_number}
            onChange={(v) => onChange(p.id, 'serial_number', v)}
            table="serial_numbers"
            options={serialNumbers}
            refreshOptions={refreshSerialNumbers}
            placeholder={t('serialNumber')}
          />
          <input
            type="number"
            value={p.price ?? ''}
            onChange={e => onChange(p.id, 'price', e.target.value)}
            placeholder={t('itemPrice')}
            style={{
              ...editInput,
              fontSize: 12, padding: '8px 10px',
              borderColor: priceMissing ? '#E8A838' : 'var(--border)',
              background: priceMissing ? 'color-mix(in oklab, var(--warning) 18%, var(--card))' : 'var(--card)',
            }}
          />
          <select
            value={p.unit || '/styck'}
            onChange={e => onChange(p.id, 'unit', e.target.value)}
            title="Enhet"
            style={{ ...editInput, fontSize: 12, padding: '8px 6px' }}
          >
            {['/timme', '/meter', '/styck', '/lb meter', '/kilo'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <div
            style={{
              ...editInput,
              fontSize: 12, padding: '8px 10px',
              background: 'var(--muted)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {((Number(p.price) > 0) || extras.length > 0)
              ? `${((Number(p.price) > 0 ? Number(p.price) * (p.quantity || 1) : 0) + extras.reduce((s, e) => s + (Number(e.amount) || 0), 0)).toLocaleString('sv-SE')} kr`
              : '—'}
          </div>
        </div>
        <ValuesBuilder
          values={p.values || []}
          onChange={(next) => onChange(p.id, 'values', next)}
        />
        <ExtraCostsEditor
          rows={extras}
          disabled={locked}
          onAdd={() => onExtraAdd && onExtraAdd()}
          onChange={(key, field, val) => onExtraChange && onExtraChange(key, field, val)}
          onRowBlur={(key) => onExtraBlur && onExtraBlur(key)}
          onRemove={(key) => onExtraRemove && onExtraRemove(key)}
        />
        {showChecklist && (
          <ProductionChecklist value={p.production_checklist} readOnly />
        )}

      </fieldset>
    </div>
  );
}

