import { useEffect, useState, useCallback } from 'react'
import { BookOpen, User, Users, Clock } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import './Courses.css'

const EMPTY_FORM = { name: '', code: '', description: '', credits: 3, department: '', semester: '', schedule: '', capacity: 0, batch: '', autoEnroll: false }

export default function Courses() {
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'enroll' | 'view'
  const [form, setForm] = useState(EMPTY_FORM)
  const [selected, setSelected] = useState(null)
  const [enrollId, setEnrollId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/courses').then(r => setCourses(r.data.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/departments/batches').then(r => setBatches(r.data.data || [])).catch(() => {}) }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create') }

  const openEdit = c => {
    setSelected(c)
    setForm({ name: c.name, code: c.code, description: c.description, credits: c.credits, department: c.department, semester: c.semester, schedule: c.schedule, capacity: c.capacity || 0, batch: c.batch?._id || c.batch || '', autoEnroll: false })
    setModal('edit')
  }

  const openView = async id => {
    const r = await api.get(`/courses/${id}`)
    setSelected(r.data.data); setModal('view')
  }

  const openEnroll = c => {
    setSelected(c)
    api.get('/admin/students', { params: { status: 'approved' } }).then(r => setStudents(r.data.data))
    setModal('enroll')
  }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') {
        const r = await api.post('/courses', form)
        const n = r.data?.enrolledCount
        toast(n ? `Course created · ${n} students enrolled` : 'Course created', 'success')
      } else {
        await api.put(`/courses/${selected._id}`, form)
        toast('Course updated', 'success')
      }
      setModal(null); load()
    } catch (e) {
      toast(e.response?.data?.message || 'Error', 'error')
    } finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this course?')) return
    await api.delete(`/courses/${id}`)
    toast('Course deleted', 'info'); load()
  }

  const enroll = async () => {
    if (!enrollId) return
    try {
      await api.post(`/courses/${selected._id}/enroll`, { studentId: enrollId })
      toast('Student enrolled', 'success')
      setEnrollId(''); openView(selected._id)
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
  }

  const unenroll = async studentId => {
    await api.delete(`/courses/${selected._id}/enroll/${studentId}`)
    toast('Student removed', 'info'); openView(selected._id)
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page">
      <div className="page-toolbar">
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{courses.length} courses</span>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>+ New Course</button>
      </div>

      <div className="courses-grid">
        {loading ? <div className="table-loading"><div className="spinner" /></div> :
          courses.length === 0 ? <div className="table-empty">No courses yet</div> :
          courses.map(c => (
            <div key={c._id} className="course-card">
              <div className="course-card-header">
                <div className="course-icon"><BookOpen size={18} /></div>
                <div>
                  <div className="course-name">{c.name}</div>
                  <code className="serial-code">{c.code}</code>
                </div>
              </div>
              <div className="course-meta">
                <span>{c.credits} credits</span>
                {c.batch?.name && <span>{c.batch.name}</span>}
                {c.semester && <span>Sem {c.semester}</span>}
              </div>
              <div className="course-instructor"><User size={13} className="ico-inline" />{c.instructor?.name || 'Unassigned'}</div>
              <div className="course-students"><Users size={13} className="ico-inline" />{c.students?.length || 0} students enrolled</div>
              {c.schedule && <div className="course-schedule"><Clock size={13} className="ico-inline" />{c.schedule}</div>}
              <div className="course-actions">
                <button className="action-btn view" onClick={() => openView(c._id)}>View</button>
                <button className="action-btn approve" onClick={() => openEnroll(c)}>Enroll</button>
                <button className="action-btn view" onClick={() => openEdit(c)}>Edit</button>
                <button className="action-btn delete" onClick={() => remove(c._id)}>Delete</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New Course' : 'Edit Course'} onClose={() => setModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Course Name *</label>
              <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Data Structures" />
            </div>
            <div className="form-group">
              <label className="form-label">Course Code *</label>
              <input className="form-input" value={form.code} onChange={e => f('code', e.target.value)} placeholder="CS-301" disabled={modal === 'edit'} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => f('description', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Semester</label>
              <input className="form-input" value={form.semester} onChange={e => f('semester', e.target.value)} placeholder="3rd" />
            </div>
            <div className="form-group">
              <label className="form-label">Credits</label>
              <input className="form-input" type="number" min={1} max={6} value={form.credits} onChange={e => f('credits', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Schedule (text)</label>
              <input className="form-input" value={form.schedule} onChange={e => f('schedule', e.target.value)} placeholder="Mon/Wed 10:00-11:30" />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input className="form-input" type="number" min={0} value={form.capacity} onChange={e => f('capacity', e.target.value)} placeholder="0 = unlimited" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Batch *</label>
            <select className="form-select" value={form.batch} onChange={e => f('batch', e.target.value)}>
              <option value="">Select a batch…</option>
              {batches.map(b => (
                <option key={b._id} value={b._id}>
                  {b.name}{b.section ? ` · ${b.section}` : ''}{b.department?.code ? ` (${b.department.code})` : ''}
                </option>
              ))}
            </select>
            <div className="form-hint">The course belongs to this batch; its department is set automatically. Timetable slots are scheduled per batch.</div>
          </div>
          {modal === 'create' && form.batch && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.autoEnroll} onChange={e => f('autoEnroll', e.target.checked)} />
              Auto-enroll all approved students of this batch
            </label>
          )}
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.name || !form.code || !form.batch}>
              {saving ? 'Saving...' : modal === 'create' ? 'Create Course' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {modal === 'view' && selected && (
        <Modal title={selected.name} onClose={() => setModal(null)} width={560}>
          <div className="view-course-meta">
            <div className="detail-field"><span className="detail-key">Code</span><span className="detail-val">{selected.code}</span></div>
            <div className="detail-field"><span className="detail-key">Credits</span><span className="detail-val">{selected.credits}</span></div>
            <div className="detail-field"><span className="detail-key">Batch</span><span className="detail-val">{selected.batch?.name || '—'}</span></div>
            <div className="detail-field"><span className="detail-key">Semester</span><span className="detail-val">{selected.semester || '—'}</span></div>
            <div className="detail-field"><span className="detail-key">Instructor</span><span className="detail-val">{selected.instructor?.name || '—'}</span></div>
            <div className="detail-field"><span className="detail-key">Schedule</span><span className="detail-val">{selected.schedule || '—'}</span></div>
          </div>
          <h4 style={{ margin: '18px 0 10px', fontWeight: 700 }}>Enrolled Students ({selected.students?.length || 0})</h4>
          {selected.students?.length === 0 && <p style={{ color: 'var(--text-light)', fontSize: 13 }}>No students enrolled</p>}
          <div className="enrolled-list">
            {selected.students?.map(s => (
              <div key={s._id} className="enrolled-item">
                <div className="student-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{(s.profile?.name || s.email)[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.profile?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.email} · {s.profile?.rollNumber}</div>
                </div>
                <button className="action-btn delete" onClick={() => unenroll(s._id)}>Remove</button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Enroll Modal */}
      {modal === 'enroll' && selected && (
        <Modal title={`Enroll Student — ${selected.name}`} onClose={() => setModal(null)} width={420}>
          <div className="form-group">
            <label className="form-label">Select Approved Student</label>
            <select className="form-select" value={enrollId} onChange={e => setEnrollId(e.target.value)}>
              <option value="">— Choose student —</option>
              {students.filter(s => !selected.students?.find(e => e._id === s._id)).map(s => (
                <option key={s._id} value={s._id}>{s.profile?.name || s.email} ({s.profile?.rollNumber || 'no roll'})</option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={enroll} disabled={!enrollId}>Enroll</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
