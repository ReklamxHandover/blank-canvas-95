import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, Download, FileText, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { loadBusinessProfile, FALLBACK_LOGO_URL } from '@/lib/businessProfile';
import { uploadAsset, removeAsset, resolveAssetUrl, loadAsDataUrl, isStoragePath } from '@/lib/docAssets';
import { useApp } from '../context/AppContext.jsx';

const todayIso = () => new Date().toISOString().slice(0, 10);

function defaultFields(order, client) {
  return {
    orderDate: todayIso(),
    orderNr: order?.id || '',
    deliveryAddress: client?.address || '',
    kundnr: client?.kundnr || '',
    ourReference: '',
    showPaymentTerms: false, paymentTerms: '30 dagar netto',
    showLateInterest: false, lateInterest: '8% + ref.ränta',
    showDeliveryDate: false, deliveryDate: '',
    logoUrl: '', // per-document logo (doc-assets storage path or URL)
    rows: (order?.products || []).map(p => ({
      artnr: p.article_number || '',
      benamning: p.name || p.benamning || '',
      antal: p.quantity || 1,
      levAnt: '',
      aPris: '',
      summa: '',
      image: '', // storage path
    })),
    showAPris: false,
    showSumma: false,
    showExklMoms: false, exklMoms: '',
    showMoms: false, moms: '',
    showOresavr: false, oresavr: '',
    showTotalt: false, totalt: '',
    showOrdervarde: false, ordervarde: '',
  };
}

export default function DocumentBuilderModal({ order, onClose }) {
  const { getClient, items } = useApp();
  const client = getClient(order.clientId);
  // Offerter page shows orders whose pris_godkant stage isn't reached yet —
  // same underlying order object, just printed as a quote instead of a
  // confirmed order (see getFilteredOrders scope 'offers' in AppContext.jsx).
  const isOffert = order?.pipeline?.forhandling?.status !== 'pris_godkant';
  const docTitle = isOffert ? 'Offertbekräftelse' : 'Orderbekräftelse';

  const [existingDoc, setExistingDoc] = useState(null);
  const [fields, setFields] = useState(() => defaultFields(order, client));
  const [logoPreview, setLogoPreview] = useState(null);
  const [rowImagePreviews, setRowImagePreviews] = useState({}); // idx -> signed URL
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const rowInputRefs = useRef({});

  // Logo always mirrors business_settings.logo_url — there's no per-document
  // logo upload control, so a value saved on an older document must not be
  // allowed to shadow later changes made in Företagsinställningar.
  const logoPath = fields.logoUrl || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [docRes, bsRes] = await Promise.all([
        supabase.from('documents').select('*').eq('order_id', order.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('business_settings').select('logo_url').eq('id', 1).maybeSingle(),
      ]);
      if (cancelled) return;
      const defaults = defaultFields(order, client);
      const currentLogo = bsRes.data?.logo_url || '';
      if (docRes.data?.fields) {
        setExistingDoc(docRes.data);
        setFields({ ...defaults, ...docRes.data.fields, logoUrl: currentLogo });
      } else {
        setFields({ ...defaults, logoUrl: currentLogo });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [order.id]);

  // Resolve logo preview
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!logoPath) { setLogoPreview(null); return; }
      const url = await resolveAssetUrl(logoPath);
      if (!cancelled) setLogoPreview(url);
    })();
    return () => { cancelled = true; };
  }, [logoPath]);

  // Resolve row image previews
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      await Promise.all(fields.rows.map(async (r, i) => {
        if (!r.image) return;
        const url = await resolveAssetUrl(r.image);
        if (url) next[i] = url;
      }));
      if (!cancelled) setRowImagePreviews(next);
    })();
    return () => { cancelled = true; };
  }, [fields.rows.map(r => r.image).join('|')]);

  const set = (k, v) => setFields(prev => ({ ...prev, [k]: v }));
  const setRow = (i, k, v) => setFields(prev => ({
    ...prev,
    rows: prev.rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r),
  }));
  const addRow = () => setFields(prev => ({
    ...prev,
    rows: [...prev.rows, { artnr: '', benamning: '', antal: '', levAnt: '', aPris: '', summa: '', image: '' }],
  }));
  const removeRow = (i) => {
    const img = fields.rows[i]?.image;
    if (img && isStoragePath(img)) removeAsset(img).catch(() => {});
    setFields(prev => ({ ...prev, rows: prev.rows.filter((_, idx) => idx !== i) }));
  };

  // Looks up the "pris (styck)" for a row from the order's own product lines
  // (order.products[].price, set in OrderDrawer) — matched by artnr, falling
  // back to name if the row has no artnr. Returns '' when no price was ever
  // entered for that item, so the caller knows not to prefill anything.
  const sourcePrisForRow = (row) => {
    const products = order?.products || [];
    let match = null;
    if (row.artnr) {
      match = products.find(p => String(p.article_number || '').trim() === String(row.artnr).trim());
    }
    if (!match && row.benamning) {
      match = products.find(p => (p.name || '').trim() === String(row.benamning).trim());
    }
    if (!match) return '';
    const price = match.price;
    return (price !== null && price !== undefined && price !== '') ? price : '';
  };

  // Summa = antal × à-pris. Uses the row's own à-pris value if one is already
  // set (typed in, or prefilled earlier via the À-pris checkbox); otherwise
  // falls back to the order's source price for that item, so Visa Summa
  // works standalone even if Visa À-pris was never checked.
  // If à-pris is missing there is nothing to base a total on, so summa stays
  // blank even when antal is known. If antal is missing but à-pris is known,
  // summa just mirrors the à-pris (qty of 1).
  const computeSumma = (row) => {
    const rowPris = row.aPris;
    const pris = (rowPris !== '' && rowPris !== null && rowPris !== undefined) ? rowPris : sourcePrisForRow(row);
    const hasPris = pris !== '' && pris !== null && pris !== undefined && !isNaN(Number(pris));
    if (!hasPris) return '';
    const prisNum = Number(pris);
    const hasAntal = row.antal !== '' && row.antal !== null && row.antal !== undefined && !isNaN(Number(row.antal));
    if (!hasAntal) return String(prisNum);
    return String(prisNum * Number(row.antal));
  };

  const handleToggleShowAPris = (checked) => {
    setFields(prev => ({
      ...prev,
      showAPris: checked,
      rows: checked
        ? prev.rows.map(r => {
            if (r.aPris !== '' && r.aPris !== null && r.aPris !== undefined) return r;
            const src = sourcePrisForRow(r);
            return src !== '' ? { ...r, aPris: src } : r;
          })
        : prev.rows,
    }));
  };

  const handleToggleShowSumma = (checked) => {
    setFields(prev => ({
      ...prev,
      showSumma: checked,
      rows: checked
        ? prev.rows.map(r => {
            if (r.summa !== '' && r.summa !== null && r.summa !== undefined) return r;
            const computed = computeSumma(r);
            return computed !== '' ? { ...r, summa: computed } : r;
          })
        : prev.rows,
    }));
  };

  const onArtnrChange = (i, v) => {
    const next = items.find(it => String(it.artikelnummer) === String(v).trim());
    setFields(prev => ({
      ...prev,
      rows: prev.rows.map((r, idx) => {
        if (idx !== i) return r;
        return next ? { ...r, artnr: v, benamning: next.benamning } : { ...r, artnr: v };
      }),
    }));
  };

  const handleRowImageFile = async (i, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const old = fields.rows[i]?.image;
      if (old && isStoragePath(old)) await removeAsset(old).catch(() => {});
      const path = await uploadAsset(file, `rows/${order.id}`);
      setRow(i, 'image', path);
    } finally { setUploading(false); }
  };

  const handleRowImageRemove = async (i) => {
    const old = fields.rows[i]?.image;
    if (old && isStoragePath(old)) await removeAsset(old).catch(() => {});
    setRow(i, 'image', '');
  };

  const handleDownload = async () => {
    setSaving(true);
    try {
      const bp = await loadBusinessProfile();
      // Logo comes from business_settings.logo_url (loadBusinessProfile already
      // falls back to FALLBACK_LOGO_URL when the column is empty).
      await generatePdf(fields, bp, docTitle);
      const payload = { order_id: order.id, fields };
      if (existingDoc?.id) {
        await supabase.from('documents').update({ fields }).eq('id', existingDoc.id);
      } else {
        const { data } = await supabase.from('documents').insert(payload).select().single();
        if (data) setExistingDoc(data);
      }
    } finally { setSaving(false); }
  };

  if (loading) return null;

  const anyRowImage = fields.rows.some(r => !!r.image);
  const imgCellW = 88;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} className="responsive-doc-modal" style={modal}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} />
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {docTitle} — {order.id}
              {existingDoc && <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500 }}>(sparat dokument)</span>}
            </h3>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>

        <div style={body}>
          {/* Document preview header with logo top-left */}
          <div style={previewCard}>
            <div className="responsive-doc-preview-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: '0 0 auto' }}>
                <img
                  src={logoPreview || FALLBACK_LOGO_URL}
                  alt="ReklamX"
                  style={{ maxWidth: 360, maxHeight: 120, objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{docTitle}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{fields.orderNr || '—'}</div>
              </div>
            </div>
          </div>

          <Section title="Sidhuvud">
            <Row2>
              <Field label="Orderdatum">
                <input type="date" value={fields.orderDate} onChange={e => set('orderDate', e.target.value)} style={input} />
              </Field>
              <Field label="Ordernr">
                <input value={fields.orderNr} onChange={e => set('orderNr', e.target.value.replace(/\D/g, ''))} style={input} />
              </Field>
            </Row2>
            <Row2>
              <Field label="Leveransadress">
                <textarea rows={2} value={fields.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} style={{ ...input, resize: 'vertical' }} />
              </Field>
              <Field label="Kundnr (skrivskyddad)">
                <input value={fields.kundnr} readOnly style={{ ...input, background: 'var(--muted)' }} />
              </Field>
            </Row2>
            <Field label="Vår referens">
              <input value={fields.ourReference} onChange={e => set('ourReference', e.target.value)} style={input} />
            </Field>
          </Section>

          <Section title="Tilläggsfält (skrivs ut endast om ikryssat)">
            <ToggleField checked={fields.showPaymentTerms} onCheck={v => set('showPaymentTerms', v)} label="Betalningsvillkor"
              value={fields.paymentTerms} onChange={v => set('paymentTerms', v)} />
            <ToggleField checked={fields.showLateInterest} onCheck={v => set('showLateInterest', v)} label="Dröjsmålsränta"
              value={fields.lateInterest} onChange={v => set('lateInterest', v)} />
            <ToggleField checked={fields.showDeliveryDate} onCheck={v => set('showDeliveryDate', v)} label="Leveransdatum"
              value={fields.deliveryDate} onChange={v => set('deliveryDate', v)} type="date" />
          </Section>

          <Section title="Produktrader">
            <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 12 }}>
              <label style={chk}><input type="checkbox" checked={fields.showAPris} onChange={e => handleToggleShowAPris(e.target.checked)} /> Visa À-pris</label>
              <label style={chk}><input type="checkbox" checked={fields.showSumma} onChange={e => handleToggleShowSumma(e.target.checked)} /> Visa Summa</label>
            </div>

            <div className="responsive-doc-rows-scroll">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {anyRowImage && <div style={{ width: imgCellW, flexShrink: 0 }}>Bild</div>}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `90px 1fr 70px 70px ${fields.showAPris ? '90px ' : ''}${fields.showSumma ? '90px ' : ''}28px 28px`, gap: 6 }}>
                <div>Artnr</div><div>Benämning</div><div>Antal</div><div>Lev ant</div>
                {fields.showAPris && <div>À-pris</div>}
                {fields.showSumma && <div>Summa</div>}
                <div /><div />
              </div>
            </div>

            {/* Rows */}
            {fields.rows.map((r, i) => {
              const rowH = anyRowImage ? 88 : 'auto';
              const hasImg = !!r.image;
              const preview = rowImagePreviews[i];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 6,
                  minHeight: rowH,
                }}>
                  {anyRowImage && (
                    <div style={{
                      width: imgCellW, flexShrink: 0, height: rowH,
                      borderRadius: 6, overflow: 'hidden',
                      border: '1px dashed var(--border)', background: 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {hasImg && preview ? (
                        <>
                          <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <button onClick={() => handleRowImageRemove(i)} title="Ta bort bild"
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => rowInputRefs.current[i]?.click()} title="Lägg till bild"
                          style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 10 }}>
                          <ImageIcon size={18} />
                          Bild
                        </button>
                      )}
                      <input ref={el => rowInputRefs.current[i] = el} type="file" accept="image/*" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleRowImageFile(i, f); e.target.value = ''; }} />
                    </div>
                  )}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `90px 1fr 70px 70px ${fields.showAPris ? '90px ' : ''}${fields.showSumma ? '90px ' : ''}28px 28px`, gap: 6, alignContent: 'center' }}>
                    <input list="artnr-options" value={r.artnr} onChange={e => onArtnrChange(i, e.target.value)} style={input} />
                    <input value={r.benamning} onChange={e => setRow(i, 'benamning', e.target.value)} style={input} />
                    <input value={r.antal} onChange={e => setRow(i, 'antal', e.target.value)} style={input} />
                    <input value={r.levAnt} onChange={e => setRow(i, 'levAnt', e.target.value)} style={input} />
                    {fields.showAPris && <input value={r.aPris} onChange={e => setRow(i, 'aPris', e.target.value)} style={input} />}
                    {fields.showSumma && <input value={r.summa} onChange={e => setRow(i, 'summa', e.target.value)} style={input} />}
                    {!anyRowImage && (
                      <button onClick={() => rowInputRefs.current[i]?.click()} title="Lägg till bild" style={{ ...iconBtn }}>
                        <ImageIcon size={13} />
                      </button>
                    )}
                    {anyRowImage && <div />}
                    <button onClick={() => removeRow(i)} style={{ ...iconBtn, color: '#D96B6B' }}><Trash2 size={13} /></button>
                    {!anyRowImage && (
                      <input ref={el => rowInputRefs.current[i] = el} type="file" accept="image/*" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleRowImageFile(i, f); e.target.value = ''; }} />
                    )}
                  </div>
                </div>
              );
            })}
            <datalist id="artnr-options">
              {items.map(it => <option key={it.id} value={it.artikelnummer}>{it.benamning}</option>)}
            </datalist>
            </div>
            <button onClick={addRow} style={{ ...btnSecondary, marginTop: 8 }}><Plus size={13} /> Lägg till rad</button>
          </Section>

          <Section title="Sidfot — summor (manuella, ikryssade skrivs ut)">
            <ToggleField checked={fields.showExklMoms} onCheck={v => set('showExklMoms', v)} label="Exkl. moms" value={fields.exklMoms} onChange={v => set('exklMoms', v)} />
            <ToggleField checked={fields.showMoms} onCheck={v => set('showMoms', v)} label="Moms" value={fields.moms} onChange={v => set('moms', v)} />
            <ToggleField checked={fields.showOresavr} onCheck={v => set('showOresavr', v)} label="Öresavr" value={fields.oresavr} onChange={v => set('oresavr', v)} />
            <ToggleField checked={fields.showTotalt} onCheck={v => set('showTotalt', v)} label="Totalt" value={fields.totalt} onChange={v => set('totalt', v)} />
            <ToggleField checked={fields.showOrdervarde} onCheck={v => set('showOrdervarde', v)} label="Ordervärde" value={fields.ordervarde} onChange={v => set('ordervarde', v)} />
          </Section>
        </div>

        <div style={footer}>
          <button onClick={onClose} style={btnSecondary}>Stäng</button>
          <button onClick={handleDownload} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            <Download size={14} /> {saving ? 'Genererar…' : 'Ladda ner PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- PDF generation ---------- */
async function generatePdf(f, bp, docTitle = 'Orderbekräftelse') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Logo top-left (preserve aspect ratio, contain within slot).
  // We load via <Image crossOrigin="anonymous"> and await onload so the
  // image is fully decoded before addImage runs — identical to how row
  // images are embedded — preventing the "missing on first PDF" bug.
  const logoData = await loadImageForPdf(bp.logoUrl);
  if (logoData) {
    try {
      const slotW = 220, slotH = 72;
      const { w, h } = containDims(doc, logoData, slotW, slotH);
      doc.addImage(logoData, margin, margin, w, h);
    } catch {}
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(docTitle, pageW - margin, margin + 18, { align: 'right' });

  let y = margin + 100;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const headerLeft = [
    ['Orderdatum', f.orderDate],
    ['Ordernr', f.orderNr],
    ['Vår referens', f.ourReference || '—'],
  ];
  const headerRight = [['Kundnr', f.kundnr || '—']];
  if (f.showPaymentTerms) headerRight.push(['Betalningsvillkor', f.paymentTerms]);
  if (f.showLateInterest) headerRight.push(['Dröjsmålsränta', f.lateInterest]);
  if (f.showDeliveryDate) headerRight.push(['Leveransdatum', f.deliveryDate]);

  headerLeft.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, margin, y + i * 14);
    doc.setFont('helvetica', 'normal'); doc.text(String(v || ''), margin + 90, y + i * 14);
  });
  headerRight.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, pageW / 2 + 20, y + i * 14);
    doc.setFont('helvetica', 'normal'); doc.text(String(v || ''), pageW / 2 + 130, y + i * 14);
  });

  y += Math.max(headerLeft.length, headerRight.length) * 14 + 14;

  doc.setFont('helvetica', 'bold'); doc.text('Leveransadress:', margin, y);
  doc.setFont('helvetica', 'normal');
  const addrLines = doc.splitTextToSize(f.deliveryAddress || '—', pageW - margin * 2 - 100);
  doc.text(addrLines, margin + 100, y);
  y += addrLines.length * 12 + 18;

  // Pre-load row images using the same awaited-Image loader as the logo
  const anyRowImage = f.rows.some(r => !!r.image);
  const rowImageData = await Promise.all(f.rows.map(r => r.image ? loadImageForPdf(r.image) : Promise.resolve(null)));

  // Build columns
  const head = [];
  const headRow = [];
  if (anyRowImage) headRow.push('Bild');
  headRow.push('Artnr', 'Benämning', 'Antal', 'Lev ant');
  if (f.showAPris) headRow.push('À-pris');
  if (f.showSumma) headRow.push('Summa');
  head.push(headRow);

  const body = f.rows.map((r) => {
    const row = [];
    if (anyRowImage) row.push(''); // image cell
    row.push(r.artnr || '', r.benamning || '', r.antal || '', r.levAnt || '');
    if (f.showAPris) row.push(r.aPris || '');
    if (f.showSumma) row.push(r.summa || '');
    return row;
  });

  const imageColWidth = 72;
  const imageRowHeight = 64;

  autoTable(doc, {
    head, body, startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5, valign: 'middle' },
    headStyles: { fillColor: [240, 237, 232], textColor: 30, fontStyle: 'bold' },
    bodyStyles: anyRowImage ? { minCellHeight: imageRowHeight } : undefined,
    columnStyles: anyRowImage ? { 0: { cellWidth: imageColWidth } } : undefined,
    didDrawCell: (data) => {
      if (!anyRowImage) return;
      if (data.section !== 'body' || data.column.index !== 0) return;
      const imgData = rowImageData[data.row.index];
      if (!imgData) return;
      const { x, y: cy, width, height } = data.cell;
      const pad = 2;
      const slotW = width - pad * 2;
      const slotH = height - pad * 2;
      try {
        const { w, h } = containDims(doc, imgData, slotW, slotH);
        const ix = x + pad + (slotW - w) / 2;
        const iy = cy + pad + (slotH - h) / 2;
        doc.addImage(imgData, ix, iy, w, h, undefined, 'FAST');
      } catch {}
    },
  });

  y = doc.lastAutoTable.finalY + 14;

  const totals = [];
  if (f.showExklMoms) totals.push(['Exkl. moms', f.exklMoms]);
  if (f.showMoms) totals.push(['Moms', f.moms]);
  if (f.showOresavr) totals.push(['Öresavr', f.oresavr]);
  if (f.showTotalt) totals.push(['Totalt', f.totalt]);
  if (f.showOrdervarde) totals.push(['Ordervärde', f.ordervarde]);

  totals.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, pageW - margin - 140, y + i * 14);
    doc.setFont('helvetica', 'normal');
    doc.text(String(v || ''), pageW - margin, y + i * 14, { align: 'right' });
  });

  const fy = pageH - margin - 48;
  doc.setDrawColor(220, 217, 211);
  doc.line(margin, fy, pageW - margin, fy);
  doc.setFontSize(8); doc.setTextColor(120);
  const col1 = [bp.companyName, bp.address].filter(Boolean);
  const col2 = [bp.phone && 'Tel: ' + bp.phone, bp.email && 'E-post: ' + bp.email].filter(Boolean);
  const col3 = [bp.bankgiro && 'Bankgiro: ' + bp.bankgiro, bp.orgNumber && 'Org.nr: ' + bp.orgNumber, bp.momsreg && 'Momsreg: ' + bp.momsreg].filter(Boolean);
  col1.forEach((l, i) => doc.text(l, margin, fy + 14 + i * 10));
  col2.forEach((l, i) => doc.text(l, margin + (pageW - margin * 2) / 3, fy + 14 + i * 10));
  col3.forEach((l, i) => doc.text(l, pageW - margin, fy + 14 + i * 10, { align: 'right' }));

  const fileTitle = docTitle === 'Offertbekräftelse' ? 'Offertbekraftelse' : 'Orderbekraftelse';
  doc.save(`${fileTitle}_${f.orderNr || 'dokument'}.pdf`);
}

// Compute contain-fit dimensions for jsPDF addImage preserving aspect ratio.
function containDims(doc, imgData, slotW, slotH) {
  try {
    const props = doc.getImageProperties(imgData);
    const iw = props.width, ih = props.height;
    if (!iw || !ih) return { w: slotW, h: slotH };
    const r = Math.min(slotW / iw, slotH / ih);
    return { w: iw * r, h: ih * r };
  } catch {
    return { w: slotW, h: slotH };
  }
}

// Load an image for embedding into the PDF. Resolves the doc-assets path to
// a fetchable URL, then loads it through an <Image crossOrigin="anonymous">
// element and waits for decode before drawing onto a canvas → data URL.
// Awaiting the load is what prevents the "logo missing on first PDF" bug.
async function loadImageForPdf(value) {
  const url = await resolveAssetUrl(value);
  if (!url) return null;
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    // Fallback to the fetch+blob path (handles same-origin URLs the browser
    // may refuse to canvas-export when CORS headers are missing).
    return loadAsDataUrl(value);
  }
}

/* ---------- Small UI primitives ---------- */
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Row2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>{children}</div>;
}
function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
function ToggleField({ checked, onCheck, label, value, onChange, type = 'text' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 170, fontSize: 13 }}>
        <input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)} />
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={!checked} style={{ ...input, opacity: checked ? 1 : 0.5 }} />
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(20,20,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150 };
const modal = { background: 'var(--card)', borderRadius: 14, width: 880, maxWidth: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' };
const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' };
const body = { padding: '20px 22px', overflowY: 'auto', flex: 1 };
const footer = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' };
const input = { width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13, background: 'var(--muted)', color: 'var(--foreground)', boxSizing: 'border-box' };
const iconBtn = { background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const smallBtn = { background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 };
const btnPrimary = { background: 'var(--foreground)', color: 'var(--card)', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnSecondary = { background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const chk = { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' };
const previewCard = { padding: 14, background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 18 };
