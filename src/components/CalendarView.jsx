import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, CheckSquare, CalendarDays, Flag,
  Send, X, Trash2, Phone, Check, ShoppingBag, Mail, Calendar as CalIcon, Sparkles, MapPin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { deadlineRowTint, isOrderOverdue } from '../lib/deadline.js';
import CalendarItemModal from './CalendarItemModal.jsx';

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function keyFor(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function ymd(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function bucketToDueDate(bucket) {
  const now = new Date();
  if (bucket === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    return d.toISOString();
  }
  if (bucket === 'tomorrow') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
    return d.toISOString();
  }
  return null;
}

function dueDateToBucket(due) {
  if (!due) return 'someday';
  const d = new Date(due);
  const today = new Date();
  if (sameDay(d, today)) return 'today';
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (sameDay(d, tomorrow)) return 'tomorrow';
  if (d > today) return 'upcoming';
  return 'today';
}

export default function CalendarView() {
  const { orders, setSelectedOrderId, getClient, currentUser, updateOrder } = useApp();
  const { lang } = useLang();
  const t = (sv, en) => (lang === 'sv' ? sv : en);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);

  const [showDeadlines, setShowDeadlines] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const [editingEvent, setEditingEvent] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [creatingDate, setCreatingDate] = useState(null); // YYYY-MM-DD

  const [dragOverKey, setDragOverKey] = useState(null);

  // toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showUndoToast = (kind, row) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, row });
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  };

  const reload = useCallback(async () => {
    const [tk, ev] = await Promise.all([
      supabase.from('calendar_tasks').select('*').is('deleted_at', null),
      supabase.from('calendar_events').select('*').is('deleted_at', null),
    ]);
    if (!tk.error && tk.data) setTasks(tk.data);
    if (!ev.error && ev.data) setEvents(ev.data);
  }, []);

  useEffect(() => {
    reload();
    supabase.from('profiles').select('id, full_name').then(({ data }) => {
      if (data) setUsers(data);
    });
  }, [reload]);

  const locale = lang === 'sv' ? 'sv-SE' : 'en-US';
  const today = new Date();
  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const visibleEvents = useMemo(() => {
    if (isAdmin) return events;
    return events.filter(e => !e.visible_to || e.visible_to.length === 0 || e.visible_to.includes(currentUser?.id));
  }, [events, isAdmin, currentUser]);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const dow = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - dow);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const ordersByDay = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (!o.deadline || o.deletedAt) continue;
      const d = new Date(o.deadline);
      if (isNaN(d.getTime())) continue;
      const k = keyFor(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(o);
    }
    return map;
  }, [orders]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    for (const tk of tasks) {
      if (!tk.due_date) continue;
      const d = new Date(tk.due_date);
      const k = keyFor(d);
      // Completed tasks only appear in the cell of the day they were completed
      if (tk.completed) {
        if (!tk.completed_at) continue;
        const cd = new Date(tk.completed_at);
        if (!sameDay(cd, d)) continue;
      }
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(tk);
    }
    return map;
  }, [tasks]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const e of visibleEvents) {
      if (!e.event_date) continue;
      const [y, m, dy] = e.event_date.split('-').map(Number);
      const k = `${y}-${m - 1}-${dy}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    return map;
  }, [visibleEvents]);

  const tasksByBucket = useMemo(() => {
    const m = { today: [], tomorrow: [], upcoming: [], someday: [] };
    for (const x of tasks) {
      if (x.completed) continue;
      const b = x.bucket || dueDateToBucket(x.due_date);
      if (m[b]) m[b].push(x);
    }
    return m;
  }, [tasks]);

  const finishedToday = useMemo(() => {
    const t0 = new Date();
    return tasks.filter(x => {
      if (!x.completed || !x.completed_at) return false;
      const d = new Date(x.completed_at);
      return sameDay(d, t0);
    });
  }, [tasks]);

  // ---------- task ops ----------
  const toggleComplete = async (task) => {
    const next = !task.completed;
    const patch = next
      ? { completed: true, completed_at: new Date().toISOString(), completed_by: currentUser?.id || null }
      : { completed: false, completed_at: null, completed_by: null };
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, ...patch } : x));
    await supabase.from('calendar_tasks').update(patch).eq('id', task.id);
  };

  const softDeleteTask = async (task) => {
    setTasks(prev => prev.filter(x => x.id !== task.id));
    await supabase.from('calendar_tasks').update({ deleted_at: new Date().toISOString() }).eq('id', task.id);
    showUndoToast('task', task);
  };

  const softDeleteEvent = async (ev) => {
    setEvents(prev => prev.filter(x => x.id !== ev.id));
    await supabase.from('calendar_events').update({ deleted_at: new Date().toISOString() }).eq('id', ev.id);
    showUndoToast('event', ev);
  };

  const undoDelete = async () => {
    if (!toast) return;
    const { kind, row } = toast;
    const table = kind === 'task' ? 'calendar_tasks' : 'calendar_events';
    await supabase.from(table).update({ deleted_at: null }).eq('id', row.id);
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    reload();
  };

  const createTask = async ({ title, bucket }) => {
    const payload = {
      title: title.trim(),
      bucket,
      due_date: bucketToDueDate(bucket),
      created_by: currentUser?.id || null,
      visibility: 'personal',
      completed: false,
      points: 0,
    };
    const { data, error } = await supabase.from('calendar_tasks').insert(payload).select().single();
    if (!error && data) setTasks(prev => [...prev, data]);
  };

  const saveTaskPatch = async (task, patch) => {
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, ...patch } : x));
    await supabase.from('calendar_tasks').update(patch).eq('id', task.id);
  };

  // ---------- drag handlers ----------
  const moveTaskToBucket = async (taskId, bucket) => {
    const task = tasks.find(x => x.id === taskId);
    if (!task) return;
    const patch = { bucket, due_date: bucketToDueDate(bucket) };
    saveTaskPatch(task, patch);
  };

  const moveTaskToDate = async (taskId, dateStr) => {
    const task = tasks.find(x => x.id === taskId);
    if (!task) return;
    const d = new Date(`${dateStr}T09:00:00`);
    const patch = { due_date: d.toISOString(), bucket: dueDateToBucket(d.toISOString()) };
    saveTaskPatch(task, patch);
  };

  const moveEventToDate = async (eventId, dateStr) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, event_date: dateStr } : e));
    await supabase.from('calendar_events').update({ event_date: dateStr }).eq('id', eventId);
  };

  const moveOrderToDate = async (orderId, dateStr) => {
    const d = new Date(`${dateStr}T17:00:00`);
    await updateOrder(orderId, { deadline: d.toISOString() }, `Deadline flyttad till ${dateStr}`);
  };

  const handleDayDrop = (e, day) => {
    e.preventDefault();
    setDragOverKey(null);
    const taskId = e.dataTransfer.getData('app/task');
    const eventId = e.dataTransfer.getData('app/event');
    const orderId = e.dataTransfer.getData('app/order');
    const dateStr = ymd(day);
    if (taskId) moveTaskToDate(taskId, dateStr);
    else if (eventId) moveEventToDate(eventId, dateStr);
    else if (orderId) moveOrderToDate(orderId, dateStr);
  };

  const weekdayLabels = lang === 'sv'
    ? ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthTitle = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <div className="responsive-cal-root" style={{ maxWidth: 1500, margin: '0 auto', display: 'flex', gap: 20 }}>
      <style>{`
        @keyframes calSlideDown { from { opacity: 0; transform: translateY(-10px); max-height:0; } to { opacity: 1; transform: translateY(0); max-height: 60px; } }
        @keyframes calSlideUp { from { opacity: 0; transform: translateY(10px); max-height:0; } to { opacity: 1; transform: translateY(0); max-height: 60px; } }
        .cal-finish-enter { animation: calSlideDown 0.32s ease-out both; }
        .cal-bucket-enter { animation: calSlideUp 0.32s ease-out both; }
      `}</style>

      <aside className="responsive-cal-aside" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {t('Visa', 'Show')}
          </div>
          <FilterCheck color="#1a1a2e" icon={<Flag size={13} />} label={t('Deadlines', 'Deadlines')} checked={showDeadlines} onChange={setShowDeadlines} />
          <FilterCheck color="#6B7FD4" icon={<CheckSquare size={13} />} label={t('Uppgifter', 'Tasks')} checked={showTasks} onChange={setShowTasks} />
          <FilterCheck color="#4CAF88" icon={<CalendarDays size={13} />} label={t('Händelser', 'Events')} checked={showEvents} onChange={setShowEvents} />
        </div>

        <TaskPanel
          t={t}
          tasksByBucket={tasksByBucket}
          finishedToday={finishedToday}
          onToggle={toggleComplete}
          onDelete={softDeleteTask}
          onOpen={(task) => setTaskDetail(task)}
          onCreate={createTask}
          onDropBucket={moveTaskToBucket}
        />
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--foreground)', margin: 0, textTransform: 'capitalize' }}>
            {monthTitle}
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCursor(addMonths(cursor, -1))} style={navBtn}><ChevronLeft size={16} /></button>
            <button onClick={() => setCursor(startOfMonth(new Date()))} style={{ ...navBtn, width: 'auto', padding: '0 14px', fontSize: 13, fontWeight: 500 }}>
              {t('Månad', 'Month')}
            </button>
            <button onClick={() => setCursor(addMonths(cursor, 1))} style={navBtn}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
            {weekdayLabels.map(w => (
              <div key={w} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {w}
              </div>
            ))}
          </div>

          <div className="responsive-cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, 1fr)', width: '100%' }}>
            {grid.map((day, idx) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = sameDay(day, today);
              const k = keyFor(day);
              const dayOrders = showDeadlines ? (ordersByDay.get(k) || []) : [];
              const dayTasks = showTasks ? (tasksByDay.get(k) || []) : [];
              const dayEvents = showEvents ? (eventsByDay.get(k) || []) : [];
              const isRightEdge = (idx + 1) % 7 === 0;
              const isBottomRow = idx >= 35;
              const isDragOver = dragOverKey === k;

              return (
                <div key={idx}
                  data-in-month={inMonth}
                  onClick={() => setCreatingDate(ymd(day))}
                  onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
                  onDragLeave={() => setDragOverKey(prev => prev === k ? null : prev)}
                  onDrop={(e) => handleDayDrop(e, day)}
                  style={{
                    position: 'relative',
                    borderRight: isRightEdge ? 'none' : '1px solid var(--border)',
                    borderBottom: isBottomRow ? 'none' : '1px solid var(--border)',
                    padding: 6, background: inMonth ? 'var(--card)' : 'var(--background)',
                    display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0, height: '100%',
                    cursor: 'pointer',
                    outline: isToday ? '2px solid var(--primary)' : (isDragOver ? '2px dashed var(--primary)' : 'none'),
                    outlineOffset: '-2px',
                    borderRadius: isToday || isDragOver ? 8 : 0,
                    transition: 'background 0.15s',
                  }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 500,
                    color: !inMonth ? 'var(--muted-foreground)' : 'var(--foreground)',
                    padding: '2px 4px',
                    alignSelf: 'flex-start',
                  }}>{day.getDate()}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1, minHeight: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {dayOrders.map(o => {
                      const overdue = isOrderOverdue(o);
                      const client = getClient(o.clientId);
                      return (
                        <button
                          key={`o-${o.id}`}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('app/order', String(o.id)); e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); setSelectedOrderId(o.id); }}
                          title={`${o.id} · ${client?.companyName || ''}`}
                          style={{
                            background: 'var(--muted)',
                            border: overdue ? '1px solid var(--destructive)' : '1px solid var(--border)',
                            borderLeft: `3px solid ${overdue ? 'var(--destructive)' : 'var(--foreground)'}`,
                            borderRadius: 6, padding: '4px 7px',
                            fontSize: 11, fontWeight: 500, color: 'var(--foreground)',
                            textAlign: 'left', cursor: 'grab',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          <span style={{ fontWeight: 700, marginRight: 5, color: 'var(--foreground)' }}>{o.id}</span>
                          {client?.companyName || ''}
                        </button>
                      );
                    })}

                    {dayTasks.map(tk => (
                      <button
                        key={`t-${tk.id}`}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('app/task', tk.id); e.stopPropagation(); }}
                        onClick={(e) => { e.stopPropagation(); setTaskDetail(tk); }}
                        title={tk.title}
                        style={{ ...pill('#6B7FD4', tk.completed), cursor: 'grab' }}
                      >
                        <CheckSquare size={10} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: tk.completed ? 'line-through' : 'none' }}>{tk.title}</span>
                      </button>
                    ))}

                    {dayEvents.map(e => (
                      <button
                        key={`e-${e.id}`}
                        draggable
                        onDragStart={(ev) => { ev.dataTransfer.setData('app/event', e.id); ev.stopPropagation(); }}
                        onClick={(ev) => { ev.stopPropagation(); setEditingEvent(e); }}
                        title={e.title}
                        style={{ ...pill('#4CAF88', false), cursor: 'grab' }}
                      >
                        <CalendarDays size={10} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingEvent && (
        <CalendarItemModal
          initial={editingEvent}
          users={users}
          onClose={() => setEditingEvent(null)}
          onSaved={reload}
          onDeleted={(row) => { setEditingEvent(null); softDeleteEvent(row); }}
        />
      )}

      {creatingDate && (
        <CalendarItemModal
          defaultDate={creatingDate}
          users={users}
          onClose={() => setCreatingDate(null)}
          onSaved={reload}
        />
      )}

      {taskDetail && (
        <TaskDetailModal
          t={t}
          task={taskDetail}
          users={users}
          currentUser={currentUser}
          onClose={() => setTaskDetail(null)}
          onSave={(patch) => saveTaskPatch(taskDetail, patch)}
          onDelete={() => { const row = taskDetail; setTaskDetail(null); softDeleteTask(row); }}
          onComplete={() => { toggleComplete(taskDetail); setTaskDetail(null); }}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 24,
          background: 'var(--foreground)', color: 'var(--primary-foreground)', borderRadius: 10, padding: '12px 18px',
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)', zIndex: 90,
        }}>
          <span>
            {toast.kind === 'task'
              ? t('Du tog bort en uppgift', 'You deleted a task')
              : t('Du tog bort en händelse', 'You deleted an event')}
          </span>
          <button onClick={undoDelete} style={{
            background: 'transparent', border: 'none', color: '#6B7FD4',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0,
          }}>{t('Ångra', 'Undo')}</button>
        </div>
      )}
    </div>
  );
}

// =================== Task Panel ===================
function TaskPanel({ t, tasksByBucket, finishedToday, onToggle, onDelete, onOpen, onCreate, onDropBucket }) {
  const [bucket, setBucket] = useState('today');
  const [value, setValue] = useState('');
  const [mode, setMode] = useState('idle');
  const [collapsed, setCollapsed] = useState({ today: false, tomorrow: false, upcoming: true, someday: true, done: false });
  const [dragBucket, setDragBucket] = useState(null);
  const [strikeIds, setStrikeIds] = useState(new Set()); // tasks waiting for strikethrough removal before slide
  const inputRef = useRef(null);
  const toggleCollapsed = (k) => setCollapsed(prev => ({ ...prev, [k]: !prev[k] }));

  const sections = [
    { key: 'today', label: t('Idag', 'Today') },
    { key: 'tomorrow', label: t('Imorgon', 'Tomorrow') },
    { key: 'upcoming', label: t('Kommande', 'Upcoming') },
    { key: 'someday', label: t('Någon gång', 'Someday') },
  ];

  const handleCheck = (task) => {
    if (task.completed) {
      // uncheck: remove strikethrough first, then unmark after 200ms
      setStrikeIds(prev => { const n = new Set(prev); n.add(task.id); return n; });
      setTimeout(() => {
        setStrikeIds(prev => { const n = new Set(prev); n.delete(task.id); return n; });
        onToggle(task);
      }, 220);
    } else {
      onToggle(task);
    }
  };

  const bucketLabel = sections.find(s => s.key === bucket)?.label || sections[0].label;
  const placeholder = `${bucketLabel} — ${t('jag vill...', 'I want to...')}`;

  const targetBucket = (b) => {
    setBucket(b);
    setMode('typing');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handlePlusClick = () => {
    if (value.trim()) return submit();
    setMode(mode === 'verbs' ? 'idle' : 'verbs');
  };

  const submit = async () => {
    const text = value.trim();
    if (!text) return;
    await onCreate({ title: text, bucket });
    setValue('');
    setMode('idle');
  };

  const onFocus = () => { if (mode !== 'verbs') setMode('typing'); };
  const onBlur = () => { if (!value) setMode('idle'); };

  const verbs = [
    { label: t('Ring', 'Call'), icon: Phone, verb: t('Ring ', 'Call ') },
    { label: t('Kolla', 'Check'), icon: Check, verb: t('Kolla ', 'Check ') },
    { label: t('Hämta', 'Get'), icon: ShoppingBag, verb: t('Hämta ', 'Get ') },
    { label: t('E-post', 'Email'), icon: Mail, verb: t('Mejla ', 'Email ') },
    { label: t('Köp', 'Buy'), icon: ShoppingBag, verb: t('Köp ', 'Buy ') },
    { label: t('Möte', 'Meet'), icon: CalIcon, verb: t('Boka möte ', 'Schedule meeting ') },
    { label: t('Städa', 'Clean'), icon: Sparkles, verb: t('Städa ', 'Clean ') },
  ];

  const chips = [
    { label: t('Imorgon morgon', 'Tomorrow morning'), bucket: 'tomorrow' },
    { label: t('Nästa vecka', 'Next week'), bucket: 'upcoming' },
    { label: t('Idag', 'Today'), bucket: 'today' },
    { label: t('Någon gång', 'Someday'), bucket: 'someday' },
  ];

  const pickVerb = (v) => {
    setValue(v);
    setMode('typing');
    setTimeout(() => {
      inputRef.current?.focus();
      const el = inputRef.current;
      if (el) el.setSelectionRange(v.length, v.length);
    }, 0);
  };

  const pickChip = (b) => setBucket(b);

  const showVerbs = mode === 'verbs' && !value.trim();
  const showChips = mode === 'typing';
  const showSend = value.trim().length > 0;

  const onBucketDragOver = (e, key) => { e.preventDefault(); setDragBucket(key); };
  const onBucketDrop = (e, key) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('app/task');
    setDragBucket(null);
    if (id) onDropBucket(id, key);
  };

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
      display: 'flex', flexDirection: 'column', overflow: 'visible',
    }}>
      <div style={{ padding: 12 }}>
        {sections.map(s => {
          const list = tasksByBucket[s.key] || [];
          const isCollapsed = collapsed[s.key];
          const isDragOver = dragBucket === s.key;
          return (
            <div key={s.key}
              onDragOver={(e) => onBucketDragOver(e, s.key)}
              onDragLeave={() => setDragBucket(prev => prev === s.key ? null : prev)}
              onDrop={(e) => onBucketDrop(e, s.key)}
              style={{
                marginBottom: 16,
                borderRadius: 8,
                outline: isDragOver ? '2px dashed var(--primary)' : 'none',
                outlineOffset: 2,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 6px' }}>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(s.key)}
                  style={sectionHeaderBtn}
                  aria-expanded={!isCollapsed}
                >
                  <ChevronRight size={12} style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                  {s.label} {list.length > 0 && <span style={{ color: 'var(--muted-foreground)', marginLeft: 4 }}>{list.length}</span>}
                </button>
                <button onClick={() => targetBucket(s.key)} style={sectionAddBtn} title={t('Lägg till', 'Add')}>
                  <Plus size={13} />
                </button>
              </div>
              {!isCollapsed && list.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '2px 4px' }}>—</div>
              )}
              {!isCollapsed && list.map(task => (
                <TaskRow key={task.id} className="cal-bucket-enter"
                  task={task} strike={false} t={t}
                  onToggle={() => handleCheck(task)}
                  onOpen={() => onOpen(task)}
                  onDelete={() => onDelete(task)}
                />
              ))}
            </div>
          );
        })}

        {/* Finished section */}
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button type="button" onClick={() => toggleCollapsed('done')} style={{ ...sectionHeaderBtn, color: '#4CAF88' }}>
            <ChevronRight size={12} style={{ transform: collapsed.done ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
            {t('Klara uppgifter', 'Finished tasks')}
            {finishedToday.length > 0 && <span style={{ marginLeft: 4 }}>{finishedToday.length}</span>}
          </button>
          {!collapsed.done && (
            finishedToday.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '2px 4px' }}>—</div>
              : finishedToday.map(task => (
                <TaskRow key={task.id} className="cal-finish-enter"
                  task={task} strike={!strikeIds.has(task.id)} t={t}
                  onToggle={() => handleCheck(task)}
                  onOpen={() => onOpen(task)}
                  onDelete={() => onDelete(task)}
                />
              ))
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: 10, position: 'relative' }}>
        {showVerbs && (
          <div style={{
            position: 'absolute', left: 10, right: 10, bottom: 'calc(100% + 6px)',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            display: 'flex', flexWrap: 'wrap', gap: 6, zIndex: 10,
          }}>
            {verbs.map(v => {
              const Icon = v.icon;
              return (
                <button key={v.label} onClick={() => pickVerb(v.verb)} style={verbBtn}>
                  <Icon size={13} /> {v.label}
                </button>
              );
            })}
          </div>
        )}
        {showChips && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {chips.map(c => (
              <button
                key={c.label}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pickChip(c.bucket)}
                style={{ ...chipBtn, ...(bucket === c.bucket ? { background: 'var(--foreground)', color: 'var(--primary-foreground)', borderColor: 'var(--foreground)' } : null) }}
              >{c.label}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => { setValue(e.target.value); if (mode !== 'typing') setMode('typing'); }}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder={placeholder}
            style={{
              flex: 1, border: '1px solid var(--border)', borderRadius: 10,
              padding: '9px 12px', fontSize: 13, color: 'var(--foreground)', background: 'var(--muted)',
              outline: 'none',
            }}
          />
          <button
            onClick={handlePlusClick}
            onMouseDown={e => { if (!value.trim()) e.preventDefault(); }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--foreground)', color: 'var(--primary-foreground)', border: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, fontWeight: 700,
            }}
            title={showSend ? t('Skicka', 'Send') : t('Lägg till', 'Add')}
          >
            {showSend ? <Send size={15} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, strike, t, onToggle, onOpen, onDelete, className }) {
  return (
    <div
      className={className}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('app/task', task.id); e.dataTransfer.effectAllowed = 'move'; }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 4px', borderRadius: 6, cursor: 'grab',
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <input
        type="checkbox"
        checked={!!task.completed}
        onChange={(e) => { e.stopPropagation(); onToggle(); }}
        onClick={e => e.stopPropagation()}
        style={{ accentColor: '#6B7FD4', cursor: 'pointer', flexShrink: 0 }}
      />
      <span
        onClick={onOpen}
        style={{
          flex: 1, fontSize: 13, color: 'var(--foreground)',
          textDecoration: strike ? 'line-through' : 'none',
          opacity: task.completed ? 0.6 : 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'text-decoration 0.2s, opacity 0.2s',
        }}
      >{task.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'inline-flex' }}
        title={t('Ta bort', 'Delete')}
      ><X size={14} /></button>
    </div>
  );
}

// =================== Task Detail Modal (unchanged behavior) ===================
function TaskDetailModal({ t, task, users, currentUser, onClose, onSave, onDelete, onComplete }) {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [reminderAt, setReminderAt] = useState(task.reminder_at ? task.reminder_at.slice(0, 16) : '');
  const [reminderLocation, setReminderLocation] = useState(task.reminder_location || '');
  const [recurrence, setRecurrence] = useState(task.recurrence || '');
  const [subtasks, setSubtasks] = useState(Array.isArray(task.subtasks) ? task.subtasks : []);
  const [newSub, setNewSub] = useState('');

  const save = (patch) => onSave(patch);
  const saveTitle = () => { if (title.trim() && title !== task.title) save({ title: title.trim() }); };
  const setRecur = (val) => { setRecurrence(val); save({ recurrence: val || null }); };

  const addSub = () => {
    if (!newSub.trim()) return;
    const next = [...subtasks, { id: crypto.randomUUID(), title: newSub.trim(), done: false }];
    setSubtasks(next); save({ subtasks: next });
    setNewSub('');
  };
  const toggleSub = (id) => {
    const next = subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s);
    setSubtasks(next); save({ subtasks: next });
  };
  const removeSub = (id) => {
    const next = subtasks.filter(s => s.id !== id);
    setSubtasks(next); save({ subtasks: next });
  };

  const createdLabel = new Date(task.created_at).toLocaleString();

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={e => e.stopPropagation()} style={modalCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } }}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 18, fontWeight: 600, color: 'var(--foreground)', background: 'transparent' }}
          />
          <button onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>

        <SectionLabel>{t('Påminnelse', 'Reminder')}</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {['daily','weekly','monthly'].map(r => (
            <button key={r} onClick={() => setRecur(recurrence === r ? '' : r)}
              style={{ ...chipBtn, ...(recurrence === r ? activeChip : null) }}>
              {r === 'daily' ? t('Dagligen','Daily') : r === 'weekly' ? t('Veckovis','Weekly') : t('Månadsvis','Monthly')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            type="datetime-local"
            value={reminderAt}
            onChange={e => { setReminderAt(e.target.value); save({ reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null }); }}
            style={inputStyle}
          />
          <div style={{ position: 'relative', flex: 1 }}>
            <MapPin size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              placeholder={t('Plats', 'Location')}
              value={reminderLocation}
              onChange={e => setReminderLocation(e.target.value)}
              onBlur={() => save({ reminder_location: reminderLocation || null })}
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
        </div>

        <SectionLabel>{t('Deluppgifter', 'Subtasks')}</SectionLabel>
        <div style={{ marginBottom: 8 }}>
          {subtasks.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <input type="checkbox" checked={s.done} onChange={() => toggleSub(s.id)} style={{ accentColor: '#6B7FD4' }} />
              <span style={{ flex: 1, fontSize: 13, textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.55 : 1, color: 'var(--foreground)' }}>{s.title}</span>
              <button onClick={() => removeSub(s.id)} style={iconBtn}><X size={13} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <input
            value={newSub}
            onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
            placeholder={t('Ny deluppgift', 'New subtask')}
            style={inputStyle}
          />
          <button onClick={addSub} style={secondaryBtn}><Plus size={13} /></button>
        </div>

        <SectionLabel>{t('Anteckningar', 'Notes')}</SectionLabel>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => save({ description })}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', marginBottom: 14 }}
        />

        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 14 }}>
          {t('Skapad', 'Created')}: {createdLabel}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button onClick={onDelete} style={{ ...secondaryBtn, color: '#D96B6B', borderColor: 'var(--border)' }}>
            <Trash2 size={13} /> {t('Ta bort', 'Delete')}
          </button>
          <button onClick={onComplete} style={{ ...secondaryBtn, background: 'var(--foreground)', color: 'var(--primary-foreground)', borderColor: 'var(--foreground)' }}>
            <Check size={13} /> {task.completed ? t('Återöppna', 'Reopen') : t('Klarmarkera', 'Mark as done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function FilterCheck({ label, checked, onChange, color, icon }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 13, color: 'var(--foreground)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: color }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}>{icon}</span>
      <span>{label}</span>
    </label>
  );
}

function pill(borderColor, completed) {
  return {
    background: `color-mix(in oklab, ${borderColor} 22%, var(--card))`,
    border: `1px solid ${borderColor}66`,
    borderLeft: `3px solid ${borderColor}`,
    borderRadius: 6, padding: '3px 6px',
    fontSize: 11, fontWeight: 500, color: 'var(--foreground)',
    textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 5,
    overflow: 'hidden',
    opacity: completed ? 0.55 : 1,
  };
}

const navBtn = {
  width: 32, height: 32,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer',
};
const sectionHeaderBtn = {
  flex: 1, display: 'flex', alignItems: 'center', gap: 6,
  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em',
};
const sectionAddBtn = {
  width: 22, height: 22, borderRadius: 6,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--border)', border: '1px solid var(--border)', color: 'var(--foreground)',
  cursor: 'pointer',
};
const verbBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 10px', borderRadius: 999,
  background: 'var(--muted)', border: '1px solid var(--border)',
  fontSize: 12, color: 'var(--foreground)', cursor: 'pointer',
};
const chipBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 999,
  background: 'var(--card)', border: '1px solid var(--border)',
  fontSize: 12, color: 'var(--foreground)', cursor: 'pointer',
};
const activeChip = { background: 'var(--foreground)', color: 'var(--primary-foreground)', borderColor: 'var(--foreground)' };
const modalBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 80, padding: 20,
};
const modalCard = {
  width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
  background: 'var(--card)', borderRadius: 14, padding: 20,
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1px solid var(--border)',
};
const iconBtn = {
  width: 28, height: 28, borderRadius: 8,
  background: 'transparent', border: 'none', color: 'var(--muted-foreground)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};
const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8,
  background: 'var(--muted)', border: '1px solid var(--border)',
  fontSize: 13, fontWeight: 500, color: 'var(--foreground)', cursor: 'pointer',
};
const inputStyle = {
  flex: 1, border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', fontSize: 13, color: 'var(--foreground)', background: 'var(--muted)',
  outline: 'none', width: '100%',
};
