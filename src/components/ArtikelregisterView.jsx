import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { Search, Plus, X, Trash2 } from 'lucide-react';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--foreground)',
  background: 'var(--background)',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: 5,
};

const whiteBtn = {
  background: '#ffffff', color: '#000000', fontWeight: 700, border: 'none',
};

const emptyItem = {
  artikelnummer: '',
  benamning: '',
  ean: '',
  aktiv: true,
  enhet: '',
  leverantorsnamn: '',
  tillverkare: '',
  tillverkarens_artikelnummer: '',
};

export default function ArtikelregisterView() {
  const { currentUser, items, refreshItems } = useApp();
  const { t } = useLang();
  const isOwner = currentUser?.role === 'owner';

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);

  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => (a.benamning || '').localeCompare(b.benamning || '', 'sv')),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(it =>
      (it.benamning || '').toLowerCase().includes(q) ||
      String(it.artikelnummer ?? '').toLowerCase().includes(q)
    );
  }, [sorted, query]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{t('itemRegister')}</h1>
        {isOwner && (
          <button
            onClick={() => setEditing({ ...emptyItem, _new: true })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 8,
              ...whiteBtn, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Plus size={15} /> {t('addItem')}
          </button>
        )}
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} color="var(--muted-foreground)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('searchItems')}
          style={{ ...inputStyle, padding: '11px 12px 11px 38px' }}
        />
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div className="responsive-article-row" style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 220px 80px',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--muted)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <div>{t('articleNumberShort')}</div>
          <div>{t('benamning')}</div>
          <div>{t('manufacturerLabel')}</div>
          <div style={{ textAlign: 'right' }}>{t('aktiv')}</div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
            {t('noItems')}
          </div>
        ) : filtered.map(it => (
          <div key={it.id}
            onDoubleClick={() => setEditing({ ...it })}
            className="responsive-article-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 220px 80px',
              gap: 12, alignItems: 'center',
              padding: '11px 16px', borderBottom: '1px solid var(--border)',
              fontSize: 13, color: 'var(--foreground)', cursor: 'pointer',
              userSelect: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Dubbelklicka för att öppna"
          >
            <div style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--muted-foreground)' }}>{it.artikelnummer}</div>
            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{it.benamning}</div>
            <div style={{ color: 'var(--muted-foreground)' }}>{it.tillverkare || '—'}</div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                fontSize: 11, fontWeight: 600,
                background: it.aktiv ? 'color-mix(in oklab, var(--success) 22%, transparent)' : 'var(--muted)',
                color: it.aktiv ? 'var(--success)' : 'var(--muted-foreground)',
              }}>
                {it.aktiv ? t('yes') : t('no')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ItemDetailModal
          item={editing}
          isOwner={isOwner}
          onClose={() => setEditing(null)}
          onSaved={async () => { await refreshItems(); setEditing(null); }}
          onDeleted={async () => { await refreshItems(); setEditing(null); }}
          t={t}
        />
      )}
    </div>
  );
}

function ItemDetailModal({ item, isOwner, onClose, onSaved, onDeleted, t }) {
  const isNew = !!item._new;
  const readOnly = !isOwner;
  const [form, setForm] = useState({
    artikelnummer: item.artikelnummer ?? '',
    benamning: item.benamning ?? '',
    ean: item.ean ?? '',
    aktiv: item.aktiv ?? true,
    enhet: item.enhet ?? '',
    leverantorsnamn: item.leverantorsnamn ?? '',
    tillverkare: item.tillverkare ?? '',
    tillverkarens_artikelnummer: item.tillverkarens_artikelnummer ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError('');
    const artNum = parseInt(form.artikelnummer, 10);
    if (!Number.isFinite(artNum)) { setError(t('errorArtNumRequired')); return; }
    if (!form.benamning.trim()) { setError(t('errorBenamningRequired')); return; }

    setSaving(true);
    const payload = {
      artikelnummer: artNum,
      benamning: form.benamning.trim(),
      ean: form.ean.trim() || null,
      aktiv: !!form.aktiv,
      enhet: form.enhet.trim() || null,
      leverantorsnamn: form.leverantorsnamn.trim() || null,
      tillverkare: form.tillverkare.trim() || null,
      tillverkarens_artikelnummer: form.tillverkarens_artikelnummer.trim() || null,
      updated_at: new Date().toISOString(),
    };
    let res;
    if (isNew) {
      res = await supabase.from('items').insert(payload);
    } else {
      res = await supabase.from('items').update(payload).eq('id', item.id);
    }
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    await onSaved();
  };

  const handleDelete = async () => {
    if (!confirm(t('confirmDeleteItem'))) return;
    setSaving(true);
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    await onDeleted();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 14, width: '100%', maxWidth: 640,
          maxHeight: '90vh', overflowY: 'auto',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
            {isNew ? t('addItem') : (form.benamning || t('itemDetail'))}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {error && (
            <div style={{ background: 'color-mix(in oklab, var(--destructive) 18%, transparent)', color: 'var(--destructive)', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('articleNumberShort')} *</label>
              <input type="number" value={form.artikelnummer} disabled={readOnly} onChange={e => set('artikelnummer', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('enhet')}</label>
              <input type="text" value={form.enhet} disabled={readOnly} onChange={e => set('enhet', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / span 2' }}>
              <label style={labelStyle}>{t('benamning')} *</label>
              <input type="text" value={form.benamning} disabled={readOnly} onChange={e => set('benamning', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>EAN</label>
              <input type="text" value={form.ean} disabled={readOnly} onChange={e => set('ean', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('aktiv')}</label>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => set('aktiv', !form.aktiv)}
                style={{
                  ...inputStyle, textAlign: 'left', cursor: readOnly ? 'default' : 'pointer',
                  background: form.aktiv ? 'color-mix(in oklab, var(--success) 18%, var(--background))' : 'var(--muted)',
                  color: form.aktiv ? 'var(--success)' : 'var(--muted-foreground)', fontWeight: 600,
                }}
              >
                {form.aktiv ? t('yes') : t('no')}
              </button>
            </div>
            <div>
              <label style={labelStyle}>{t('manufacturerLabel')}</label>
              <input type="text" value={form.tillverkare} disabled={readOnly} onChange={e => set('tillverkare', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('supplierLabel')}</label>
              <input type="text" value={form.leverantorsnamn} disabled={readOnly} onChange={e => set('leverantorsnamn', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / span 2' }}>
              <label style={labelStyle}>{t('producerArticleNumber')}</label>
              <input type="text" value={form.tillverkarens_artikelnummer} disabled={readOnly} onChange={e => set('tillverkarens_artikelnummer', e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
          <div>
            {isOwner && !isNew && (
              <button onClick={handleDelete} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--destructive)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Trash2 size={14} /> {t('delete')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t('close')}
            </button>
            {isOwner && (
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 18px', borderRadius: 8, ...whiteBtn, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '…' : t('save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
