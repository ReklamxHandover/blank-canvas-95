import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { X, Plus, Trash2 } from 'lucide-react';
import ExpandableNote from './ExpandableNote.jsx';
import { BufferedInput, BufferedTextarea } from './BufferedField.jsx';
import { ManufacturerSelect, LookupAutocomplete } from './Lookups.jsx';
import ProductNameAutocomplete from './ProductNameAutocomplete.jsx';
import ValuesBuilder from './ValuesBuilder.jsx';
import ExtraCostsEditor from './ExtraCostsEditor.jsx';

let productIdCounter = 100;
let extraKeyCounter = 1;

const UNIT_OPTIONS = ['/timme', '/meter', '/styck', '/lb meter', '/kilo'];

function emptyProduct() {
  return { id: String(++productIdCounter), name: '', quantity: 1, specs: '', article_number: '', serial_number: '', producer_article_number: '', price: '', unit: '/styck', values: [], extras: [] };
}

function newExtra() {
  return { key: `ek${++extraKeyCounter}`, description: '', amount: '' };
}


export default function CreateOrderModal() {
  const { setCreateModalOpen, createOrder, clients, manufacturers, articleNumbers, serialNumbers, refreshManufacturers, refreshArticleNumbers, refreshSerialNumbers } = useApp();
  const { t } = useLang();


  const [clientMode, setClientMode] = useState('existing'); // existing | new
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [newClient, setNewClient] = useState({ companyName: '', contactPerson: '', email: '', phone: '', orgNumber: '' });
  const [products, setProducts] = useState([emptyProduct()]);
  const [manufacturer, setManufacturer] = useState('ReklamX');
  const [manufacturerInhouse, setManufacturerInhouse] = useState(true);
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState(''); // YYYY-MM-DD


  const selectedClient = clients.find(c => c.id === selectedClientId);


  const filteredClients = clients.filter(c =>
    clientSearch === '' || c.companyName.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const canSubmit = () => {
    const hasProduct = products.some(p => p.name.trim() !== '');
    if (clientMode === 'existing') return selectedClientId !== '' && hasProduct;
    return newClient.companyName.trim() !== '' && newClient.contactPerson.trim() !== '' && hasProduct;
  };

  const handleAddProduct = () => setProducts(prev => [...prev, emptyProduct()]);
  const handleRemoveProduct = (id) => {
    if (products.length === 1) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };
  const handleProductChange = (id, field, val) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };
  const handleProductMulti = (id, partial) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...partial } : p));
  };

  const handleSubmit = () => {
    const cleanedProducts = products.filter(p => p.name.trim() !== '').map(p => ({
      ...p,
      price: p.price === '' || p.price === null || p.price === undefined ? null : Number(p.price),
    }));
    // Collect extras (don't store inside products jsonb)
    const extras = [];
    for (const p of cleanedProducts) {
      for (const e of (p.extras || [])) {
        const amt = Number(e.amount);
        if (!e.description?.trim() || !Number.isFinite(amt)) continue;
        extras.push({ item_id: String(p.id), description: e.description.trim(), amount: amt });
      }
      delete p.extras;
    }
    const itemsWithPrice = cleanedProducts.filter(p => p.price !== null);
    const itemsTotal = itemsWithPrice.reduce((s, p) => s + Number(p.price || 0) * (p.quantity || 1), 0);
    const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);
    const sumPrice = (itemsWithPrice.length > 0 || extras.length > 0) ? itemsTotal + extrasTotal : null;
    const orderData = {
      products: cleanedProducts,
      manufacturer,
      price: sumPrice,
      notes,
      deadline: deadline ? new Date(deadline + 'T12:00:00').toISOString() : null,
      extras,
    };

    if (clientMode === 'existing') {
      orderData.clientId = selectedClientId;
      orderData.isNewClient = false;
    } else {
      orderData.isNewClient = true;
      Object.assign(orderData, newClient);
    }
    createOrder(orderData);
    setCreateModalOpen(false);
  };


  return (
    <>
      {/* Backdrop */}
      <div
        className="fade-in"
        onClick={() => setCreateModalOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60 }}
      />

      {/* Modal */}
      <div
        className="modal-animate responsive-create-modal"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 540,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '90vh',
          background: 'var(--background)',
          borderRadius: 20,
          zIndex: 70,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal header */}
        <div className="responsive-create-modal-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>{t('newOrderTitle')}</h2>
          <button
            onClick={() => setCreateModalOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="responsive-create-modal-body" style={{ overflowY: 'auto', padding: '20px 28px', flex: 1 }}>

          {/* Client section */}
          <SectionLabel>{t('customerSection')}</SectionLabel>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['existing', 'new'].map(mode => (
              <button
                key={mode}
                onClick={() => setClientMode(mode)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: clientMode === mode ? '1.5px solid #6B7FD4' : '1.5px solid var(--border)',
                  background: clientMode === mode ? '#6B7FD410' : 'var(--card)',
                  color: clientMode === mode ? '#6B7FD4' : 'var(--muted-foreground)',
                  fontWeight: clientMode === mode ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {mode === 'existing' ? t('selectExistingClient') : t('createNewClient')}
              </button>
            ))}
          </div>

          {clientMode === 'existing' ? (
            <div>
              <input
                type="text"
                placeholder={t('searchClient')}
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                style={inputStyle}
              />
              <div style={{
                maxHeight: 180,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 8,
                marginTop: 6,
                background: 'var(--card)',
              }}>
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedClientId(c.id); setClientSearch(''); }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      background: selectedClientId === c.id ? '#6B7FD410' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (selectedClientId !== c.id) e.currentTarget.style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { if (selectedClientId !== c.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{c.companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{c.contactPerson}</div>
                  </div>
                ))}
              </div>
              {selectedClient && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--muted)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{selectedClient.companyName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{selectedClient.contactPerson} · {selectedClient.email}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <BufferedInput type="text" placeholder={t('companyNameRequired')} value={newClient.companyName} onChange={e => setNewClient(p => ({ ...p, companyName: e.target.value }))} style={inputStyle} />
              <BufferedInput type="text" placeholder={t('contactPersonRequired')} value={newClient.contactPerson} onChange={e => setNewClient(p => ({ ...p, contactPerson: e.target.value }))} style={inputStyle} />
              <BufferedInput type="email" placeholder={t('emailLabel')} value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              <BufferedInput type="tel" placeholder={t('phoneLabel')} value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
              <BufferedInput type="text" placeholder={t('orgNumberLabel')} value={newClient.orgNumber} onChange={e => setNewClient(p => ({ ...p, orgNumber: e.target.value }))} style={inputStyle} />
            </div>
          )}

          <div style={{ height: 24 }} />

          {/* Products section */}
          <SectionLabel>{t('productsSection')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            {products.map((p, idx) => {
              const extrasSum = (p.extras || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
              const lineBase = (Number(p.price) > 0 ? Number(p.price) * (p.quantity || 1) : 0);
              const lineTotal = lineBase + extrasSum;
              return (
              <div key={p.id} style={{
                padding: '14px 16px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <ProductNameAutocomplete
                    value={p.name}
                    onChange={(v) => handleProductChange(p.id, 'name', v)}
                    onSelectItem={({ name, article_number }) => handleProductMulti(p.id, { name, article_number })}
                    placeholder={t('productName')}
                    style={{ background: 'var(--background)' }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={p.quantity}
                    onChange={e => handleProductChange(p.id, 'quantity', parseInt(e.target.value) || 1)}
                    style={{ ...inputStyle, width: 70, background: 'var(--background)', textAlign: 'center' }}
                  />
                  {products.length > 1 && (
                    <button
                      onClick={() => handleRemoveProduct(p.id)}
                      title={t('removeProduct')}
                      style={{ padding: '0 10px', background: 'none', border: '1px solid #f0c8c8', borderRadius: 8, cursor: 'pointer', color: '#D96B6B' }}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <BufferedTextarea
                  placeholder={t('specifications')}
                  value={p.specs}
                  onChange={e => handleProductChange(p.id, 'specs', e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'none', background: 'var(--background)', width: '100%', display: 'block', marginBottom: 8 }}
                />
                <div className="responsive-product-grid" style={{ display: 'grid', gridTemplateColumns: manufacturerInhouse ? '1fr 1fr 1fr 80px 120px' : '1fr 1fr 1fr 1fr 80px 120px', gap: 6 }}>
                  <LookupAutocomplete
                    value={p.article_number}
                    onChange={(v) => handleProductChange(p.id, 'article_number', v)}
                    table="article_numbers"
                    options={articleNumbers}
                    refreshOptions={refreshArticleNumbers}
                    placeholder={t('articleNumber')}
                  />
                  {!manufacturerInhouse && (
                    <BufferedInput
                      type="text"
                      value={p.producer_article_number || ''}
                      onChange={e => handleProductChange(p.id, 'producer_article_number', e.target.value)}
                      placeholder={t('producerArticleNumber')}
                      style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }}
                    />
                  )}
                  <LookupAutocomplete
                    value={p.serial_number}
                    onChange={(v) => handleProductChange(p.id, 'serial_number', v)}
                    table="serial_numbers"
                    options={serialNumbers}
                    refreshOptions={refreshSerialNumbers}
                    placeholder={t('serialNumber')}
                  />
                  <input
                    type="number"
                    value={p.price ?? ''}
                    onChange={e => handleProductChange(p.id, 'price', e.target.value)}
                    placeholder={t('itemPrice')}
                    style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }}
                  />
                  <select
                    value={p.unit || '/styck'}
                    onChange={e => handleProductChange(p.id, 'unit', e.target.value)}
                    title="Enhet"
                    style={{ ...inputStyle, fontSize: 12, padding: '8px 6px' }}
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div
                    style={{
                      ...inputStyle,
                      fontSize: 12,
                      padding: '8px 10px',
                      background: 'var(--muted)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {(lineTotal > 0)
                      ? `${lineTotal.toLocaleString('sv-SE')} kr`
                      : '—'}
                  </div>
                </div>

                <ValuesBuilder
                  values={p.values || []}
                  onChange={(next) => handleProductChange(p.id, 'values', next)}
                />

                <ExtraCostsEditor
                  rows={p.extras || []}
                  onAdd={() => handleProductChange(p.id, 'extras', [...(p.extras || []), newExtra()])}
                  onChange={(key, field, val) => handleProductChange(p.id, 'extras', (p.extras || []).map(e => e.key === key ? { ...e, [field]: val } : e))}
                  onRemove={(key) => handleProductChange(p.id, 'extras', (p.extras || []).filter(e => e.key !== key))}
                />
              </div>
              );
            })}

          </div>
          <OfferTotals products={products} />
          <button
            onClick={handleAddProduct}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px',
              background: 'transparent',
              border: '1.5px dashed var(--border)',
              borderRadius: 8,
              color: 'var(--muted-foreground)',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              marginBottom: 24,
              marginTop: 12,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            {t('addProduct')}
          </button>

          {/* Offer details */}
          <SectionLabel>{t('orderDetails')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ManufacturerSelect
              value={manufacturer}
              onChange={(name, isInhouse) => { setManufacturer(name); setManufacturerInhouse(isInhouse); }}
              manufacturers={manufacturers}
              refreshManufacturers={refreshManufacturers}
              label={t('manufacturerLabel')}
            />
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                {t('deadlineLabel')}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                {t('otherNotes')}
              </label>
              <ExpandableNote
                value={notes}
                onChange={setNotes}
                placeholder="..."
                rows={3}
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          background: 'var(--card)',
          borderRadius: '0 0 20px 20px',
        }}>
          <button
            onClick={() => setCreateModalOpen(false)}
            style={{
              padding: '11px 22px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 14, fontWeight: 500,
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            style={{
              padding: '11px 28px',
              background: canSubmit() ? '#ffffff' : 'var(--muted)',
              border: canSubmit() ? 'none' : '1px solid var(--border)',
              borderRadius: 10,
              color: canSubmit() ? '#000000' : 'var(--muted-foreground)',
              fontSize: 14, fontWeight: 700,
              cursor: canSubmit() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {t('createOrder')}
          </button>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function computeOfferTotals(products = [], extrasByItem = null) {
  const exkl = (products || []).reduce((s, p) => {
    const pr = Number(p.price);
    const base = Number.isFinite(pr) && pr > 0 ? pr * (p.quantity || 1) : 0;
    const extras = extrasByItem
      ? (extrasByItem[String(p.id)] || [])
      : (p.extras || []);
    const extrasSum = extras.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    return s + base + extrasSum;
  }, 0);
  return { exkl, inkl: exkl * 1.25 };
}

export function OfferTotals({ products = [], extrasByItem = null, variant = 'box' }) {
  const { exkl, inkl } = computeOfferTotals(products, extrasByItem);
  if (variant === 'prominent') {
    return (
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#4CAF88', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          {exkl.toLocaleString('sv-SE')} kr
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
          inkl. moms (25%): {inkl.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kr
        </div>
      </div>
    );
  }
  return (
    <div style={{
      marginTop: 12,
      padding: '14px 16px',
      background: 'var(--muted)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 2,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
        <span>Totalt exkl. moms</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{exkl.toLocaleString('sv-SE')} kr</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, color: 'var(--muted-foreground)' }}>
        <span>inkl. moms (25%)</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{inkl.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kr</span>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--foreground)',
  background: 'var(--background)',
};
