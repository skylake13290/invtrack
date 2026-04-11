'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | null>(null)
  const [form, setForm] = useState({ username: '', role: 'viewer' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const { user: currentUser } = useAuth()
  const [resetPassword, setResetPassword] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data)
    setLoading(false)
  }

  const openCreate = () => {
    setForm({ username: '', role: 'viewer' })
    setError('')
    setGeneratedPassword('')
    setModal('create')
  }

  const saveCreate = async () => {
    if (!form.username) {
      setError('Username required')
      return
    }
    setSaving(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, admin_id: currentUser?.id })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setGeneratedPassword(data.password)
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async (userId: string) => {
    if (!confirm('Reset this user\'s password?')) return

    try {
      const res = await fetch('/api/admin/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: currentUser?.id,
          admin_username: currentUser?.username,
          target_user_id: userId
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResetPassword(data.password)
      setModal('reset')
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: !isActive })
      })

      if (!res.ok) throw new Error('Failed to update')
      load()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>User Management</h1>
        <button
          onClick={openCreate}
          style={{
            padding: '0.5rem 1rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Create User
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Username</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Role</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Must Reset</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '0.75rem' }}>{u.username}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: u.role === 'admin' ? '#007bff' : u.role === 'editor' ? '#28a745' : '#6c757d',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: u.is_active ? '#28a745' : '#dc3545',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {u.must_reset_password ? '⚠️ Yes' : '✓ No'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => resetPassword(u.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: '#ffc107',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => toggleActive(u.id, u.is_active)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: u.is_active ? '#dc3545' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'reset' && (
        <div style={overlayStyle} onClick={() => setModal(null)}>
          <div style={boxStyle} onClick={e => e.stopPropagation()}>
            <h2>New Password</h2>

            <code style={{ display: 'block', padding: '1rem', background: '#f5f5f5' }}>
              {resetPassword}
            </code>

            <button
              onClick={() => navigator.clipboard.writeText(resetPassword)}
            >
              Copy
            </button>

            <button onClick={() => setModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {modal === 'create' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setModal(null)}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>Create User</h2>

            {generatedPassword ? (
              <div>
                <div style={{
                  padding: '1rem',
                  background: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '4px',
                  marginBottom: '1rem'
                }}>
                  <strong>User created successfully!</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    Username: <code>{form.username}</code>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    Password: <code style={{ background: '#fff', padding: '0.25rem 0.5rem', borderRadius: '2px' }}>
                      {generatedPassword}
                    </code>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    ⚠️ Save this password - it won't be shown again!
                  </div>
                </div>
                <button
                  onClick={() => { setModal(null); setGeneratedPassword('') }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {error && (
                  <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    background: '#f8d7da',
                    color: '#721c24',
                    borderRadius: '4px'
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setModal(null)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCreate}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: saving ? '#ccc' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
