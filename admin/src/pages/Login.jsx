import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './Login.css'

export default function Login() {
  const { login, loading } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    const res = await login(form.email, form.password)
    if (!res.ok) toast(res.message, 'error')
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">AX</div>
          <h1 className="login-brand-name">AcademicX</h1>
        </div>
        <div className="login-hero">
          <h2 className="login-hero-title">Welcome back,<br />Administrator</h2>
          <p className="login-hero-sub">Manage students, courses, attendance and more from one powerful dashboard.</p>
        </div>
        <div className="login-features">
          {['Student Management', 'Course Control', 'Attendance Tracking', 'Analytics & Stats'].map(f => (
            <div key={f} className="login-feature-item">
              <span className="login-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-header">
            <h2>Sign in</h2>
            <p>Enter your admin credentials to continue</p>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@academicx.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="login-password-wrap">
              <input
                className="form-input"
                type={show ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="login-eye" onClick={() => setShow(s => !s)}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="login-hint">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register here</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
