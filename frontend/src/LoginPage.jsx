import React, { useState } from 'react'
import { useAuth } from './AuthContext'

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: 7,
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  // Login fields
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // Register-only fields
  const [name,        setName]        = useState('')
  const [company,     setCompany]     = useState('')
  const [password2,   setPassword2]   = useState('')

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m) {
    setMode(m)
    setError('')
    setEmail(''); setPassword(''); setName(''); setCompany(''); setPassword2('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (password !== password2) { setError('Passwords do not match.'); return }
      if (password.length < 8)    { setError('Password must be at least 8 characters.'); return }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({ name, email, password, company_name: company })
      }
    } catch (err) {
      const msg = err.response?.data?.message
      const errs = err.response?.data?.errors
      if (errs) {
        setError(Object.values(errs).flat().join(' '))
      } else {
        setError(msg || (mode === 'login' ? 'Login failed. Check your credentials.' : 'Registration failed.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{
        width: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '36px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 10, background: 'var(--accent)', marginBottom: 12,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>STMS</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Support Ticket Management</p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <Field label="Full name">
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith" required autoFocus style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required autoFocus={mode === 'login'}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          {mode === 'register' && (
            <Field label="Company name">
              <input
                type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder="Acme Corp" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
          )}

          <Field label="Password">
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required style={{ ...inputStyle, marginBottom: mode === 'register' ? 0 : undefined }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </Field>

          {mode === 'register' && (
            <Field label="Confirm password">
              <input
                type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>
          )}

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 7, marginBottom: 16,
              background: 'oklch(0.97 0.02 20)', border: '1px solid oklch(0.88 0.06 20)',
              color: 'oklch(0.45 0.18 20)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 14, marginTop: 6 }}>
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? 'Sign in' : 'Create client account')}
          </button>
        </form>

        {mode === 'register' && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
            By creating an account you accept the terms of service.<br />
            Staff accounts are created by your administrator.
          </p>
        )}
      </div>
    </div>
  )
}
