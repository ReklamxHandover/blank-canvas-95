import { Check } from 'lucide-react';

export const CHECKLIST_KEYS = ['mottagen', 'under_produktion', 'kvalitetskontroll', 'klar'];

const LABELS = {
  mottagen: 'Mottagen',
  under_produktion: 'Under produktion',
  kvalitetskontroll: 'Kvalitetskontroll',
  klar: 'Klar',
};

export function isProductComplete(p) {
  const c = p?.production_checklist || {};
  return CHECKLIST_KEYS.every(k => !!c[k]);
}

export function countCompleteItems(products) {
  return (products || []).filter(isProductComplete).length;
}

export default function ProductionChecklist({ value, onChange, readOnly }) {
  const v = value || {};
  const toggle = (k) => {
    if (readOnly) return;
    onChange?.({ ...v, [k]: !v[k] });
  };
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8,
      marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)',
    }}>
      {CHECKLIST_KEYS.map(k => {
        const checked = !!v[k];
        return (
          <button
            type="button"
            key={k}
            onClick={() => toggle(k)}
            disabled={readOnly}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px 5px 6px',
              borderRadius: 999,
              border: `1px solid ${checked ? '#4CAF88' : 'var(--border)'}`,
              background: checked ? 'color-mix(in oklab, #4CAF88 22%, var(--card))' : 'var(--muted)',
              color: checked ? '#a8e7c8' : 'var(--foreground)',
              fontSize: 12, fontWeight: 600,
              cursor: readOnly ? 'default' : 'pointer',
              opacity: readOnly && !checked ? 0.85 : 1,
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: 4,
              background: checked ? '#4CAF88' : 'var(--card)',
              border: `1.5px solid ${checked ? '#4CAF88' : 'var(--border)'}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {checked && <Check size={11} color="#fff" strokeWidth={3} />}
            </span>
            {LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}
