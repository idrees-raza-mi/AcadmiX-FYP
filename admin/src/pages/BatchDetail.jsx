import { useEffect, useState, useCallback } from 'react'
import { Calendar, Bookmark, BookOpen, User, GraduationCap, Copy, Mail, Clock, Users } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import './BatchDetail.css'

const EMPTY_COURSE = { name: '', code: '', description: '', credits: 3, semester: '', teacher: '', teacherEmail: '', schedule: '' }

export default function BatchDetail({ batch, onBack }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('students')
  const [modal, setModal] = useState(null)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [enrollModal, setEnrollModal] = useState(null)
  const [enrollStudentId, setEnrollStudentId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/departments/${batch.department?._id || batch.department}/batches/${batch._id}`)
      setData(r.data.data)
    } finally { setLoading(false) }
  }, [batch])

  useEffect(() => { load() }, [load])

  const approveStudent = async (id) => {
    await api.put(`/admin/students/${id}/approve`)
    toast('Student approved', 'success'); load()
  }

  const rejectStudent = async () => {
    await api.put(`/admin/students/${rejectModal._id}/reject`, { reason: rejectReason })
    toast('Student rejected', 'info'); setRejectModal(null); setRejectReason(''); load()
  }

  const openCreateCourse = () => { setCourseForm(EMPTY_COURSE); setModal('course-create') }
  const openEditCourse = c => { setSelectedCourse(c); setCourseForm({ name: c.name, code: c.code, description: c.description, credits: c.credits, semester: c.semester, teacher: c.teacher, teacherEmail: c.teacherEmail, schedule: c.schedule }); setModal('course-edit') }

  const saveCourse = async () => {
    setSaving(true)
    try {
      const payload = { ...courseForm, batch: batch._id, department: batch.department?._id || batch.department }
      if (modal === 'course-create') { await api.post('/courses', payload); toast('Course created', 'success') }
      else { await api.put(`/courses/${selectedCourse._id}`, payload); toast('Course updated', 'success') }
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const deleteCourse = async id => {
    if (!confirm('Delete this course?')) return
    await api.delete(`/courses/${id}`)
    toast('Course deleted', 'info'); load()
  }

  const openEnroll = c => { setEnrollStudentId(''); setSelectedCourse(c); setModal('enroll') }

  const enrollStudent = async () => {
    if (!enrollStudentId) return
    try {
      await api.post(`/courses/${selectedCourse._id}/enroll`, { studentId: enrollStudentId })
      toast('Student enrolled', 'success'); setModal(null); load()
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
  }

  const cf = (k, v) => setCourseForm(p => ({ ...p, [k]: v }))

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
  if (!data) return null

  const dept = data.department || batch.department
  const approvedStudents = data.students?.filter(s => s.status === 'approved') || []
  const pendingStudents = data.students?.filter(s => s.status === 'pending') || []

  return (
    <div className="page">
      {/* Back + Header */}
      <button className="back-btn" onClick={onBack}>← Back to Departments</button>

      {/* Batch info header card */}
      <div className="batch-detail-header">
        <div className="batch-detail-header-left">
          <div className="batch-detail-icon">{(dept?.code || 'BT').substring(0, 2)}</div>
          <div>
            <div className="batch-detail-dept">{dept?.name || 'Department'} · {dept?.code}</div>
            <h2 className="batch-detail-name">{data.name}</h2>
            <div className="batch-detail-meta">
              {data.year && <span><Calendar size={13} className="ico-inline" />{data.year}</span>}
              {data.section && <span><Bookmark size={13} className="ico-inline" />Section {data.section}</span>}
              <span><BookOpen size={13} className="ico-inline" />Semester {data.currentSemester}</span>
              {data.classTeacher && <span><User size={13} className="ico-inline" />{data.classTeacher}</span>}
              {dept?.hod?.name && <span><GraduationCap size={13} className="ico-inline" />HOD: {dept.hod.name}</span>}
            </div>
          </div>
        </div>
        <div className="batch-detail-secret">
          <div className="batch-secret-label">Secret Code</div>
          <div className="batch-secret-row">
            <code className="batch-code" style={{ fontSize: 16, padding: '8px 14px' }}>{data.secretCode}</code>
            <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(data.secretCode); toast('Copied!', 'success') }}><Copy size={14} /></button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>Share with students to register</div>
        </div>
        <div className="batch-detail-stats">
          <div className="batch-detail-stat"><span>{data.students?.length || 0}</span><label>Total Students</label></div>
          <div className="batch-detail-stat"><span style={{ color: 'var(--warning)' }}>{pendingStudents.length}</span><label>Pending</label></div>
          <div className="batch-detail-stat"><span style={{ color: 'var(--success)' }}>{approvedStudents.length}</span><label>Approved</label></div>
          <div className="batch-detail-stat"><span>{data.courses?.length || 0}</span><label>Courses</label></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="batch-tabs">
        {[['students', `Students (${data.students?.length || 0})`], ['pending', `Pending (${pendingStudents.length})`], ['courses', `Courses (${data.courses?.length || 0})`]].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Students tab */}
      {tab === 'students' && (
        <div className="table-card">
          {approvedStudents.length === 0 ? <div className="table-empty">No approved students yet</div> :
            <table className="table">
              <thead><tr><th>Student</th><th>Roll No</th><th>CNIC</th><th>Phone</th><th>Semester</th><th>Status</th></tr></thead>
              <tbody>
                {approvedStudents.map(s => (
                  <tr key={s._id}>
                    <td><div className="student-cell"><div className="student-avatar">{(s.profile?.name || s.email)[0].toUpperCase()}</div><div><div className="student-name">{s.profile?.name || '—'}</div><div className="student-email">{s.email}</div></div></div></td>
                    <td>{s.profile?.rollNumber || '—'}</td>
                    <td>{s.profile?.cnic || '—'}</td>
                    <td>{s.profile?.phone || '—'}</td>
                    <td>{s.profile?.semester || data.currentSemester}</td>
                    <td><span className="badge badge-approved">Approved</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      )}

      {/* Pending tab */}
      {tab === 'pending' && (
        <div className="table-card">
          {pendingStudents.length === 0 ? <div className="table-empty">No pending approvals</div> :
            <table className="table">
              <thead><tr><th>Student</th><th>Email</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingStudents.map(s => (
                  <tr key={s._id}>
                    <td><div className="student-cell"><div className="student-avatar">{s.email[0].toUpperCase()}</div><div className="student-name">{s.profile?.name || 'Not set'}</div></div></td>
                    <td style={{ fontSize: 13 }}>{s.email}</td>
                    <td style={{ fontSize: 12 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td><div className="action-btns">
                      <button className="action-btn approve" onClick={() => approveStudent(s._id)}>Approve</button>
                      <button className="action-btn reject" onClick={() => { setRejectModal(s); setRejectReason('') }}>Reject</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      )}

      {/* Courses tab */}
      {tab === 'courses' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={openCreateCourse}>+ Add Course</button>
          </div>
          {data.courses?.length === 0 ? (
            <div className="table-card"><div className="table-empty">No courses yet. Add one to get started.</div></div>
          ) : (
            <div className="courses-grid">
              {data.courses?.map(c => (
                <div key={c._id} className="course-card">
                  <div className="course-card-header">
                    <div className="course-icon"><BookOpen size={18} /></div>
                    <div><div className="course-name">{c.name}</div><code className="serial-code">{c.code}</code></div>
                  </div>
                  <div className="course-meta">
                    <span>{c.credits} credits</span>
                    {c.semester && <span>Sem {c.semester}</span>}
                  </div>
                  {c.teacher && <div className="course-instructor"><GraduationCap size={13} className="ico-inline" />{c.teacher}</div>}
                  {c.teacherEmail && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}><Mail size={12} className="ico-inline" />{c.teacherEmail}</div>}
                  {c.schedule && <div className="course-schedule"><Clock size={13} className="ico-inline" />{c.schedule}</div>}
                  <div className="course-students"><Users size={13} className="ico-inline" />{c.students?.length || 0} enrolled</div>
                  <div className="course-actions">
                    <button className="action-btn approve" onClick={() => openEnroll(c)}>Enroll</button>
                    <button className="action-btn view" onClick={() => openEditCourse(c)}>Edit</button>
                    <button className="action-btn delete" onClick={() => deleteCourse(c._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title="Reject Student" onClose={() => setRejectModal(null)} width={400}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Rejecting <strong>{rejectModal.email}</strong></p>
          <div className="form-group">
            <label className="form-label">Reason (optional)</label>
            <textarea className="form-input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={rejectStudent}>Confirm Reject</button>
          </div>
        </Modal>
      )}

      {/* Course Modal */}
      {(modal === 'course-create' || modal === 'course-edit') && (
        <Modal title={modal === 'course-create' ? 'Add Course' : 'Edit Course'} onClose={() => setModal(null)} width={520}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Course Name *</label><input className="form-input" value={courseForm.name} onChange={e => cf('name', e.target.value)} placeholder="Data Structures" /></div>
            <div className="form-group"><label className="form-label">Course Code *</label><input className="form-input" value={courseForm.code} onChange={e => cf('code', e.target.value.toUpperCase())} placeholder="CS-301" disabled={modal === 'course-edit'} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Teacher Name</label><input className="form-input" value={courseForm.teacher} onChange={e => cf('teacher', e.target.value)} placeholder="Sir Ahmed" /></div>
            <div className="form-group"><label className="form-label">Teacher Email</label><input className="form-input" type="email" value={courseForm.teacherEmail} onChange={e => cf('teacherEmail', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Credits</label><input className="form-input" type="number" min={1} max={6} value={courseForm.credits} onChange={e => cf('credits', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Semester</label><input className="form-input" value={courseForm.semester} onChange={e => cf('semester', e.target.value)} placeholder="3rd" /></div>
          </div>
          <div className="form-group"><label className="form-label">Schedule</label><input className="form-input" value={courseForm.schedule} onChange={e => cf('schedule', e.target.value)} placeholder="Mon/Wed 10:00-11:30" /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={courseForm.description} onChange={e => cf('description', e.target.value)} style={{ resize: 'vertical' }} /></div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCourse} disabled={saving || !courseForm.name || !courseForm.code}>
              {saving ? 'Saving...' : modal === 'course-create' ? 'Add Course' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Enroll Modal */}
      {modal === 'enroll' && (
        <Modal title={`Enroll Student — ${selectedCourse?.name}`} onClose={() => setModal(null)} width={400}>
          <div className="form-group">
            <label className="form-label">Select Approved Student</label>
            <select className="form-select" value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}>
              <option value="">— Choose student —</option>
              {approvedStudents.filter(s => !selectedCourse?.students?.includes(s._id)).map(s => (
                <option key={s._id} value={s._id}>{s.profile?.name || s.email} ({s.profile?.rollNumber || 'no roll'})</option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={enrollStudent} disabled={!enrollStudentId}>Enroll</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
