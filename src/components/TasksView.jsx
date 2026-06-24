import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Check, X, Trash2, Calendar as CalIcon, Flame, Star, User as UserIcon, ListTodo, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

const SMART_GROUPS = ['today', 'next7', 'upcoming', 'someday'];
const COLOR_PRESETS = ['#6B7FD4', '#4CAF88', '#E8A24C', '#D96B6B', '#A78BFA', '#10B981', '#F472B6', '#1a1a2e'];

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function bucketForDue(due, now = new Date()) {
  if (!due) return 'someday';
  const d = new Date(due);
  const todayEnd = endOfDay(now);
  const in7End = endOfDay(new Date(now.getTime() + 6 * 86400000));
  if (d <= todayEnd) return 'today';
  if (d <= in7End) return 'next7';
  return 'upcoming';
}
function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date();
}
function fmtTime(due, locale) {
  if (!due) return '';
  const d = new Date(due);
  return d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TasksView() {
  const { currentUser } = useApp();
  const { t, lang } = useLang();
  const locale = lang === 'sv' ? 'sv-SE' : 'en-US';

  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ kind: 'smart', value: 'today' }); // or { kind: 'list', value: id } | 'all'
  const [showCompleted, setShowCompleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [creatingList, setCreatingList] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [quickTime, setQuickTime] = useState('');
  const [quickListId, setQuickListId] = useState('');
  const [quickVisibility, setQuickVisibility] = useState('personal');

  const reload = useCallback(async () => {
    const [tRes, lRes] = await Promise.all([
      supabase.from('calendar_tasks').select('*').is('deleted_at', null).order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('task_lists').select('*').order('created_at', { ascending: true }),
    ]);
    if (!tRes.error && tRes.data) setTasks(tRes.data);
    if (!lRes.error && lRes.data) setLists(lRes.data);
  }, []);

  useEffect(() => {
    reload();
    supabase.from('profiles').select('id, full_name').then(({ data }) => {
      if (data) setUsers(data);
    });
  }, [reload]);

  const myLists = useMemo(() => lists.filter(l => l.owner === currentUser?.id && !l.is_shared), [lists, currentUser]);
  const sharedLists = useMemo(() => lists.filter(l => l.is_shared), [lists]);
  const listById = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l])), [lists]);
  const userById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);



  const toggleComplete = async (task) => {
    const next = !task.completed;
    const patch = next
      ? { completed: true, completed_at: new Date().toISOString(), completed_by: currentUser?.id || null }
      : { completed: false, completed_at: null, completed_by: null };
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, ...patch } : x));
    await supabase.from('calendar_tasks').update(patch).eq('id', task.id);
  };

  const writeReminderNotification = async (taskId, fireAtIso, who, title) => {
    if (!fireAtIso || !who) return;
    await supabase.from('notifications').insert({
      user_id: who,
      title: lang === 'sv' ? `Påminnelse: ${title}` : `Reminder: ${title}`,
      body: title, fire_at: fireAtIso,
      source_type: 'task', source_id: taskId, dismissed: false,
    });
  };

  const quickAdd = async (e) => {
    e?.preventDefault();
    if (!quickTitle.trim()) return;
    const dueIso = quickDate ? new Date(`${quickDate}T${quickTime || '09:00'}:00`).toISOString() : null;
    const payload = {
      title: quickTitle.trim(),
      due_date: dueIso,
      list_id: quickListId || null,
      visibility: quickVisibility,
      created_by: currentUser?.id || null,
    };
    // Schema requires due_date NOT NULL — if missing, use far future as "someday"
    if (!payload.due_date) {
      payload.due_date = new Date('2999-12-31T00:00:00Z').toISOString();
    }
    const { data, error } = await supabase.from('calendar_tasks').insert(payload).select().single();
    if (!error && data) {
      setTasks(prev => [...prev, data]);
      setQuickTitle(''); setQuickDate(''); setQuickTime('');
    }
  };

  const createList = async (name, color, isShared) => {
    if (!name.trim() || !currentUser?.id) return;
    const { data, error } = await supabase.from('task_lists').insert({
      name: name.trim(), color, is_shared: isShared, owner: currentUser.id,
    }).select().single();
    if (!error && data) {
      setLists(prev => [...prev, data]);
      setCreatingList(false);
      setFilter({ kind: 'list', value: data.id });
    }
  };

  // expose someday filter for tasks with future-2999 sentinel
  const isSomedayTask = (task) => !task.due_date || new Date(task.due_date).getFullYear() >= 2999;

  // re-bucket with sentinel awareness
  const bucketOf = (task) => isSomedayTask(task) ? 'someday' : bucketForDue(task.due_date);

  const groupedFinal = useMemo(() => {
    let arr = tasks.filter(x => showCompleted ? x.completed : !x.completed);
    if (filter.kind === 'list') arr = arr.filter(x => x.list_id === filter.value);
    if (filter.kind === 'smart') arr = arr.filter(x => bucketOf(x) === filter.value);
    arr.sort((a, b) => {
      const ay = isSomedayTask(a), by = isSomedayTask(b);
      if (ay && by) return 0;
      if (ay) return 1; if (by) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
    if (filter.kind === 'smart') return [{ key: filter.value, items: arr }];
    const groups = { today: [], next7: [], upcoming: [], someday: [] };
    for (const x of arr) groups[bucketOf(x)].push(x);
    return SMART_GROUPS.map(k => ({ key: k, items: groups[k] })).filter(g => g.items.length);
  }, [tasks, filter, showCompleted]);

  const labelFor = (k) => ({ today: t('tasksToday'), next7: t('tasksNext7'), upcoming: t('tasksUpcoming'), someday: t('tasksSomeday') }[k] || k);

  return (
    <div style={{ display: 'flex', gap: 20, maxWidth: 1500, margin: '0 auto', minHeight: 'calc(100vh - 100px)' }}>
      {/* LEFT RAIL */}
      <aside style={{ width: 240, flexShrink: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #f0ede8', borderRadius: 14, padding: 14 }}>
          <div style={sectionLabel}>{lang === 'sv' ? 'Smarta listor' : 'Smart lists'}</div>
          {SMART_GROUPS.map(k => (
            <RailItem
              key={k}
              icon={smartIconFor(k)}
              label={labelFor(k)}
              active={filter.kind === 'smart' && filter.value === k}
              onClick={() => setFilter({ kind: 'smart', value: k })}
              count={tasks.filter(x => !x.completed && bucketOf(x) === k).length}
            />
          ))}

          <div style={{ height: 1, background: '#f0ede8', margin: '12px 0' }} />
          <div style={sectionLabel}>{t('tasksMyLists')}</div>
          {myLists.map(l => (
            <RailItem key={l.id}
              icon={<span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />}
              label={l.name}
              active={filter.kind === 'list' && filter.value === l.id}
              onClick={() => setFilter({ kind: 'list', value: l.id })}
              count={tasks.filter(x => !x.completed && x.list_id === l.id).length}
            />
          ))}

          {sharedLists.length > 0 && (
            <>
              <div style={{ height: 1, background: '#f0ede8', margin: '12px 0' }} />
              <div style={sectionLabel}>{t('tasksSharedLists')}</div>
              {sharedLists.map(l => (
                <RailItem key={l.id}
                  icon={<span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />}
                  label={l.name}
                  active={filter.kind === 'list' && filter.value === l.id}
                  onClick={() => setFilter({ kind: 'list', value: l.id })}
                  count={tasks.filter(x => !x.completed && x.list_id === l.id).length}
                />
              ))}
            </>
          )}

          <button onClick={() => setCreatingList(true)} style={{ ...newListBtn, marginTop: 12 }}>
            <Plus size={14} /> {t('tasksNewList')}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>
            {filter.kind === 'smart' ? labelFor(filter.value) : (listById[filter.value]?.name || '')}
          </h1>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7a8394', cursor: 'pointer' }}>
            <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
            {t('tasksCompleted')}
          </label>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f0ede8', borderRadius: 14, padding: 8, flex: 1, marginBottom: 12 }}>
          {groupedFinal.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#b0b8c4', fontSize: 13 }}>
              {t('tasksNoTasks')}
            </div>
          ) : groupedFinal.map(group => (
            <div key={group.key} style={{ marginBottom: 10 }}>
              {filter.kind !== 'smart' && (
                <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {labelFor(group.key)}
                </div>
              )}
              {group.items.map(task => {
                const list = task.list_id ? listById[task.list_id] : null;
                const overdue = !task.completed && task.due_date && isOverdue(task.due_date) && !isSomedayTask(task);
                const assignee = task.assigned_to ? userById[task.assigned_to] : null;
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    cursor: 'pointer', borderBottom: '1px solid #f7f5f1',
                  }}
                    onClick={() => setEditing(task)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafaf7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggleComplete(task); }}
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${overdue ? '#D96B6B' : (list?.color || '#c8cdd6')}`,
                        background: task.completed ? (list?.color || '#1a1a2e') : 'transparent',
                        cursor: 'pointer', flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}>
                      {task.completed && <Check size={12} color="#fff" strokeWidth={3} />}
                    </button>
                    <span style={{
                      flex: 1, fontSize: 14, color: '#1a1a2e',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.5 : 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{task.title}</span>

                    {task.points > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#E8A24C', background: '#fdf5e8', padding: '2px 7px', borderRadius: 10 }}>
                        <Star size={10} fill="#E8A24C" strokeWidth={0} /> {task.points}
                      </span>
                    )}

                    {!isSomedayTask(task) && task.due_date && (
                      <span style={{ fontSize: 11, color: overdue ? '#D96B6B' : '#7a8394', fontWeight: overdue ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {fmtTime(task.due_date, locale)}
                      </span>
                    )}

                    {list && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7a8394' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: list.color }} />
                        {list.name}
                      </span>
                    )}

                    {task.visibility === 'shared' && assignee && (
                      <span title={assignee.full_name} style={{
                        width: 22, height: 22, borderRadius: '50%', background: '#1a1a2e',
                        color: '#fff', fontSize: 10, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{(assignee.full_name || '?').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* QUICK ADD */}
        <form onSubmit={quickAdd} style={{
          background: '#fff', border: '1px solid #f0ede8', borderRadius: 14,
          padding: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <Plus size={16} color="#7a8394" />
          <input
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder={t('tasksQuickAdd')}
            style={{ flex: '1 1 240px', minWidth: 200, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#1a1a2e' }}
          />
          <input type="date" value={quickDate} onChange={e => setQuickDate(e.target.value)} style={quickInput} />
          <input type="time" value={quickTime} onChange={e => setQuickTime(e.target.value)} style={quickInput} />
          <select value={quickListId} onChange={e => setQuickListId(e.target.value)} style={quickInput}>
            <option value="">{t('tasksNoList')}</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={quickVisibility} onChange={e => setQuickVisibility(e.target.value)} style={quickInput}>
            <option value="personal">{t('tasksPersonal')}</option>
            <option value="shared">{t('tasksShared')}</option>
          </select>
          <button type="submit" disabled={!quickTitle.trim()} style={{
            ...btnPrimary, opacity: quickTitle.trim() ? 1 : 0.5,
          }}>{t('tasksAddBtn')}</button>
        </form>
      </div>

      {editing && (
        <TaskDetailModal
          task={editing}
          lists={lists}
          users={users}
          currentUser={currentUser}
          t={t}
          onClose={() => setEditing(null)}
          onSaved={async (updated) => {
            setTasks(prev => prev.map(x => x.id === updated.id ? updated : x));
            if (updated.reminder_at && updated.assigned_to) {
              await writeReminderNotification(updated.id, updated.reminder_at, updated.assigned_to, updated.title);
            }
            setEditing(null);
          }}
          onDeleted={(id) => {
            setTasks(prev => prev.filter(x => x.id !== id));
            setEditing(null);
          }}
        />
      )}

      {creatingList && (
        <NewListModal
          t={t}
          onClose={() => setCreatingList(false)}
          onCreate={createList}
        />
      )}
    </div>
  );
}

function smartIconFor(k) {
  const map = { today: <Flame size={14} />, next7: <CalIcon size={14} />, upcoming: <ListTodo size={14} />, someday: <Inbox size={14} /> };
  return map[k] || null;
}

function RailItem({ icon, label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? '#f0ede8' : 'transparent',
      color: '#1a1a2e', fontSize: 13, fontWeight: active ? 600 : 400,
      textAlign: 'left',
    }}>
      <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', color: '#7a8394' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 11, color: '#7a8394' }}>{count}</span>}
    </button>
  );
}

function TaskDetailModal({ task, lists, users, currentUser, t, onClose, onSaved, onDeleted }) {
  const isSentinel = !task.due_date || new Date(task.due_date).getFullYear() >= 2999;
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [dateVal, setDateVal] = useState(isSentinel ? '' : new Date(task.due_date).toISOString().slice(0, 10));
  const [timeVal, setTimeVal] = useState(isSentinel ? '' : new Date(task.due_date).toISOString().slice(11, 16));
  const [listId, setListId] = useState(task.list_id || '');
  const [points, setPoints] = useState(task.points || 0);
  const [visibility, setVisibility] = useState(task.visibility || 'personal');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [reminderAt, setReminderAt] = useState(task.reminder_at ? task.reminder_at.slice(0, 16) : '');
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    let dueIso;
    if (dateVal) dueIso = new Date(`${dateVal}T${timeVal || '09:00'}:00`).toISOString();
    else dueIso = new Date('2999-12-31T00:00:00Z').toISOString();
    const payload = {
      title: title.trim(),
      description: description || null,
      due_date: dueIso,
      list_id: listId || null,
      points: Number(points) || 0,
      visibility,
      assigned_to: visibility === 'shared' ? (assignedTo || null) : null,
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
    };
    const { data, error } = await supabase.from('calendar_tasks').update(payload).eq('id', task.id).select().single();
    setSaving(false);
    if (!error && data) onSaved(data);
  };

  const del = async () => {
    if (!confirm(t('tasksDelete') + '?')) return;
    await supabase.from('calendar_tasks').update({ deleted_at: new Date().toISOString() }).eq('id', task.id);
    onDeleted(task.id);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <form onClick={e => e.stopPropagation()} onSubmit={save} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1a1a2e' }}>{t('tasksNav')}</h3>
          <button type="button" onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} required style={{ ...input, fontSize: 15, fontWeight: 500, marginBottom: 10 }} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t('tasksNotes')} style={{ ...input, resize: 'vertical', marginBottom: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Field label={t('tasksDueDate')}><input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} style={input} /></Field>
          <Field label={t('tasksDueTime')}><input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)} style={input} /></Field>
        </div>
        <Field label={t('tasksList')}>
          <select value={listId} onChange={e => setListId(e.target.value)} style={input}>
            <option value="">{t('tasksNoList')}</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label={t('tasksPoints')}><input type="number" min={0} value={points} onChange={e => setPoints(e.target.value)} style={input} /></Field>
          <Field label={t('tasksVisibility')}>
            <select value={visibility} onChange={e => setVisibility(e.target.value)} style={input}>
              <option value="personal">{t('tasksPersonal')}</option>
              <option value="shared">{t('tasksShared')}</option>
            </select>
          </Field>
        </div>
        {visibility === 'shared' && (
          <Field label={t('tasksAssignee')}>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={input}>
              <option value="">{t('tasksNoAssignee')}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.id}</option>)}
            </select>
          </Field>
        )}
        <Field label={t('tasksReminder')}>
          <input type="datetime-local" value={reminderAt} onChange={e => setReminderAt(e.target.value)} style={input} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 8 }}>
          <button type="button" onClick={del} style={{ ...btnSecondary, color: '#D96B6B' }}>
            <Trash2 size={14} /> {t('tasksDelete')}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>{t('tasksCancel')}</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }}>{t('tasksSave')}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function NewListModal({ t, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [isShared, setIsShared] = useState(false);
  return (
    <div onClick={onClose} style={overlay}>
      <form onClick={e => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onCreate(name, color, isShared); }} style={{ ...modal, width: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1a1a2e' }}>{t('tasksNewList')}</h3>
          <button type="button" onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>
        <Field label={t('tasksListName')}>
          <input value={name} onChange={e => setName(e.target.value)} required style={input} autoFocus />
        </Field>
        <Field label={t('tasksColor')}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '3px solid #1a1a2e' : '2px solid #f0ede8', cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
        </Field>
        <Field label={t('tasksVisibility')}>
          <select value={isShared ? 'shared' : 'personal'} onChange={e => setIsShared(e.target.value === 'shared')} style={input}>
            <option value="personal">{t('tasksPersonal')}</option>
            <option value="shared">{t('tasksShared')}</option>
          </select>
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('tasksCancel')}</button>
          <button type="submit" disabled={!name.trim()} style={{ ...btnPrimary, opacity: name.trim() ? 1 : 0.5 }}>{t('tasksSave')}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#7a8394', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}

const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: '#b0b8c4',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  padding: '4px 8px', marginBottom: 4,
};
const newListBtn = {
  width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 12px', borderRadius: 8, border: '1px dashed #d8d4cf',
  background: 'transparent', color: '#7a8394', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const quickInput = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #f0ede8',
  fontSize: 12, background: '#fafaf7', color: '#1a1a2e',
};
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(20,20,30,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
};
const modal = {
  background: '#fff', borderRadius: 14, padding: 22, width: 480, maxWidth: '92vw',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const input = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e6e2dc', fontSize: 13, background: '#fafaf7', color: '#1a1a2e',
  boxSizing: 'border-box',
};
const iconBtn = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#7a8394', padding: 4 };
const btnPrimary = {
  background: '#1a1a2e', color: '#fff', border: 'none', padding: '8px 16px',
  borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer',
};
const btnSecondary = {
  background: '#f5f3f0', color: '#1a1a2e', border: '1px solid #ece8e3', padding: '8px 14px',
  borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};
