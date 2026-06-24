import { Plus, X } from 'lucide-react';

/**
 * Inline editor for "Extra kostnader" tied to a product line.
 *
 * Props:
 *   rows        – Array<{ key, description, amount }>   (key = stable local id)
 *   onAdd       – () => void                            (adds a new empty row)
 *   onChange    – (key, field, value) => void
 *   onRemove    – (key) => void
 *   disabled?   – boolean
 */
export default function ExtraCostsEditor({ rows = [], onAdd, onChange, onRemove, onRowBlur, disabled = false }) {
  const hasRows = rows.length > 0;

  return (
    <div style={{ marginTop: 8 }}>
      {hasRows && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '10px 12px',
          background: 'var(--muted)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
          marginBottom: 6,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 2,
          }}>
            Extra kostnader
          </div>
          {rows.map((r) => {
            const labelMissing = (r.amount !== '' && r.amount !== null && r.amount !== undefined && Number(r.amount) !== 0)
              && (!r.description || !String(r.description).trim());
            return (
              <div key={r.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Beskrivning"
                  value={r.description ?? ''}
                  onChange={(e) => onChange(r.key, 'description', e.target.value)}
                  onBlur={() => onRowBlur && onRowBlur(r.key)}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    border: `1px solid ${labelMissing ? '#E8A838' : 'var(--border)'}`,
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--foreground)',
                    background: 'var(--card)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={r.amount ?? ''}
                    onChange={(e) => onChange(r.key, 'amount', e.target.value)}
                    onBlur={() => onRowBlur && onRowBlur(r.key)}
                    disabled={disabled}
                    style={{
                      width: 100,
                      padding: '7px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      fontSize: 12,
                      color: 'var(--foreground)',
                      background: 'var(--card)',
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)' }}>kr</span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemove(r.key)}
                    title="Ta bort"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      color: 'var(--muted-foreground)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <X size={12} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            background: 'transparent',
            border: '1px dashed var(--border)',
            borderRadius: 6,
            color: 'var(--muted-foreground)',
            fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          Extra kostnad
        </button>
      )}
    </div>
  );
}

/** Read-only display, used in non-editable product cards. */
export function ExtraCostsReadOnly({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <div style={{
      marginTop: 8,
      padding: '8px 12px',
      background: 'var(--muted)',
      border: '1px dashed var(--border)',
      borderRadius: 8,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 4,
      }}>
        Extra kostnader
      </div>
      {rows.map((r) => (
        <div key={r.key || r.id} style={{
          display: 'flex', justifyContent: 'space-between', gap: 8,
          fontSize: 12, color: 'var(--foreground)', padding: '2px 0',
        }}>
          <span style={{ color: 'var(--muted-foreground)' }}>{r.description || '—'}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {Number(r.amount || 0).toLocaleString('sv-SE')} kr
          </span>
        </div>
      ))}
    </div>
  );
}
