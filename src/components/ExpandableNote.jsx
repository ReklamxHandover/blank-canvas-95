import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, X, Maximize2 } from 'lucide-react';
import { BufferedTextarea } from './BufferedField.jsx';

/**
 * Tap-to-expand note editor.
 * Stores plain text with markdown-ish markers (**bold**, *italic*).
 * Collapsed view: a regular textarea.
 * Expanded view: full-screen tinted modal with formatting toolbar
 *   (bold, italic, row spacing).
 */
export default function ExpandableNote({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  collapsedStyle = {},
  readOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [draft, setDraft] = useState(value || '');
  const taRef = useRef(null);

  useEffect(() => { if (open) setDraft(value || ''); }, [open, value]);

  const wrapSelection = (marker) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = draft.slice(0, start);
    const sel = draft.slice(start, end) || 'text';
    const after = draft.slice(end);
    const next = `${before}${marker}${sel}${marker}${after}`;
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + sel.length);
    });
  };

  const save = () => { onChange?.(draft); setOpen(false); };
  const cancel = () => { setDraft(value || ''); setOpen(false); };

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <BufferedTextarea
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          onClick={() => !readOnly && setOpen(true)}
          readOnly={readOnly}
          placeholder={placeholder}
          rows={rows}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 32px 10px 12px',
            border: '1px solid #e8e4df',
            borderRadius: 8,
            fontSize: 13,
            color: '#1a1a2e',
            background: '#faf9f7',
            resize: 'none',
            cursor: 'pointer',
            lineHeight: 1.4,
            ...collapsedStyle,
          }}
        />
        <Maximize2
          size={13}
          color="#b0b8c4"
          strokeWidth={2}
          onClick={() => !readOnly && setOpen(true)}
          style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer' }}
        />
      </div>

      {open && (
        <div
          onClick={cancel}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,20,40,0.55)',
            backdropFilter: 'blur(4px)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 820,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
            }}
          >
            {/* Toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '14px 18px', borderBottom: '1px solid #f0ede8',
            }}>
              <button onClick={() => wrapSelection('**')} title="Fet" style={tbBtn}>
                <Bold size={15} strokeWidth={2.4} />
              </button>
              <button onClick={() => wrapSelection('*')} title="Kursiv" style={tbBtn}>
                <Italic size={15} strokeWidth={2.4} />
              </button>
              <div style={{ width: 1, height: 22, background: '#f0ede8', margin: '0 6px' }} />
              <span style={{ fontSize: 12, color: '#7a8394' }}>Radavstånd</span>
              <input
                type="range" min="1" max="2.4" step="0.1"
                value={lineHeight}
                onChange={e => setLineHeight(parseFloat(e.target.value))}
                style={{ width: 110 }}
              />
              <span style={{ fontSize: 12, color: '#b0b8c4', width: 30 }}>{lineHeight.toFixed(1)}</span>
              <div style={{ flex: 1 }} />
              <button onClick={cancel} title="Stäng" style={{ ...tbBtn, color: '#7a8394' }}>
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <textarea
              ref={taRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              placeholder={placeholder}
              style={{
                flex: 1, minHeight: 260, padding: '20px 24px', border: 'none',
                outline: 'none', resize: 'none', fontSize: 15, color: '#1a1a2e',
                lineHeight, fontFamily: 'inherit', background: '#ffffff',
              }}
            />

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '14px 18px', borderTop: '1px solid #f0ede8', background: '#faf9f7',
            }}>
              <button onClick={cancel} style={{
                padding: '9px 18px', background: '#ffffff', border: '1px solid #e8e4df',
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer',
              }}>Avbryt</button>
              <button onClick={save} style={{
                padding: '9px 22px',
                background: 'linear-gradient(135deg, #6B7FD4, #9B5FD4)',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: '#ffffff', cursor: 'pointer',
              }}>Spara</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const tbBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, background: '#faf9f7', border: '1px solid #e8e4df',
  borderRadius: 6, cursor: 'pointer', color: '#1a1a2e',
};
