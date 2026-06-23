import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import './Students.css'

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected']

export default function Students() {
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (status !== 'all') params.status = status
    if (search) params.search = search
    api.get('/admin/students', { params })
      .then(r => setStudents(r.data.data))
      .finally(() => setLoading(false))
  }, [status, search])

  useEffect(() => { load() }, [load])

  const approve = async id => {
    await api.put(`/admin/students/${id}/approve`)
    toast('Student approved', 'success')
    load()
    if (selected?._id === id) setSelected(null)
  }

  const reject = async () => {
    await api.put(`/admin/students/${rejectModal._id}/reject`, { reason: rejectReason })
    toast('Student rejected', 'info')
    setRejectModal(null); setRejectReason('')
    load()
    if (selected?._id === rejectModal._id) setSelected(null)
  }

  const remove = async id => {
    if (!confirm('Delete this student?')) return
    await api.delete(`/admin/students/${id}`)
    toast('Student deleted', 'info')
    load()
    if (selected?._id === id) setSelected(null)
  }

  const viewDetail = async id => {
    const r = await api.get(`/admin/students/${id}`)
    setSelected(r.data.data)
  }

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="status-tabs">
          {STATUS_TABS.map(t => (
            <button key={t} className={`tab-btn ${status === t ? 'active' : ''}`} onClick={() => setStatus(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Search by name, email or roll no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="table-empty">No students found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Serial Code</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s._id}>
                  <td>
                    <div className="student-cell">
                      <div className="student-avatar">{(s.profile?.name || s.email)[0].toUpperCase()}</div>
                      <div>
                        <div className="student-name">{s.profile?.name || '—'}</div>
                        <div className="student-email">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.profile?.rollNumber || '—'}</td>
                  <td>{s.profile?.department || '—'}</td>
                  <td>{s.profile?.semester || '—'}</td>
                  <td><code className="serial-code">{s.serialNumber?.code}</code></td>
                  <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                  <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn view" onClick={() => viewDetail(s._id)}>View</button>
                      {s.status === 'pending' && <>
                        <button className="action-btn approve" onClick={() => approve(s._id)}>Approve</button>
                        <button className="action-btn reject" onClick={() => { setRejectModal(s); setRejectReason('') }}>Reject</button>
                      </>}
                      <button className="action-btn delete" onClick={() => remove(s._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal title="Student Details" onClose={() => setSelected(null)} width={560}>
          <div className="detail-grid">
            <div className="detail-avatar">{(selected.profile?.name || selected.email)[0].toUpperCase()}</div>
            <div className="detail-header-info">
              <h3>{selected.profile?.name || 'No name set'}</h3>
              <p>{selected.email}</p>
              <span className={`badge badge-${selected.status}`}>{selected.status}</span>
            </div>
          </div>
          <div className="detail-fields">
            {[
              ['Roll Number', selected.profile?.rollNumber],
              ['Department', selected.profile?.department],
              ['Semester', selected.profile?.semester],
              ['Phone', selected.profile?.phone],
              ['CNIC', selected.profile?.cnic],
              ['Date of Birth', selected.profile?.dateOfBirth ? new Date(selected.profile.dateOfBirth).toLocaleDateString() : null],
              ['Gender', selected.profile?.gender],
              ['Address', selected.profile?.address],
              ['City', selected.profile?.city],
              ['Guardian Name', selected.profile?.guardianName],
              ['Guardian Phone', selected.profile?.guardianPhone],
              ['Serial Code', selected.serialNumber?.code],
              ['Registered', new Date(selected.createdAt).toLocaleString()],
              ['Approved By', selected.approvedBy?.name],
            ].map(([k, v]) => v ? (
              <div key={k} className="detail-field">
                <span className="detail-key">{k}</span>
                <span className="detail-val">{v}</span>
              </div>
            ) : null)}
          </div>
          {selected.status === 'pending' && (
            <div className="btn-row">
              <button className="btn btn-danger" onClick={() => { setRejectModal(selected); setSelected(null) }}>Reject</button>
              <button className="btn btn-success" onClick={() => approve(selected._id)}>Approve</button>
            </div>
          )}
        </Modal>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <Modal title="Reject Student" onClose={() => setRejectModal(null)} width={400}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Rejecting <strong>{rejectModal.email}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">Reason (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={reject}>Confirm Reject</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
