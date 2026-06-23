import { useEffect, useState, useCallback } from 'react'
import { Download, ChevronDown, ChevronUp, CheckCircle, XCircle, Fingerprint, UserCheck } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

function StatPill({ label, value, color }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '14px 20px', flex: '1 1 160px', minWidth: 140,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function exportCSV(sessions) {
  const header = ['Date', 'Course', 'Batch', 'Method', 'Start', 'End', 'Present', 'Total', 'Attendance %']
  const rows = sessions.map(s => [
    new Date(s.date).toLocaleDateString(),
    s.course?.name || '—',
    s.batch?.name || '—',
    s.method || '—',
    s.startTime || '—',
    s.endTime || '—',
    s.presentCount ?? 0,
    s.totalStudents ?? 0,
    s.totalStudents ? Math.round(((s.presentCount || 0) / s.totalStudents) * 100) + '%' : '—',
  ])
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'sessions.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function Sessions() {
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [filters, setFilters] = useState({ courseId: '', batchId: '', dateFrom: '', dateTo: '', status: '' })
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)

  useEffect(() => {
    Promise.all([api.get('/courses'), api.get('/batches')])
      .then(([cRes, bRes]) => {
        setCourses(cRes.data.data || [])
        setBatches(bRes.data.data || [])
      }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.courseId) params.courseId = filters.courseId
      if (filters.batchId) params.batchId = filters.batchId
      if (filters.dateFrom) params.dateFrom = filters.dateFrom
      if (filters.dateTo) params.dateTo = filters.dateTo
      if (filters.status) params.status = filters.status

      const r = await api.get('/sessions', { params })
      const data = r.data.data || []
      setSessions(data)

      // Compute stats
      const total = data.length
      const avgAtt = total > 0
        ? Math.round(data.reduce((sum, s) => sum + (s.totalStudents ? (s.presentCount || 0) / s.totalStudents * 100 : 0), 0) / total)
        : 0
      const biometric = data.filter(s => s.method === 'biometric' || s.method === 'face').length
      const manual = data.filter(s => s.method === 'manual').length
      setStats({ total, avgAtt, biometricPct: total ? Math.round(biometric / total * 100) : 0, manualPct: total ? Math.round(manual / total * 100) : 0 })
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to load sessions', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const openDetail = async (session) => {
    setDetail({ session, present: [], absent: [], loading: true })
    setDetailLoading(true)
    try {
      const r = await api.get(`/sessions/${session._id}`)
      const d = r.data.data || {}
      setDetail({
        session,
        present: d.presentStudents || d.present || [],
        absent: d.absentStudents || d.absent || [],
        loading: false,
      })
    } catch {
      setDetail({ session, present: [], absent: [], loading: false })
    } finally {
      setDetailLoading(false)
    }
  }

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))

  const formatDate = d => d ? new Date(d).toLocaleDateString() : '—'
  const formatTime = t => t || '—'

  return (
    <div className="page">
      {/* Filter bar */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '14px 18px', boxShadow: 'var(--shadow-sm)',
        display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
          <label className="form-label">Course</label>
          <select className="form-select" value={filters.courseId} onChange={e => setFilter('courseId', e.target.value)}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 180px' }}>
          <label className="form-label">Batch</label>
          <select className="form-select" value={filters.batchId} onChange={e => setFilter('batchId', e.target.value)}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
          <label className="form-label">From</label>
          <input className="form-input" type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
          <label className="form-label">To</label>
          <input className="form-input" type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 130px' }}>
          <label className="form-label">Status</label>
          <select className="form-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ alignSelf: 'flex-end', marginBottom: 1 }}
          onClick={() => exportCSV(sessions)}
          disabled={sessions.length === 0}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatPill label="Total Sessions" value={stats.total} color="var(--primary)" />
          <StatPill label="Avg Attendance %" value={stats.avgAtt + '%'} color={stats.avgAtt >= 75 ? 'var(--success)' : 'var(--warning)'} />
          <StatPill label="Biometric %" value={stats.biometricPct + '%'} color="var(--secondary)" />
          <StatPill label="Manual %" value={stats.manualPct + '%'} color="var(--text-secondary)" />
        </div>
      )}

      {/* Table */}
      <div className="table-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="table-empty">No sessions found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Course</th>
                <th>Batch</th>
                <th>Method</th>
                <th>Time</th>
                <th>Present / Total</th>
                <th>Attendance %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const pct = s.totalStudents ? Math.round((s.presentCount || 0) / s.totalStudents * 100) : 0
                return (
                  <tr key={s._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(s.date)}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{s.course?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.batch?.name || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: s.method === 'biometric' || s.method === 'face' ? '#EDE9FE' : '#F1F5F9',
                        color: s.method === 'biometric' || s.method === 'face' ? '#065f46' : 'var(--text-secondary)',
                      }}>
                        {s.method === 'biometric' || s.method === 'face'
                          ? <Fingerprint size={10} />
                          : <UserCheck size={10} />
                        }
                        {s.method || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatTime(s.startTime)} — {formatTime(s.endTime)}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ color: 'var(--success)' }}>{s.presentCount || 0}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / {s.totalStudents || 0}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                        <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 999,
                            background: pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, width: 36, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === 'completed' ? 'approved' : s.status === 'cancelled' ? 'rejected' : 'pending'}`}>
                        {s.status || '—'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn view" onClick={() => openDetail(s)}>Details</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal title="Session Details" onClose={() => setDetail(null)} width={560}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{detail.session.course?.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{formatDate(detail.session.date)}</span>
              <span>{formatTime(detail.session.startTime)} – {formatTime(detail.session.endTime)}</span>
              <span>{detail.session.batch?.name || '—'}</span>
            </div>
          </div>

          {detailLoading ? (
            <div className="table-loading"><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Present */}
              <div>
                <div style={{
                  fontWeight: 600, fontSize: 12, color: '#065F46', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <CheckCircle size={12} />
                  Present ({detail.present.length})
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {detail.present.length === 0
                    ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</div>
                    : detail.present.map((s, i) => (
                      <div key={s._id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', background: '#ECFDF5', borderRadius: 8, fontSize: 12,
                      }}>
                        <div className="student-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                          {(s.profile?.name || s.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{s.profile?.name || s.name || '—'}</div>
                          {s.markedAt && <div style={{ fontSize: 10, color: '#065F46' }}>{new Date(s.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                        </div>
                        {s.method && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#D1FAE5', color: '#065F46' }}>
                            {s.method.toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
              {/* Absent */}
              <div>
                <div style={{
                  fontWeight: 600, fontSize: 12, color: '#991B1B', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <XCircle size={12} />
                  Absent ({detail.absent.length})
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {detail.absent.length === 0
                    ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</div>
                    : detail.absent.map((s, i) => (
                      <div key={s._id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', background: '#FEF2F2', borderRadius: 8, fontSize: 12,
                      }}>
                        <div className="student-avatar" style={{ width: 24, height: 24, fontSize: 10, background: '#FEE2E2', color: '#991B1B' }}>
                          {(s.profile?.name || s.name || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.profile?.name || s.name || '—'}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
