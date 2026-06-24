import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

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

/**
 * Autocomplete for the offer line-item product name.
 * Searches items table by benamning + artikelnummer.
 * Selecting a match auto-fills name + article_number via onSelectItem.
 * Free typing is always allowed and never blocked.
 *
 * Props:
 *  - value: current name string
 *  - onChange(name): typed text
 *  - onSelectItem({ name, article_number }): chose a match
 *  - placeholder, style
 */
export default function ProductNameAutocomplete({ value, onChange, onSelectItem, placeholder, style }) {
  const { items } = useApp();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = (value || '').trim().toLowerCase();
  const filtered = (items || []).filter(it => {
    if (!q) return false;
    const ben = (it.benamning || '').toLowerCase();
    const art = String(it.artikelnummer ?? '').toLowerCase();
    return ben.includes(q) || art.includes(q);
  }).slice(0, 8);

  const handleSelect = (it) => {
    onSelectItem?.({
      name: it.benamning || '',
      article_number: String(it.artikelnummer ?? ''),
    });
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ ...inputStyle, ...style }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)', zIndex: 1000, maxHeight: 240, overflow: 'auto',
        }}>
          {filtered.map(it => (
            <div key={it.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(it); }}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--foreground)', display: 'flex', justifyContent: 'space-between', gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.benamning}</span>
              <span style={{ color: 'var(--muted-foreground)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>#{it.artikelnummer}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
