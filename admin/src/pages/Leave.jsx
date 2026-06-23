import { useEffect, useState, useCallback } from 'react'
import { Search, CheckCircle, XCircle, Clock, User, Calendar, MessageSquare } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const TABS = ['pending', 'approved', 'rejected']

export default function Leave() {
  const toast = useToast()
  const [tab, setTab] = useState('pending')
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [adminReason, setAdminReason] = useState('')
  const [acting, setActing] = useState(null)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pendRes, appRes, rejRes] = await Promise.all([
        api.get('/leave', { params: { status: 'pending' } }),
        api.get('/leave', { params: { status: 'approved' } }),
        api.get('/leave', { params: { status: 'rejected' } }),
      ])
      const p = pendRes.data.data || []
      const a = appRes.data.data || []
      const r = rejRes.data.data || []
      setCounts({ pending: p.length, approved: a.length, rejected: r.length })
      const map = { pending: p, approved: a, rejected: r }
      setLeaves(map[tab] || [])
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to load leaves', 'error')
    } finally {
      setLoading(false)
    }
  }, [tab]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const filtered = search.trim()
    ? leaves.filter(l => {
        const name = l.student?.profile?.name || l.student?.email || ''
        return name.toLowerCase().includes(search.toLowerCase())
      })
    : leaves

  const approve = async (id) => {
    setActing(id)
    try {
      await api.put(`/leave/${id}/approve`)
      toast('Leave approved', 'success')
      load()
    } catch (e) {
      toast(e.response?.data?.message || 'Error approving', 'error')
    } finally {
      setActing(null)
    }
  }

  const openReject = (leave) => {
    setRejectTarget(leave)
    setAdminReason('')
  }

  const confirmReject = async () => {
    setActing(rejectTarget._id)
    try {
      await api.put(`/leave/${rejectTarget._id}/reject`, { adminReason })
      toast('Leave rejected', 'info')
      setRejectTarget(null)
      load()
    } catch (e) {
      toast(e.response?.data?.message || 'Error rejecting', 'error')
    } finally {
      setActing(null)
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="status-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'pending' && counts.pending > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: tab === 'pending' ? 'rgba(255,255,255,0.35)' : '#EF4444',
                  color: tab === 'pending' ? 'white' : 'white',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}>
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="search-input"
            style={{ paddingLeft: 32, maxWidth: '100%', width: '100%' }}
            placeholder="Search by student name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="table-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="table-empty">No {tab} leave requests found</div>
      ) : tab === 'pending' ? (
        <PendingCards
          leaves={filtered}
          acting={acting}
          onApprove={approve}
          onReject={openReject}
          formatDate={formatDate}
        />
      ) : (
        <ReviewedTable leaves={filtered} formatDate={formatDate} />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Modal title="Reject Leave Request" onClose={() => setRejectTarget(null)} width={420}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 13 }}>
            Rejecting leave for <strong>{rejectTarget.student?.profile?.name || rejectTarget.student?.email}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Reason for Rejection</label>
            <textarea
              className="form-input"
              rows={3}
              value={adminReason}
              onChange={e => setAdminReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={confirmReject}
              disabled={acting === rejectTarget._id}
            >
              {acting === rejectTarget._id ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PendingCards({ leaves, acting, onApprove, onReject, formatDate }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 14,
    }}>
      {leaves.map(l => (
        <div key={l._id} style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Student info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="student-avatar">
              {(l.student?.profile?.name || l.student?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="student-name">{l.student?.profile?.name || '—'}</div>
              <div className="student-email">{l.student?.email}</div>
            </div>
            <span className="badge badge-pending" style={{ marginLeft: 'auto' }}>Pending</span>
          </div>

          {/* Batch */}
          {l.batch?.name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <User size={12} />
              <span>{l.batch.name}</span>
            </div>
          )}

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <Calendar size={12} />
            <span>{formatDate(l.startDate)} — {formatDate(l.endDate)}</span>
          </div>

          {/* Reason */}
          <div style={{
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--text)',
            lineHeight: 1.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, color: 'var(--text-secondary)', fontWeight: 600 }}>
              <MessageSquare size={11} />
              <span>Reason</span>
            </div>
            {l.reason || <span style={{ color: 'var(--text-muted)' }}>No reason provided</span>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              className="btn btn-danger btn-sm"
              style={{ flex: 1 }}
              onClick={() => onReject(l)}
              disabled={acting === l._id}
            >
              <XCircle size={13} />
              Reject
            </button>
            <button
              className="btn btn-success btn-sm"
              style={{ flex: 1 }}
              onClick={() => onApprove(l._id)}
              disabled={acting === l._id}
            >
              <CheckCircle size={13} />
              {acting === l._id ? 'Processing...' : 'Approve'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReviewedTable({ leaves, formatDate }) {
  return (
    <div className="table-card" style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Batch</th>
            <th>Dates</th>
            <th>Reason</th>
            <th>Admin Reason</th>
            <th>Reviewed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map(l => (
            <tr key={l._id}>
              <td>
                <div className="student-cell">
                  <div className="student-avatar">
                    {(l.student?.profile?.name || l.student?.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="student-name">{l.student?.profile?.name || '—'}</div>
                    <div className="student-email">{l.student?.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.batch?.name || '—'}</td>
              <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                {formatDate(l.startDate)} – {formatDate(l.endDate)}
              </td>
              <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {l.reason || '—'}
                </span>
              </td>
              <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-secondary)' }}>
                {l.adminReason || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(l.reviewedAt || l.updatedAt)}</td>
              <td>
                <span className={`badge badge-${l.status}`}>{l.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
