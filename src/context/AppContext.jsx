import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { triggerWebhook } from '@/lib/webhook';
import { compareByDeadline } from '@/lib/deadline';


const AppContext = createContext(null);

// ---------- helpers ----------
function initialsFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

const mapClient = (row) => ({
  id: row.id,
  companyName: row.company_name,
  contactPerson: row.contact_person,
  email: row.email,
  phone: row.phone,
  orgNumber: row.org_number,
  totalSpent: Number(row.total_spent) || 0,
  kundnr: row.kundnr ?? null,
  address: row.address || '',
  notes: row.notes || '',
});

const mapOrder = (row) => ({
  id: row.id,
  clientId: row.client_id,
  products: row.products || [],
  manufacturer: row.manufacturer || '',
  price: row.price === null || row.price === undefined ? null : Number(row.price),
  invoiceSent: !!row.invoice_sent,
  paid: !!row.paid,
  notes: row.notes || '',
  attachments: row.attachments || [],
  pipeline: row.pipeline || {},
  needsAttention: !!row.needs_attention,
  needsAttentionNote: row.needs_attention_note || '',
  changeLog: row.change_log || [],
  deletedAt: row.deleted_at,
  deadline: row.deadline || null,
  folderPath: row.folder_path || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});


const mapActivity = (row) => ({
  action: row.action,
  user: row.user_name || '',
  timestamp: row.timestamp,
  orderId: row.order_id || '',
  clientId: row.client_id || '',
});

async function buildUserFromSession(userId, email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const name = data.full_name || '';
  return { id: data.id, name, initials: initialsFromName(name), role: data.role, email: email || '' };
}

// ---------- provider ----------
export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [articleNumbers, setArticleNumbers] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [items, setItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [view, setView] = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);


  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const getClient = (clientId) => clients.find(c => c.id === clientId);

  // ---------- auth ----------
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUser(null);
        setOrders([]); setClients([]); setActivityLog([]);
        setAuthReady(true);
        return;
      }
      setTimeout(async () => {
        const user = await buildUserFromSession(session.user.id, session.user.email);
        if (mounted) { setCurrentUser(user); setAuthReady(true); }
      }, 0);
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (!session?.user) { setAuthReady(true); return; }
      const user = await buildUserFromSession(session.user.id, session.user.email);
      if (mounted) { setCurrentUser(user); setAuthReady(true); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // ---------- fetch data when logged in ----------
  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    const [c, o, a, m, art, ser, it] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*').order('timestamp', { ascending: false }),
      supabase.from('manufacturers').select('*').order('name'),
      supabase.from('article_numbers').select('value').order('value'),
      supabase.from('serial_numbers').select('value').order('value'),
      supabase.from('items').select('*').order('benamning'),
    ]);
    if (!c.error && c.data) setClients(c.data.map(mapClient));
    if (!o.error && o.data) setOrders(o.data.map(mapOrder));
    if (!a.error && a.data) setActivityLog(a.data.map(mapActivity));
    if (!m.error && m.data) setManufacturers(m.data);
    if (!art.error && art.data) setArticleNumbers(art.data);
    if (!ser.error && ser.data) setSerialNumbers(ser.data);
    if (!it.error && it.data) setItems(it.data);
    setDataLoading(false);
  }, []);

  const refreshManufacturers = useCallback(async () => {
    const { data } = await supabase.from('manufacturers').select('*').order('name');
    if (data) setManufacturers(data);
  }, []);
  const refreshArticleNumbers = useCallback(async () => {
    const { data } = await supabase.from('article_numbers').select('value').order('value');
    if (data) setArticleNumbers(data);
  }, []);
  const refreshSerialNumbers = useCallback(async () => {
    const { data } = await supabase.from('serial_numbers').select('value').order('value');
    if (data) setSerialNumbers(data);
  }, []);
  const refreshItems = useCallback(async () => {
    const { data } = await supabase.from('items').select('*').order('benamning');
    if (data) setItems(data);
  }, []);


  useEffect(() => {
    if (!currentUser) return;
    fetchAll();
  }, [currentUser, fetchAll]);

  // ---------- realtime subscriptions ----------
  useEffect(() => {
    if (!currentUser) return;

    const ordersChannel = supabase
      .channel('rx-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const next = mapOrder(payload.new);
          setOrders(prev => (prev.some(o => o.id === next.id) ? prev : [next, ...prev]));
        } else if (payload.eventType === 'UPDATE') {
          const next = mapOrder(payload.new);
          setOrders(prev => prev.map(o => (o.id === next.id ? next : o)));
        } else if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) setOrders(prev => prev.filter(o => o.id !== oldId));
        }
      })
      .subscribe();

    const activityChannel = supabase
      .channel('rx-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        const entry = mapActivity(payload.new);
        setActivityLog(prev => {
          // de-dupe on (timestamp + action + orderId) since rows have no stable client id
          const dupe = prev.some(e =>
            e.timestamp === entry.timestamp && e.action === entry.action && e.orderId === entry.orderId
          );
          return dupe ? prev : [entry, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [currentUser]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: error?.message || 'Felaktig e-post eller lösenord.' };
    }
    const user = await buildUserFromSession(data.user.id, data.user.email);
    if (!user) return { ok: false, error: 'Kunde inte hämta profil. Kontakta administratören.' };
    setCurrentUser(user);
    setView('orders'); setSelectedOrderId(null);
    setActiveFilters(new Set()); setSearchQuery('');
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setOrders([]); setClients([]); setActivityLog([]);
    setView('orders'); setSelectedOrderId(null);
  };

  // ---------- mutations (optimistic local + persist to Supabase) ----------
  const persistActivity = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_log').insert({
      action: entry.action,
      user_id: user?.id || null,
      user_name: entry.user || '',
      order_id: entry.orderId || null,
      client_id: entry.clientId || null,
      timestamp: entry.timestamp,
    });
  };

  const updateOrder = async (orderId, changes, logEntry) => {
    const now = new Date().toISOString();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updated = { ...order, ...changes, updatedAt: now };
    if (logEntry) {
      updated.changeLog = [
        { action: logEntry, user: currentUser?.name || 'System', timestamp: now },
        ...order.changeLog,
      ];
    }
    setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));

    const dbPatch = { updated_at: now };
    if ('price' in changes) dbPatch.price = changes.price;
    if ('invoiceSent' in changes) dbPatch.invoice_sent = changes.invoiceSent;
    if ('paid' in changes) dbPatch.paid = changes.paid;
    if ('notes' in changes) dbPatch.notes = changes.notes;
    if ('manufacturer' in changes) dbPatch.manufacturer = changes.manufacturer;
    if ('products' in changes) {
      dbPatch.products = changes.products;
      // Note: price is NOT auto-derived here — it must account for quantity
      // and per-item extra costs (extra_costs table), which this function has
      // no knowledge of. Callers that change products and need the total to
      // stay accurate must pass `price` explicitly in the same update (see
      // OrderDrawer's persistProducts). Previously this recomputed price as a
      // naive sum of item prices, silently dropping quantity multipliers and
      // extra costs on every product edit (including unrelated ones like
      // ticking a production checklist).
    }
    if ('attachments' in changes) dbPatch.attachments = changes.attachments;
    if ('pipeline' in changes) dbPatch.pipeline = changes.pipeline;
    if ('needsAttention' in changes) dbPatch.needs_attention = changes.needsAttention;
    if ('needsAttentionNote' in changes) dbPatch.needs_attention_note = changes.needsAttentionNote;
    if ('deadline' in changes) dbPatch.deadline = changes.deadline;
    if ('folderPath' in changes) dbPatch.folder_path = changes.folderPath;


    if (logEntry) dbPatch.change_log = updated.changeLog;

    await supabase.from('orders').update(dbPatch).eq('id', orderId);

    const actingUser = currentUser?.name || 'System';
    const client = getClient(order.clientId);
    const clientName = client?.companyName || '';
    if ('invoiceSent' in changes && changes.invoiceSent && !order.invoiceSent) {
      triggerWebhook('invoice.sent', { orderId, clientName, price: updated.price, actingUser });
    }
    if ('paid' in changes && changes.paid && !order.paid) {
      triggerWebhook('order.paid', { orderId, clientName, price: updated.price, actingUser });
    }
    if ('needsAttention' in changes && changes.needsAttention && !order.needsAttention) {
      triggerWebhook('design.needs_attention', {
        orderId, clientName,
        note: ('needsAttentionNote' in changes ? changes.needsAttentionNote : order.needsAttentionNote) || '',
        actingUser,
      });
    }

    if (logEntry) {
      const entry = {
        action: logEntry, user: currentUser?.name || 'System',
        timestamp: now, orderId, clientId: order.clientId,
      };
      setActivityLog(prev => [entry, ...prev]);
      persistActivity(entry);
    }
  };

  const updatePipelineStage = async (orderId, stage, status, notes) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString();
    const updatedPipeline = {
      ...order.pipeline,
      [stage]: {
        ...order.pipeline[stage],
        status,
        notes: notes !== undefined ? notes : order.pipeline[stage]?.notes,
        updatedAt: now,
      },
    };
    const action = `${stage}: status ändrad till ${status}`;
    const changeLog = [
      { action, user: currentUser?.name || 'System', timestamp: now },
      ...order.changeLog,
    ];

    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, pipeline: updatedPipeline, updatedAt: now, changeLog } : o)));

    await supabase.from('orders').update({
      pipeline: updatedPipeline, change_log: changeLog, updated_at: now,
    }).eq('id', orderId);

    const actingUser = currentUser?.name || 'System';
    triggerWebhook('stage.updated', { orderId, stageName: stage, newStatus: status, actingUser });

    const entry = { action, user: actingUser, timestamp: now, orderId, clientId: order.clientId };
    setActivityLog(prev => [entry, ...prev]);
    persistActivity(entry);
  };

  const softDeleteOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString();
    const action = 'Offert flyttad till papperskorg';
    const changeLog = [{ action, user: currentUser?.name || 'System', timestamp: now }, ...order.changeLog];

    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, deletedAt: now, updatedAt: now, changeLog } : o)));
    setSelectedOrderId(null);

    await supabase.from('orders').update({ deleted_at: now, change_log: changeLog, updated_at: now }).eq('id', orderId);

    const entry = { action, user: currentUser?.name || 'System', timestamp: now, orderId, clientId: order.clientId };
    setActivityLog(prev => [entry, ...prev]);
    persistActivity(entry);
  };

  const restoreOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const now = new Date().toISOString();
    const action = 'Offert återställd från papperskorg';
    const changeLog = [{ action, user: currentUser?.name || 'System', timestamp: now }, ...order.changeLog];

    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, deletedAt: null, updatedAt: now, changeLog } : o)));

    await supabase.from('orders').update({ deleted_at: null, change_log: changeLog, updated_at: now }).eq('id', orderId);

    const entry = { action, user: currentUser?.name || 'System', timestamp: now, orderId, clientId: order.clientId };
    setActivityLog(prev => [entry, ...prev]);
    persistActivity(entry);
  };

  const createOrder = async (data) => {
    // Get next order ID from postgres function
    const { data: idData, error: idErr } = await supabase.rpc('next_order_id');
    if (idErr || !idData) {
      console.error('next_order_id failed', idErr);
      return;
    }
    const newId = idData;

    let clientId = data.clientId;

    if (data.isNewClient) {
      const newClientId = `C${String(clients.length + 1).padStart(3, '0')}`;
      const { error: clientErr } = await supabase.from('clients').insert({
        id: newClientId,
        company_name: data.companyName,
        contact_person: data.contactPerson,
        email: data.email || '',
        phone: data.phone || '',
        org_number: data.orgNumber || '',
      });
      if (clientErr) { console.error('insert client failed', clientErr); return; }
      clientId = newClientId;
    }

    const now = new Date().toISOString();
    const pipeline = {
      brief: { status: 'active', updatedAt: now, notes: '' },
      forhandling: { status: 'not_started', updatedAt: null, notes: '' },
      design: { status: 'not_started', updatedAt: null, notes: '' },
      produktion: { status: 'not_started', updatedAt: null, notes: '' },
      leverans: { status: 'not_started', updatedAt: null, notes: '', deliveryMethod: null, montering: false },
      faktura: { status: 'not_started', updatedAt: null, notes: '' },
      betald: { status: 'not_started', updatedAt: null, notes: '' },
    };
    const changeLog = [{ action: 'Offert skapad', user: currentUser?.name || 'System', timestamp: now }];

    const { error: orderErr } = await supabase.from('orders').insert({
      id: newId, client_id: clientId, products: data.products, manufacturer: data.manufacturer,
      price: data.price || null, notes: data.notes || '', attachments: [], pipeline,
      change_log: changeLog, created_at: now, updated_at: now,
      deadline: data.deadline || null,
    });
    if (orderErr) { console.error('insert order failed', orderErr); return; }

    if (Array.isArray(data.extras) && data.extras.length > 0) {
      const ecRows = data.extras.map(e => ({
        offer_id: newId,
        item_id: String(e.item_id),
        description: e.description,
        amount: Number(e.amount) || 0,
      }));
      const { error: ecErr } = await supabase.from('extra_costs').insert(ecRows);
      if (ecErr) console.error('insert extra_costs failed', ecErr);
    }


    const actingUser = currentUser?.name || 'System';
    const entry = { action: 'Offert skapad', user: actingUser, timestamp: now, orderId: newId, clientId };
    await persistActivity(entry);

    const clientName = data.isNewClient
      ? data.companyName
      : (getClient(clientId)?.companyName || '');
    triggerWebhook('order.created', {
      orderId: newId,
      clientName,
      productNames: (data.products || []).map(p => p.name),
      actingUser,
    });

    // Re-fetch from Supabase to reflect actual state
    await fetchAll();
  };

  const updateClient = async (clientId, changes) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const updated = { ...client, ...changes };
    setClients(prev => prev.map(c => (c.id === clientId ? updated : c)));
    const dbPatch = {};
    if ('companyName' in changes) dbPatch.company_name = changes.companyName;
    if ('contactPerson' in changes) dbPatch.contact_person = changes.contactPerson;
    if ('email' in changes) dbPatch.email = changes.email;
    if ('phone' in changes) dbPatch.phone = changes.phone;
    if ('orgNumber' in changes) dbPatch.org_number = changes.orgNumber;
    if ('address' in changes) dbPatch.address = changes.address;
    if ('notes' in changes) dbPatch.notes = changes.notes;
    if (Object.keys(dbPatch).length === 0) return;
    dbPatch.updated_at = new Date().toISOString();
    await supabase.from('clients').update(dbPatch).eq('id', clientId);
  };

  // ---------- filters ----------
  const toggleFilter = (filter) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter); else next.add(filter);
      return next;
    });
  };
  const clearFilters = () => setActiveFilters(new Set());

  const getFilteredOrders = (scope = 'offers') => {
    let result = orders.filter(o => !o.deletedAt);

    // Scope: split rows across Offerter / Ordrar / Avslutade ordrar pages.
    result = result.filter(o => {
      const forh = o.pipeline?.forhandling?.status;
      const bet = o.pipeline?.betald?.status;
      const forhDone = forh === 'pris_godkant';
      const betDone = bet === 'done' || bet === 'klart' || bet === 'klar';
      if (scope === 'offers') return !forhDone;
      if (scope === 'orders') return forhDone && !betDone;
      if (scope === 'completed') return forhDone && betDone;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        const client = getClient(o.clientId);
        return (
          o.id.toLowerCase().includes(q) ||
          (client?.companyName || '').toLowerCase().includes(q) ||
          o.products.some(p => p.name.toLowerCase().includes(q))
        );
      });
    }
    if (activeFilters.size > 0) {
      result = result.filter(o => {
        if (activeFilters.has('waitingDesign') && o.pipeline.design?.status !== 'not_started') return false;
        if (activeFilters.has('waitingProduction') && o.pipeline.produktion?.status !== 'not_started') return false;
        if (activeFilters.has('waitingPrice') && o.price !== null) return false;
        if (activeFilters.has('notInvoiced') && (o.invoiceSent || o.price === null)) return false;
        if (activeFilters.has('unpaidInvoice') && (!o.invoiceSent || o.paid)) return false;
        if (activeFilters.has('needsAttention') && !o.needsAttention) return false;
        return true;
      });
    }
    // Always sort by nearest deadline first; no-deadline entries last.
    result = [...result].sort(compareByDeadline);
    return result;
  };


  // ---------- loading splash ----------
  const showLoader = !authReady || (currentUser && dataLoading && orders.length === 0);
  if (showLoader) {
    return (
      <div style={{
        minHeight: '100vh', background: '#ede8e3',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div
          aria-label="Laddar"
          style={{
            width: 36, height: 36,
            border: '3px solid rgba(26,26,46,0.15)',
            borderTopColor: '#1a1a2e',
            borderRadius: '50%',
            animation: 'rx-app-spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes rx-app-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      orders, clients, getClient, activityLog,
      manufacturers, articleNumbers, serialNumbers, items,
      refreshManufacturers, refreshArticleNumbers, refreshSerialNumbers, refreshItems,
      view, setView,
      selectedOrderId, setSelectedOrderId, selectedOrder,
      selectedClientId, setSelectedClientId,
      activeFilters, toggleFilter, clearFilters,
      searchQuery, setSearchQuery,
      createModalOpen, setCreateModalOpen,
      updateOrder, updatePipelineStage, updateClient,
      softDeleteOrder, restoreOrder, createOrder,
      getFilteredOrders,

    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
