import { useState } from 'react';
import { X, Trash2, Plus, MapPin, Bell, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '../context/AppContext.jsx';

// Unified calendar event modal. Always kind='event'. Tasks have their own detail modal.
export default function CalendarItemModal({ initial, users, onClose, onSaved, onDeleted, defaultDate }) {
  const { currentUser } = useApp();
  const isEdit = !!initial?.id;
  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [startDate, setStartDate] = useState(initial?.event_date || defaultDate || '');
  const [startTime, setStartTime] = useState(initial?.event_time ? initial.event_time.slice(0, 5) : '');
  const [endDate, setEndDate] = useState(initial?.end_date || initial?.event_date || defaultDate || '');
  const [endTime, setEndTime] = useState(initial?.end_time ? initial.end_time.slice(0, 5) : '');
  const [location, setLocation] = useState(initial?.location || '');
  const [visibleTo, setVisibleTo] = useState(initial?.visible_to || []);
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to || '');
  const [reminderAt, setReminderAt] = useState(initial?.reminder_at ? toLocalDtInput(initial.reminder_at) : '');
  const [recurrence, setRecurrence] = useState(initial?.recurrence || '');
  const [subtasks, setSubtasks] = useState(Array.isArray(initial?.subtasks) ? initial.subtasks : []);
  const [newSub, setNewSub] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const canSubmit = title.trim() && startDate;

  const toggleVis = (id) => {
    setVisibleTo(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  };

  const addSub = () => {
    if (!newSub.trim()) return;
    setSubtasks(s => [...s, { id: crypto.randomUUID(), title: newSub.trim(), done: false }]);
    setNewSub('');
  };
  const toggleSub = (id) => setSubtasks(s => s.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const rmSub = (id) => setSubtasks(s => s.filter(x => x.id !== id));

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSaving(true); setErr('');
    try {
      const payload = {
        title: title.trim(),
        description: description || null,
        event_date: startDate,
        event_time: startTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
        location: location || null,
        assigned_to: assignedTo || null,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
        recurrence: recurrence || null,
        subtasks,
        visible_to: isAdmin ? (visibleTo.length ? visibleTo : null) : (initial?.visible_to ?? null),
      };
      if (isEdit) {
        const { error } = await supabase.from('calendar_events').update(payload).eq('id', initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('calendar_events')
          .insert({ ...payload, created_by: currentUser?.id || null });
        if (error) throw error;
      }
      onSaved?.();
      onClose();
    } catch (e2) {
      setErr(e2?.message || 'Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isEdit) return;
    if (onDeleted) { onDeleted(initial); onClose(); }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSave} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>
            {isEdit ? 'Redigera händelse' : 'Ny händelse'}
          </h3>
          <button type="button" onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>

        <Field label="Titel *">
          <input value={title} onChange={e => setTitle(e.target.value)} required style={input} autoFocus />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Startdatum *">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={input} />
          </Field>
          <Field label="Starttid">
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={input} />
          </Field>
          <Field label="Slutdatum">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={input} />
          </Field>
          <Field label="Sluttid">
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={input} />
          </Field>
        </div>

        {isAdmin && (
          <Field label="Synlig för (lämna tom = alla)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 6, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--muted)' }}>
              {users.map(u => {
                const active = visibleTo.includes(u.id);
                return (
                  <button type="button" key={u.id} onClick={() => toggleVis(u.id)} style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                    background: active ? 'var(--foreground)' : 'var(--card)',
                    color: active ? 'var(--primary-foreground)' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}>{u.full_name || u.id.slice(0,6)}</button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Lägg till plats">
          <div style={{ position: 'relative' }}>
            <MapPin size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Plats" style={{ ...input, paddingLeft: 30 }} />
          </div>
        </Field>

        <Field label="Anteckningar">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
        </Field>

        <Field label="Tilldelad till">
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={input}>
            <option value="">— Ingen —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.id}</option>)}
          </select>
        </Field>

        <Field label="Påminnelse">
          <div style={{ position: 'relative' }}>
            <Bell size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input type="datetime-local" value={reminderAt} onChange={e => setReminderAt(e.target.value)} style={{ ...input, paddingLeft: 30 }} />
          </div>
        </Field>

        <Field label="Upprepning">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[['', 'Ingen'], ['daily', 'Dagligen'], ['weekly', 'Veckovis'], ['monthly', 'Månadsvis']].map(([v, l]) => (
              <button type="button" key={v || 'none'} onClick={() => setRecurrence(v)} style={{
                padding: '5px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                background: recurrence === v ? 'var(--foreground)' : 'var(--card)',
                color: recurrence === v ? 'var(--primary-foreground)' : 'var(--foreground)',
                border: '1px solid var(--border)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}><RefreshCw size={11} /> {l}</button>
            ))}
          </div>
        </Field>

        <Field label="Checklista">
          <div>
            {subtasks.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <input type="checkbox" checked={s.done} onChange={() => toggleSub(s.id)} />
                <span style={{ flex: 1, fontSize: 13, textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.55 : 1, color: 'var(--foreground)' }}>{s.title}</span>
                <button type="button" onClick={() => rmSub(s.id)} style={iconBtn}><X size={13} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input value={newSub} onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
                placeholder="Lägg till punkt" style={input} />
              <button type="button" onClick={addSub} style={btnSecondary}><Plus size={13} /></button>
            </div>
          </div>
        </Field>

        {err && <div style={{ color: '#D96B6B', fontSize: 12, marginTop: 8 }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 8 }}>
          <div>
            {isEdit && (
              <button type="button" onClick={handleDelete} style={{ ...btnSecondary, color: '#D96B6B' }}>
                <Trash2 size={14} /> Ta bort
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Avbryt</button>
            <button type="submit" disabled={!canSubmit || saving} style={{ ...btnPrimary, opacity: (!canSubmit || saving) ? 0.5 : 1 }}>
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}

function toLocalDtInput(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(20,20,30,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16,
};
const modal = {
  background: 'var(--card)', borderRadius: 14, padding: 22, width: 540, maxWidth: '92vw',
  maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1px solid var(--border)',
};
const input = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 13, background: 'var(--muted)', color: 'var(--foreground)',
  boxSizing: 'border-box', outline: 'none',
};
const iconBtn = {
  background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4,
};
const btnPrimary = {
  background: 'var(--foreground)', color: 'var(--primary-foreground)', border: 'none', padding: '8px 16px',
  borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer',
};
const btnSecondary = {
  background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '8px 14px',
  borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};
