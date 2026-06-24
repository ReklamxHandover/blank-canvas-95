import { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LanguageContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { X } from 'lucide-react';
import ExpandableNote from './ExpandableNote.jsx';

const STAGE_OPTIONS = {
  brief: ['not_started', 'active', 'done'],
  forhandling: ['not_started', 'under_forhandling', 'pris_godkant'],
  design: ['not_started', 'active', 'behover_atgard', 'done'],
  produktion: ['not_started', 'active', 'done'],
  leverans: ['not_started', 'hamtas_av_kund', 'frakt', 'done'],
  faktura: ['not_started', 'skickad', 'done'],
  betald: ['not_started', 'done'],
};

const DELIVERY_OPTIONS = ['hamtas_av_kund', 'frakt', 'installation'];

export default function StagePopup({ order, stage, x, y, onClose }) {
  const { t } = useLang();
  const { updatePipelineStage, updateOrder } = useApp();
  const popupRef = useRef(null);

  const stageData = order.pipeline[stage];
  const [status, setStatus] = useState(stageData?.status || 'not_started');
  const [notes, setNotes] = useState(stageData?.notes || '');
  const [deliveryMethod, setDeliveryMethod] = useState(stageData?.deliveryMethod || '');
  const existingInst = stageData?.installation || {};
  const [instAddress, setInstAddress] = useState(existingInst.address || '');
  const [instBusinessName, setInstBusinessName] = useState(existingInst.businessName || '');
  const [instPhone, setInstPhone] = useState(existingInst.phone || '');
  const [instNotes, setInstNotes] = useState(existingInst.notes || '');

  // Clamp position to viewport
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = x - rect.width / 2;
      let top = y;
      if (left + rect.width > vw - 12) left = vw - rect.width - 12;
      if (left < 12) left = 12;
      if (top + rect.height > vh - 12) top = y - rect.height - 24;
      setPos({ left, top });
    }
  }, [x, y]);

  const handleSave = () => {
    // GATE: block forhandling → pris_godkant when any item lacks a price > 0
    if (stage === 'forhandling' && status === 'pris_godkant') {
      const missing = (order.products || []).filter(
        p => p.price === null || p.price === undefined || p.price === '' || Number(p.price) <= 0
      );
      if (missing.length > 0) {
        const names = missing.map((p, i) => p.name?.trim() || `${t('itemNameFallback')} ${i + 1}`).join('\n• ');
        alert(`${t('pricesMissingBody')}\n\n${t('pricesMissingItems')}\n• ${names}`);
        return;
      }
    }
    updatePipelineStage(order.id, stage, status, notes);
    if (stage === 'leverans') {
      const installation = deliveryMethod === 'installation'
        ? { address: instAddress, businessName: instBusinessName, phone: instPhone, notes: instNotes }
        : null;
      updateOrder(order.id, {
        pipeline: {
          ...order.pipeline,
          leverans: {
            ...order.pipeline.leverans,
            status, notes,
            deliveryMethod: deliveryMethod || null,
            installation,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }
    onClose();
  };


  return (
    <div
      ref={popupRef}
      className="fade-in"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 1000,
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
        border: '1px solid #f0ede8',
        padding: '20px 22px',
        width: 280,
        minWidth: 260,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
          {t(`stage_${stage}`)}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0b8c4', padding: 2 }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Status dropdown */}
      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
          {t('stageStatus')}
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #e8e4df',
            borderRadius: 8,
            fontSize: 13,
            color: '#1a1a2e',
            background: '#faf9f7',
            cursor: 'pointer',
          }}
        >
          {STAGE_OPTIONS[stage].map(opt => (
            <option key={opt} value={opt}>{t(`status_${opt}`)}</option>
          ))}
        </select>
      </label>

      {/* Leverans extras */}
      {stage === 'leverans' && (
        <>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              {t('deliveryMethod')}
            </div>
            <select
              value={deliveryMethod}
              onChange={e => setDeliveryMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #e8e4df',
                borderRadius: 8,
                fontSize: 13,
                color: '#1a1a2e',
                background: '#faf9f7',
                cursor: 'pointer',
              }}
            >
              <option value="">—</option>
              {DELIVERY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{t(`status_${opt}`)}</option>
              ))}
            </select>
          </label>
          {deliveryMethod === 'installation' && (
            <div style={{
              marginBottom: 12,
              padding: '12px 12px 4px',
              background: '#faf9f7',
              border: '1px solid #f0ede8',
              borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('installationSection')}
              </div>
              <InstField label={t('installationAddress')} value={instAddress} onChange={setInstAddress} />
              <InstField label={t('installationBusinessName')} value={instBusinessName} onChange={setInstBusinessName} />
              <InstField label={t('installationPhone')} value={instPhone} onChange={setInstPhone} />
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 11, color: '#7a8394', fontWeight: 500, marginBottom: 4 }}>{t('installationNotes')}</div>
                <textarea
                  value={instNotes}
                  onChange={e => setInstNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '7px 9px', border: '1px solid #e8e4df', borderRadius: 7, fontSize: 12, background: '#fff', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <label style={{ display: 'block', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
          {t('stageNotes')}
        </div>
        <ExpandableNote
          value={notes}
          onChange={setNotes}
          placeholder="..."
          rows={3}
        />
      </label>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '10px',
          background: 'linear-gradient(135deg, #6B7FD4, #9B5FD4)',
          border: 'none',
          borderRadius: 10,
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {t('save')}
      </button>
    </div>
  );
}

function InstField({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, color: '#7a8394', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 9px', border: '1px solid #e8e4df', borderRadius: 7, fontSize: 12, background: '#fff' }}
      />
    </label>
  );
}
