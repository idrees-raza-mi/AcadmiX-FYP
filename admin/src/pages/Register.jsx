import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './Login.css'

export default function Register() {
  const { register, loading } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast('Passwords do not match', 'error'); return }
    if (form.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return }
    const res = await register(form.name, form.email, form.password)
    if (!res.ok) toast(res.message, 'error')
    // on success AuthContext sets user → App redirects to /setup automatically
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
          <h2 className="login-hero-title">Create your<br />Admin Account</h2>
          <p className="login-hero-sub">Register to set up your department dashboard and manage students, courses, and attendance.</p>
        </div>
        <div className="login-features">
          {['Department Setup Wizard', 'Batch & Class Management', 'Course & Teacher Assignment', 'Student Attendance Tracking'].map(f => (
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
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Dr. Ahmed Khan"
              value={form.name}
              onChange={e => f('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@academicx.com"
              value={form.email}
              onChange={e => f('email', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="login-password-wrap">
              <input
                className="form-input"
                type={show ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={e => f('password', e.target.value)}
                required
              />
              <button type="button" className="login-eye" onClick={() => setShow(s => !s)}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type={show ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={e => f('confirm', e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : <><UserPlus size={15} /> Create Account</>}
          </button>

          <p className="login-hint">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
