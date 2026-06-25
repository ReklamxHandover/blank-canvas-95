import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { authedFetch } from '@/lib/apiClient';

const ROLE_OPTIONS = ['owner', 'staff', 'designer', 'producer'];

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
    const prev = users;
    setUsers(u => u.map(x => (x.id === userId ? { ...x, role } : x)));
    try {
      await authedFetch('/api/users', { method: 'POST', body: JSON.stringify({ userId, role }) });
    } catch (e) {
      setUsers(prev);
      alert('Kunde inte uppdatera roll: ' + (e?.message || 'okänt fel'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 30,
          color: '#1a1a2e',
          margin: 0,
        }}>
          {t('users')}
        </h1>
      </div>

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
                <Th>Namn</Th>
                <Th>E-post</Th>
                <Th>Roll</Th>
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
                      disabled={u.id === currentUser.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        background: u.id === currentUser.id ? '#faf9f7' : '#ffffff',
                        border: '1px solid #e8e4df',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#1a1a2e',
                        cursor: u.id === currentUser.id ? 'not-allowed' : 'pointer',
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

