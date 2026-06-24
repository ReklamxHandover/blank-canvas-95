import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '../context/AppContext.jsx';
import {
  isSupported, ensureRegistration, getPermission,
  requestPermissionIfNeeded, showAppNotification, onNotificationClick,
} from '../lib/pushNotifications.js';

export default function NotificationCenter() {
  const { currentUser, setView, setSelectedOrderId, orders } = useApp();
  const [items, setItems] = useState([]);
  const [permission, setPermission] = useState(() => (isSupported() ? getPermission() : 'unsupported'));
  const shownIds = useRef(new Set());

  const fetchDue = useCallback(async () => {
    if (!currentUser?.id) return;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('dismissed', false)
      .lte('fire_at', nowIso)
      .order('fire_at', { ascending: true });
    if (!error && data) setItems(data);
  }, [currentUser?.id]);

  // Request permission + register SW on first login
  useEffect(() => {
    if (!currentUser?.id || !isSupported()) return;
    let cancelled = false;
    (async () => {
      await ensureRegistration();
      const p = await requestPermissionIfNeeded();
      if (!cancelled) setPermission(p);
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // Handle SW notification clicks: focus + route to the item
  useEffect(() => {
    if (!isSupported()) return;
    const off = onNotificationClick((payload) => {
      const { source_type, source_id, notification_id } = payload;
      if (source_type === 'order' && source_id) {
        setSelectedOrderId(source_id);
        setView('orders');
      } else if (source_type === 'task' || source_type === 'event') {
        setView('calendar');
      }
      if (notification_id) {
        supabase.from('notifications').update({ dismissed: true }).eq('id', notification_id);
        setItems(prev => prev.filter(n => n.id !== notification_id));
      }
    });
    return off;
  }, [setView, setSelectedOrderId]);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchDue();
    const id = setInterval(fetchDue, 60_000);
    return () => clearInterval(id);
  }, [currentUser?.id, fetchDue]);

  // Route newly-due notifications through the SW when permission is granted
  useEffect(() => {
    if (permission !== 'granted' || items.length === 0) return;
    items.forEach(async (n) => {
      if (shownIds.current.has(n.id)) return;
      shownIds.current.add(n.id);
      const ok = await showAppNotification({
        id: n.id,
        title: n.title || 'Notis',
        body: n.body || '',
        payload: {
          notification_id: n.id,
          source_type: n.source_type,
          source_id: n.source_id,
          url: '/',
        },
      });
      if (!ok) shownIds.current.delete(n.id);
    });
  }, [items, permission]);

  const dismiss = async (id) => {
    setItems(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').update({ dismissed: true }).eq('id', id);
  };

  const openItem = (n) => {
    if (n.source_type === 'order' && n.source_id) {
      const exists = orders?.some(o => String(o.id) === String(n.source_id));
      if (exists) { setSelectedOrderId(n.source_id); setView('orders'); }
    } else if (n.source_type === 'task' || n.source_type === 'event') {
      setView('calendar');
    }
    dismiss(n.id);
  };

  // When permission is granted the OS notifications replace the in-app toast.
  // Only fall back to the toast UI when permission is denied/default/unsupported.
  if (permission === 'granted' || !items.length) return null;

  return (
    <div className="responsive-toast-wrapper" style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 1200,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360,
    }}>
      {items.map(n => (
        <div key={n.id}
          onClick={() => openItem(n)}
          style={{
            background: '#1a1a2e', color: '#fff',
            borderRadius: 12, padding: '12px 14px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
            cursor: 'pointer',
          }}>
          <Bell size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{n.body}</div>}
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
              {new Date(n.fire_at).toLocaleString()}
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} style={{
            background: 'transparent', border: 'none', color: '#fff',
            cursor: 'pointer', opacity: 0.7, padding: 2,
          }} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
