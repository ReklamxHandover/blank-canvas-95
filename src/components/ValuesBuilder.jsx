import { useState } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * Hierarchical values builder — 4 levels max.
 * Levels: Value > Option > Sub-Option > Sub-Sub-Option.
 * Stored as { id, label, children: [...] } inside the item.
 *
 * Visual: native to the warm offer-card language. Uses a soft left accent rail
 * tinted per depth, gentle indentation, and minimal chrome.
 */

const MAX_DEPTH = 4; // 1=Value, 2=Option, 3=Sub-Option, 4=Sub-Sub-Option

const LEVEL_LABELS_SV = ['Värde', 'Alternativ', 'Underalternativ', 'Under-underalternativ'];
const LEVEL_ADD_SV = ['Lägg till värde', 'Lägg till alternativ', 'Lägg till underalternativ', 'Lägg till under-underalternativ'];

// Soft palette in the app's warm/cool language — one tint per depth
const LEVEL_ACCENT = ['#6B7FD4', '#9B5FD4', '#D49B6B', '#7FB6A8'];
const LEVEL_TINT  = ['#6B7FD414', '#9B5FD414', '#D49B6B14', '#7FB6A814'];

let __vid = 0;
const newNode = (label = '') => ({ id: `v${Date.now().toString(36)}${(++__vid).toString(36)}`, label, children: [] });

export default function ValuesBuilder({ values = [], onChange }) {
  const update = (next) => onChange(next);

  const addRoot = () => update([...(values || []), newNode()]);

  const handleLabel = (path, label) => {
    const recurse = (nodes, p) => {
      if (p.length === 1) return nodes.map(n => n.id === p[0] ? { ...n, label } : n);
      const [head, ...rest] = p;
      return nodes.map(n => n.id === head ? { ...n, children: recurse(n.children || [], rest) } : n);
    };
    update(recurse(values, path));
  };

  const handleAddChild = (path) => {
    const recurse = (nodes, p) => {
      if (p.length === 1) {
        return nodes.map(n => n.id === p[0]
          ? { ...n, children: [...(n.children || []), newNode()] }
          : n);
      }
      const [head, ...rest] = p;
      return nodes.map(n => n.id === head ? { ...n, children: recurse(n.children || [], rest) } : n);
    };
    update(recurse(values, path));
  };


  const handleRemove = (path) => {
    const recurse = (nodes, p) => {
      if (p.length === 1) return nodes.filter(n => n.id !== p[0]);
      const [head, ...rest] = p;
      return nodes.map(n => n.id === head ? { ...n, children: recurse(n.children || [], rest) } : n);
    };
    update(recurse(values, path));
  };

  const hasAny = (values || []).length > 0;

  return (
    <div style={{ marginTop: 10 }}>
      {hasAny && (
        <div style={{
          background: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '8px 10px 4px',
          marginBottom: 8,
        }}>
          {values.map(node => (
            <NodeRow
              key={node.id}
              node={node}
              depth={0}
              path={[node.id]}
              onLabel={handleLabel}
              onAddChild={handleAddChild}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addRoot}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px',
          background: 'transparent',
          border: '1px dashed var(--border)',
          borderRadius: 999,
          color: 'var(--muted-foreground)',
          fontSize: 12, fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Plus size={13} strokeWidth={2.5} />
        {LEVEL_ADD_SV[0]}
      </button>
    </div>
  );
}

function NodeRow({ node, depth, path, onLabel, onAddChild, onRemove }) {
  const accent = LEVEL_ACCENT[depth];
  const tint = LEVEL_TINT[depth];
  const canHaveChild = depth + 1 < MAX_DEPTH;
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        marginLeft: depth === 0 ? 0 : 14,
        paddingLeft: 10,
        borderLeft: depth === 0 ? 'none' : `2px solid ${tint}`,
        marginBottom: 6,
      }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 6px 4px 8px',
          borderRadius: 8,
          background: hover ? 'color-mix(in oklab, var(--foreground) 6%, transparent)' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: accent, flexShrink: 0,
        }} />
        <input
          type="text"
          value={node.label}
          onChange={e => onLabel(path, e.target.value)}
          placeholder={LEVEL_LABELS_SV[depth]}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: depth === 0 ? 13 : 12.5,
            fontWeight: depth === 0 ? 600 : 500,
            color: depth === 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
            padding: '2px 0',
            minWidth: 0,
          }}
        />
        {canHaveChild && (
          <button
            type="button"
            onClick={() => onAddChild(path)}
            title={LEVEL_ADD_SV[depth + 1]}
            style={iconBtn(accent, hover)}
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(path)}
          title="Ta bort"
          style={{
            ...iconBtn('#D96B6B', hover),
            opacity: hover ? 1 : 0.35,
          }}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {(node.children || []).length > 0 && (
        <div style={{ marginTop: 2 }}>
          {node.children.map(child => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              path={[...path, child.id]}
              onLabel={onLabel}
              onAddChild={onAddChild}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function iconBtn(color, visible) {
  return {
    width: 22, height: 22,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6,
    border: 'none',
    background: visible ? `${color}14` : 'transparent',
    color,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.12s, opacity 0.12s',
  };
}
