import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Plus, Search, X } from 'lucide-react';

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

/* ---------------- Manufacturer searchable dropdown ---------------- */
/** value = manufacturer name (string). onChange(name, isInhouse). */
export function ManufacturerSelect({ value, onChange, manufacturers, refreshManufacturers, label = 'Tillverkare' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInhouse, setNewInhouse] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setCreating(false); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = (manufacturers || []).filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = (manufacturers || []).find(m => m.name === value);

  const handleSelect = (m) => {
    onChange(m.name, !!m.is_inhouse);
    setOpen(false); setSearch(''); setCreating(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from('manufacturers')
      .insert({ name, is_inhouse: newInhouse })
      .select()
      .single();
    if (error) { alert('Kunde inte spara tillverkare: ' + error.message); return; }
    if (refreshManufacturers) await refreshManufacturers();
    onChange(data.name, !!data.is_inhouse);
    setNewName(''); setNewInhouse(false); setCreating(false); setOpen(false); setSearch('');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ fontSize: 12, color: '#7a8394', fontWeight: 500, display: 'block', marginBottom: 5 }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ color: value ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
          {value || 'Välj tillverkare…'}
          {selected?.is_inhouse && <span style={{ marginLeft: 8, fontSize: 11, color: '#4CAF88', fontWeight: 600 }}>· in-house</span>}
        </span>
        <ChevronDown size={14} color="#7a8394" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#fff', border: '1px solid #e8e4df', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 1000, maxHeight: 280, overflow: 'auto',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid #f0ede8', position: 'relative' }}>
            <Search size={13} color="#b0b8c4" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök tillverkare…"
              style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: 12 }}
            />
          </div>
          {filtered.map(m => (
            <div key={m.id} onClick={() => handleSelect(m)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#1a1a2e',
                background: value === m.name ? '#6B7FD410' : 'transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={e => { if (value !== m.name) e.currentTarget.style.background = '#faf9f7'; }}
              onMouseLeave={e => { if (value !== m.name) e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{m.name}</span>
              {m.is_inhouse && <span style={{ fontSize: 10, color: '#4CAF88', fontWeight: 600 }}>IN-HOUSE</span>}
            </div>
          ))}
          {/* Permanent "New Manufacturer" option */}
          {!creating ? (
            <div onClick={() => setCreating(true)} style={{
              padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#6B7FD4', fontWeight: 600,
              borderTop: '1px solid #f0ede8', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Plus size={14} /> Ny tillverkare
            </div>
          ) : (
            <div style={{ padding: 10, borderTop: '1px solid #f0ede8', background: '#faf9f7' }}>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Tillverkarens namn"
                style={{ ...inputStyle, marginBottom: 6 }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7a8394', marginBottom: 8 }}>
                <input type="checkbox" checked={newInhouse} onChange={e => setNewInhouse(e.target.checked)} />
                In-house (ReklamX-tillverkad)
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => { setCreating(false); setNewName(''); }}
                  style={{ flex: 1, padding: '7px 10px', background: '#fff', border: '1px solid #e8e4df', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#7a8394' }}>
                  Avbryt
                </button>
                <button type="button" onClick={handleCreate}
                  style={{ flex: 1, padding: '7px 10px', background: 'linear-gradient(135deg, #6B7FD4, #9B5FD4)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>
                  Spara
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Lookup autocomplete (article/serial numbers) ---------------- */
/** value = string. onChange(string). table = 'article_numbers' | 'serial_numbers'. options = [{value}], refreshOptions(). */
export function LookupAutocomplete({ value, onChange, table, options, refreshOptions, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = (options || []).filter(o =>
    !value || o.value.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 8);

  const persistIfNew = async (v) => {
    const trimmed = (v || '').trim();
    if (!trimmed) return;
    if ((options || []).some(o => o.value === trimmed)) return;
    const { error } = await supabase.from(table).insert({ value: trimmed });
    if (!error && refreshOptions) refreshOptions();
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => persistIfNew(value)}
        placeholder={placeholder}
        style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)', zIndex: 1000, maxHeight: 180, overflow: 'auto',
        }}>
          {filtered.map(o => (
            <div key={o.value} onMouseDown={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--foreground)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {o.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
