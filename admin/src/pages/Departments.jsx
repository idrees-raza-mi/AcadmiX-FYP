import { useEffect, useState, useCallback } from 'react'
import { Building2, User, Calendar, Mail, Phone, FileText, Armchair, Copy, GraduationCap, Key } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import BatchDetail from './BatchDetail'
import './Departments.css'

const EMPTY_DEPT = { name: '', code: '', description: '', hod: { name: '', email: '', phone: '' }, established: '', totalSeats: '', vision: '' }
const EMPTY_BATCH = { name: '', year: '', section: '', currentSemester: '1st', classTeacher: '', classTeacherEmail: '', maxStudents: 50 }

export default function Departments() {
  const toast = useToast()
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)        // 'dept-create'|'dept-edit'|'batch-create'|'batch-edit'
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT)
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH)
  const [selected, setSelected] = useState(null)  // selected dept
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [viewBatch, setViewBatch] = useState(null) // batch detail view
  const [saving, setSaving] = useState(false)
  const [expandedDept, setExpandedDept] = useState(null)
  const [batches, setBatches] = useState({})       // { deptId: [...batches] }

  const loadDepts = useCallback(() => {
    setLoading(true)
    api.get('/departments').then(r => setDepts(r.data.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadDepts() }, [loadDepts])

  const loadBatches = async (deptId) => {
    const r = await api.get(`/departments/${deptId}/batches`)
    setBatches(b => ({ ...b, [deptId]: r.data.data }))
  }

  const toggleDept = async (deptId) => {
    if (expandedDept === deptId) { setExpandedDept(null); return }
    setExpandedDept(deptId)
    if (!batches[deptId]) await loadBatches(deptId)
  }

  // ── Dept CRUD ──
  const openCreateDept = () => { setDeptForm(EMPTY_DEPT); setModal('dept-create') }
  const openEditDept = (d, e) => { e.stopPropagation(); setSelected(d); setDeptForm({ name: d.name, code: d.code, description: d.description, hod: { ...d.hod }, established: d.established, totalSeats: d.totalSeats, vision: d.vision }); setModal('dept-edit') }

  const saveDept = async () => {
    setSaving(true)
    try {
      if (modal === 'dept-create') { await api.post('/departments', deptForm); toast('Department created', 'success') }
      else { await api.put(`/departments/${selected._id}`, deptForm); toast('Department updated', 'success') }
      setModal(null); loadDepts()
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const deleteDept = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this department?')) return
    try { await api.delete(`/departments/${id}`); toast('Department deleted', 'info'); loadDepts() }
    catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
  }

  // ── Batch CRUD ──
  const openCreateBatch = (dept, e) => { e.stopPropagation(); setSelected(dept); setBatchForm(EMPTY_BATCH); setModal('batch-create') }

  const openEditBatch = (dept, batch, e) => {
    e.stopPropagation(); setSelected(dept); setSelectedBatch(batch)
    setBatchForm({ name: batch.name, year: batch.year, section: batch.section, currentSemester: batch.currentSemester, classTeacher: batch.classTeacher, classTeacherEmail: batch.classTeacherEmail, maxStudents: batch.maxStudents })
    setModal('batch-edit')
  }

  const saveBatch = async () => {
    setSaving(true)
    try {
      if (modal === 'batch-create') { await api.post(`/departments/${selected._id}/batches`, batchForm); toast('Batch created', 'success') }
      else { await api.put(`/departments/${selected._id}/batches/${selectedBatch._id}`, batchForm); toast('Batch updated', 'success') }
      setModal(null); await loadBatches(selected._id)
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const deleteBatch = async (dept, batch, e) => {
    e.stopPropagation()
    if (!confirm('Delete this batch?')) return
    try { await api.delete(`/departments/${dept._id}/batches/${batch._id}`); toast('Batch deleted', 'info'); await loadBatches(dept._id) }
    catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
  }

  const regenerateCode = async (dept, batch, e) => {
    e.stopPropagation()
    if (!confirm('Generate a new secret code? The old one will stop working.')) return
    try {
      const r = await api.post(`/departments/${dept._id}/batches/${batch._id}/regenerate-code`)
      toast(`New code: ${r.data.data.secretCode}`, 'success')
      await loadBatches(dept._id)
    } catch (e) { toast('Error', 'error') }
  }

  const copyCode = (code, e) => { e.stopPropagation(); navigator.clipboard.writeText(code); toast(`Copied: ${code}`, 'success') }

  const df = (k, v) => setDeptForm(p => ({ ...p, [k]: v }))
  const dfh = (k, v) => setDeptForm(p => ({ ...p, hod: { ...p.hod, [k]: v } }))
  const bf = (k, v) => setBatchForm(p => ({ ...p, [k]: v }))

  if (viewBatch) return <BatchDetail batch={viewBatch} onBack={() => { setViewBatch(null); loadBatches(viewBatch.department?._id || viewBatch.department) }} />

  const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

  return (
    <div className="page">
      <div className="page-toolbar">
        <div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{depts.length} Departments</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13, marginLeft: 8 }}>Click a department to manage its batches</span>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreateDept}>+ New Department</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div> :
        depts.length === 0 ? (
          <div className="dept-empty">
            <div className="dept-empty-icon"><Building2 size={40} strokeWidth={1.5} /></div>
            <h3>No departments yet</h3>
            <p>Create your first department to get started</p>
            <button className="btn btn-primary" onClick={openCreateDept}>+ Create Department</button>
          </div>
        ) : (
          <div className="dept-list">
            {depts.map(d => (
              <div key={d._id} className={`dept-card ${expandedDept === d._id ? 'expanded' : ''}`}>
                {/* Department Header */}
                <div className="dept-header" onClick={() => toggleDept(d._id)}>
                  <div className="dept-header-left">
                    <div className="dept-icon">{d.code.substring(0, 2)}</div>
                    <div>
                      <h3 className="dept-name">{d.name}</h3>
                      <div className="dept-meta-row">
                        <span className="dept-code-badge">{d.code}</span>
                        {d.hod?.name && <span className="dept-meta-item"><User size={12} className="ico-inline" />HOD: <strong>{d.hod.name}</strong></span>}
                        {d.established && <span className="dept-meta-item"><Calendar size={12} className="ico-inline" />Est. {d.established}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="dept-header-right">
                    <div className="dept-stats">
                      <div className="dept-stat"><span>{d.batchCount || 0}</span><label>Batches</label></div>
                      <div className="dept-stat"><span>{d.studentCount || 0}</span><label>Students</label></div>
                    </div>
                    <div className="dept-actions" onClick={e => e.stopPropagation()}>
                      <button className="action-btn view" onClick={e => openEditDept(d, e)}>Edit</button>
                      <button className="action-btn approve" onClick={e => openCreateBatch(d, e)}>+ Batch</button>
                      <button className="action-btn delete" onClick={e => deleteDept(d._id, e)}>Delete</button>
                    </div>
                    <span className="dept-chevron">{expandedDept === d._id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* HOD info bar */}
                {d.hod?.email && (
                  <div className="dept-info-bar">
                    {d.hod?.email && <span><Mail size={12} className="ico-inline" />{d.hod.email}</span>}
                    {d.hod?.phone && <span><Phone size={12} className="ico-inline" />{d.hod.phone}</span>}
                    {d.description && <span><FileText size={12} className="ico-inline" />{d.description}</span>}
                    {d.totalSeats > 0 && <span><Armchair size={12} className="ico-inline" />Total Seats: {d.totalSeats}</span>}
                  </div>
                )}

                {/* Batches */}
                {expandedDept === d._id && (
                  <div className="batches-section">
                    <div className="batches-header">
                      <h4>Batches / Classes</h4>
                      <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={e => openCreateBatch(d, e)}>+ Add Batch</button>
                    </div>

                    {!batches[d._id] ? <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" /></div> :
                      batches[d._id].length === 0 ? <div className="batches-empty">No batches yet. Create one to get started.</div> :
                      <div className="batches-grid">
                        {batches[d._id].map(b => (
                          <div key={b._id} className="batch-card" onClick={() => setViewBatch({ ...b, department: d })}>
                            <div className="batch-card-top">
                              <div>
                                <div className="batch-name">{b.name}</div>
                                <div className="batch-meta">
                                  {b.year && <span>{b.year}</span>}
                                  {b.section && <span>Section {b.section}</span>}
                                  <span>Sem {b.currentSemester}</span>
                                </div>
                              </div>
                              <span className={`badge ${b.isActive ? 'badge-approved' : 'badge-rejected'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                            </div>

                            <div className="batch-secret">
                              <span className="batch-secret-label">Secret Code</span>
                              <div className="batch-secret-row">
                                <code className="batch-code">{b.secretCode}</code>
                                <button className="copy-btn" onClick={e => copyCode(b.secretCode, e)} title="Copy"><Copy size={14} /></button>
                              </div>
                            </div>

                            {b.classTeacher && <div className="batch-teacher"><GraduationCap size={13} className="ico-inline" />{b.classTeacher}</div>}

                            <div className="batch-counts">
                              <div className="batch-count-item"><span>{b.studentCount || 0}</span><label>Students</label></div>
                              <div className="batch-count-item"><span>{b.courseCount || 0}</span><label>Courses</label></div>
                              <div className="batch-count-item"><span>{b.maxStudents}</span><label>Max</label></div>
                            </div>

                            <div className="batch-card-actions" onClick={e => e.stopPropagation()}>
                              <button className="action-btn view" onClick={e => { e.stopPropagation(); openEditBatch(d, b, e) }}>Edit</button>
                              <button className="action-btn approve" onClick={e => regenerateCode(d, b, e)}>New Code</button>
                              <button className="action-btn delete" onClick={e => deleteBatch(d, b, e)}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }

      {/* Department Modal */}
      {(modal === 'dept-create' || modal === 'dept-edit') && (
        <Modal title={modal === 'dept-create' ? 'Create Department' : 'Edit Department'} onClose={() => setModal(null)} width={580}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department Name *</label>
              <input className="form-input" value={deptForm.name} onChange={e => df('name', e.target.value)} placeholder="Computer Science" />
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input className="form-input" value={deptForm.code} onChange={e => df('code', e.target.value.toUpperCase())} placeholder="CS" maxLength={10} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={deptForm.description} onChange={e => df('description', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ padding: '12px 0 8px', fontWeight: 700, fontSize: 13, color: 'var(--text)', borderTop: '1px solid var(--light-gray)', marginTop: 4 }}>HOD / Head of Department</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">HOD Name</label>
              <input className="form-input" value={deptForm.hod.name} onChange={e => dfh('name', e.target.value)} placeholder="Dr. Ahmed Khan" />
            </div>
            <div className="form-group">
              <label className="form-label">HOD Email</label>
              <input className="form-input" type="email" value={deptForm.hod.email} onChange={e => dfh('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">HOD Phone</label>
              <input className="form-input" value={deptForm.hod.phone} onChange={e => dfh('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Established Year</label>
              <input className="form-input" value={deptForm.established} onChange={e => df('established', e.target.value)} placeholder="2005" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Seats</label>
              <input className="form-input" type="number" value={deptForm.totalSeats} onChange={e => df('totalSeats', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vision / Mission</label>
              <input className="form-input" value={deptForm.vision} onChange={e => df('vision', e.target.value)} placeholder="Brief vision statement" />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveDept} disabled={saving || !deptForm.name || !deptForm.code}>
              {saving ? 'Saving...' : modal === 'dept-create' ? 'Create Department' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Batch Modal */}
      {(modal === 'batch-create' || modal === 'batch-edit') && (
        <Modal title={`${modal === 'batch-create' ? 'Add Batch' : 'Edit Batch'} — ${selected?.name}`} onClose={() => setModal(null)} width={520}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Batch / Class Name *</label>
              <input className="form-input" value={batchForm.name} onChange={e => bf('name', e.target.value)} placeholder="BSCS-2021 or Section-A" />
            </div>
            <div className="form-group">
              <label className="form-label">Current Semester</label>
              <select className="form-select" value={batchForm.currentSemester} onChange={e => bf('currentSemester', e.target.value)}>
                {SEMESTERS.map(s => <option key={s} value={s}>{s} Semester</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Year / Session</label>
              <input className="form-input" value={batchForm.year} onChange={e => bf('year', e.target.value)} placeholder="2021-2025" />
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <input className="form-input" value={batchForm.section} onChange={e => bf('section', e.target.value)} placeholder="A, B, Morning..." />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Class Teacher</label>
              <input className="form-input" value={batchForm.classTeacher} onChange={e => bf('classTeacher', e.target.value)} placeholder="Sir Ali Hassan" />
            </div>
            <div className="form-group">
              <label className="form-label">Teacher Email</label>
              <input className="form-input" type="email" value={batchForm.classTeacherEmail} onChange={e => bf('classTeacherEmail', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Max Students</label>
            <input className="form-input" type="number" value={batchForm.maxStudents} onChange={e => bf('maxStudents', e.target.value)} min={1} max={500} />
          </div>
          {modal === 'batch-create' && (
            <div className="batch-code-notice"><Key size={13} className="ico-inline" />A unique secret code will be automatically generated for this batch</div>
          )}
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveBatch} disabled={saving || !batchForm.name}>
              {saving ? 'Saving...' : modal === 'batch-create' ? 'Create Batch' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
