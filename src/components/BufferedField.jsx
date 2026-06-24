import { useState, useEffect, useRef } from 'react';

/**
 * BufferedInput / BufferedTextarea
 *
 * Drop-in replacement for native <input>/<textarea> that keeps its own local
 * state and only pushes updates to the parent ~350 ms after the user stops
 * typing (or immediately on blur). This prevents fast typing from twitching
 * or lagging when the parent re-renders / persists on every keystroke.
 *
 * Accepts all native props. `onChange` is invoked with the synthetic event,
 * same as a native input — but debounced.
 */
function useBuffered(value, onChange, delay = 350) {
  const [local, setLocal] = useState(value ?? '');
  const timer = useRef(null);
  const dirty = useRef(false);
  const latest = useRef(local);

  useEffect(() => {
    if (!dirty.current) {
      setLocal(value ?? '');
      latest.current = value ?? '';
    }
  }, [value]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    dirty.current = true;
    latest.current = v;
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    // Synthesize a stable event-like object for the debounced call
    const synthetic = { target: { value: v } };
    timer.current = setTimeout(() => {
      dirty.current = false;
      timer.current = null;
      onChange?.(synthetic);
    }, delay);
  };

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (dirty.current) {
      dirty.current = false;
      onChange?.({ target: { value: latest.current } });
    }
  };

  return { local, handleChange, flush };
}

export function BufferedInput({ value, onChange, onBlur, delay = 350, ...rest }) {
  const { local, handleChange, flush } = useBuffered(value, onChange, delay);
  return (
    <input
      {...rest}
      value={local}
      onChange={handleChange}
      onBlur={(e) => { flush(); onBlur?.(e); }}
    />
  );
}

export function BufferedTextarea({ value, onChange, onBlur, onClick, delay = 350, ...rest }) {
  const { local, handleChange, flush } = useBuffered(value, onChange, delay);
  return (
    <textarea
      {...rest}
      value={local}
      onChange={handleChange}
      onBlur={(e) => { flush(); onBlur?.(e); }}
      onClick={onClick}
    />
  );
}
