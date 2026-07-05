import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { authedFetch } from '@/lib/apiClient';

const ROLE_OPTIONS = ['owner', 'staff', 'designer', 'producer'];

const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'staff' };

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

export default function UserManagement() {
  const { currentUser } = useApp();
  const { t } = useLang();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadUsers = async () => {
    setLoading(true); setError('');
    try {
      const data = await authedFetch('/api/users');
      setUsers(data);
    } catch (e) {
      setError(e?.message || 'Kunde inte ladda användare');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId, role) => {
    if (userId === currentUser.id && currentUser.role === 'owner' && role !== 'owner') {
      const ok = window.confirm(t('confirmOwnRoleChange'));
      if (!ok) return;
    }
    const prev = users;
    setUsers(u => u.map(x => (x.id === userId ? { ...x, role } : x)));
    try {
      await authedFetch('/api/users', { method: 'POST', body: JSON.stringify({ userId, role }) });
    } catch (e) {
      setUsers(prev);
      alert('Kunde inte uppdatera roll: ' + (e?.message || 'okänt fel'));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true); setCreateError('');
    try {
      await authedFetch('/api/users', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        }),
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadUsers();
    } catch (err) {
      setCreateError(err?.message || 'Okänt fel');
    } finally {
      setCreating(false);
    }
  };

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground" style={{ margin: 0 }}>
          {t('users')}
        </h1>
        <button
          type="button"
          onClick={() => { setShowCreate(s => !s); setCreateError(''); }}
          style={{
            padding: '9px 16px',
            background: showCreate ? '#f0ede8' : '#1a1a2e',
            color: showCreate ? '#1a1a2e' : '#ffffff',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {showCreate ? t('cancel') : t('createUser')}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          style={{
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}>
            <Field label={t('nameLabel')}>
              <input
                required
                value={form.fullName}
                onChange={setField('fullName')}
                placeholder="Anna Andersson"
                style={inputStyle}
              />
            </Field>
            <Field label={t('emailLabel')}>
              <input
                required
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="anna@reklamx.se"
                style={inputStyle}
              />
            </Field>
            <Field label={t('passwordLabel')}>
              <input
                required
                type="password"
                minLength={6}
                value={form.password}
                onChange={setField('password')}
                placeholder="••••••"
                style={inputStyle}
              />
            </Field>
            <Field label={t('roleLabel')}>
              <select value={form.role} onChange={setField('role')} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{t(`role_${r}`)}</option>
                ))}
              </select>
            </Field>
          </div>
          {createError && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#D96B6B' }}>{createError}</div>
          )}
          <div style={{ marginTop: 14 }}>
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: '9px 18px',
                background: '#1a1a2e',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: creating ? 'wait' : 'pointer',
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? '…' : t('createUser')}
            </button>
          </div>
        </form>
      )}

      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        overflowX: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#b0b8c4', fontSize: 13 }}>Laddar…</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#D96B6B', fontSize: 13 }}>{error}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#b0b8c4', fontSize: 13 }}>Inga användare</div>
        ) : (
          <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>

            <thead>
              <tr style={{ background: '#faf9f7' }}>
                <Th>{t('nameLabel')}</Th>
                <Th>{t('emailLabel')}</Th>
                <Th>{t('roleLabel')}</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #f0ede8' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        background: '#f0ede8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600,
                        color: '#1a1a2e',
                      }}>
                        {initials(u.fullName)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                        {u.fullName || '—'}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#7a8394' }}>
                    {u.email || '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        background: '#ffffff',
                        border: '1px solid #e8e4df',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#1a1a2e',
                        cursor: 'pointer',
                      }}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{t(`role_${r}`)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: '#ffffff',
  border: '1px solid #e8e4df',
  borderRadius: 8,
  fontSize: 13,
  color: '#1a1a2e',
  boxSizing: 'border-box',
};

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: '#b0b8c4',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>{label}</span>
      {children}
    </label>
  );
}

function Th({ children }) {
  return (
    <th style={{
      textAlign: 'left',
      padding: '12px 20px',
      fontSize: 10, fontWeight: 700,
      color: '#b0b8c4',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>{children}</th>
  );
}
