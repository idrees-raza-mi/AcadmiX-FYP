import { useState } from 'react'
import { Building2, Users, BookOpen, ChevronRight, Check } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './SetupWizard.css'

const STEPS = [
  { id: 1, label: 'Department',  icon: Building2, desc: 'Set up your department info' },
  { id: 2, label: 'First Batch', icon: Users,     desc: 'Create your first class/batch' },
  { id: 3, label: 'Done',        icon: Check,     desc: 'You\'re ready to go!' },
]

const SEMESTERS = ['1st','2nd','3rd','4th','5th','6th','7th','8th']

export default function SetupWizard() {
  const { refreshUser } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [createdDept, setCreatedDept] = useState(null)
  const [createdBatch, setCreatedBatch] = useState(null)

  const [deptForm, setDeptForm] = useState({
    name: '', code: '', description: '',
    hod: { name: '', email: '', phone: '' },
    established: '', totalSeats: '', vision: ''
  })
  const [batchForm, setBatchForm] = useState({
    name: '', year: '', section: '',
    currentSemester: '1st', classTeacher: '', classTeacherEmail: '', maxStudents: 50
  })

  const df  = (k, v) => setDeptForm(p => ({ ...p, [k]: v }))
  const dfh = (k, v) => setDeptForm(p => ({ ...p, hod: { ...p.hod, [k]: v } }))
  const bf  = (k, v) => setBatchForm(p => ({ ...p, [k]: v }))

  const submitDept = async () => {
    if (!deptForm.name || !deptForm.code) { toast('Department name and code are required', 'error'); return }
    setSaving(true)
    try {
      const r = await api.post('/departments', deptForm)
      const dept = r.data.data
      setCreatedDept(dept)
      // Link this admin to the department
      await api.post('/admin/link-department', { departmentId: dept._id })
      refreshUser({ departmentId: dept._id, department: dept.name })
      setStep(2)
      toast('Department created!', 'success')
    } catch (e) { toast(e.response?.data?.message || 'Error creating department', 'error') }
    finally { setSaving(false) }
  }

  const submitBatch = async () => {
    if (!batchForm.name) { toast('Batch name is required', 'error'); return }
    setSaving(true)
    try {
      const r = await api.post(`/departments/${createdDept._id}/batches`, batchForm)
      setCreatedBatch(r.data.data)
      setStep(3)
      toast('Batch created!', 'success')
    } catch (e) { toast(e.response?.data?.message || 'Error creating batch', 'error') }
    finally { setSaving(false) }
  }

  const skipBatch = () => setStep(3)

  const finish = () => window.location.href = '/'

  return (
    <div className="setup-page">
      <div className="setup-container">
        {/* Header */}
        <div className="setup-header">
          <div className="setup-logo">AX</div>
          <h1 className="setup-title">Welcome to AcademicX</h1>
          <p className="setup-subtitle">Let's set up your department to get started</p>
        </div>

        {/* Step indicator */}
        <div className="setup-steps">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`setup-step ${step >= s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}>
              <div className="setup-step-circle">
                {step > s.id ? <Check size={13} /> : <span>{s.id}</span>}
              </div>
              <div className="setup-step-label">{s.label}</div>
              {i < STEPS.length - 1 && <div className={`setup-step-line ${step > s.id ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Department */}
        {step === 1 && (
          <div className="setup-card">
            <div className="setup-card-header">
              <Building2 size={18} className="setup-card-icon" />
              <div>
                <h2>Department Information</h2>
                <p>Fill in your department details</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department Name *</label>
                <input className="form-input" value={deptForm.name} onChange={e => df('name', e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              <div className="form-group">
                <label className="form-label">Department Code *</label>
                <input className="form-input" value={deptForm.code} onChange={e => df('code', e.target.value.toUpperCase())} placeholder="e.g. CS" maxLength={10} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={deptForm.description} onChange={e => df('description', e.target.value)} placeholder="Brief department description" style={{ resize: 'vertical' }} />
            </div>

            <div className="setup-section-title">Head of Department (HOD)</div>
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
                <input className="form-input" type="number" value={deptForm.totalSeats} onChange={e => df('totalSeats', e.target.value)} placeholder="120" />
              </div>
              <div className="form-group">
                <label className="form-label">Vision Statement</label>
                <input className="form-input" value={deptForm.vision} onChange={e => df('vision', e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <button className="btn btn-primary setup-next-btn" onClick={submitDept} disabled={saving}>
              {saving ? 'Creating...' : 'Create Department'} {!saving && <ChevronRight size={15} />}
            </button>
          </div>
        )}

        {/* Step 2 — First Batch */}
        {step === 2 && (
          <div className="setup-card">
            <div className="setup-card-header">
              <Users size={18} className="setup-card-icon" />
              <div>
                <h2>Create First Batch / Class</h2>
                <p>Add your first batch under <strong>{createdDept?.name}</strong></p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Batch / Class Name *</label>
                <input className="form-input" value={batchForm.name} onChange={e => bf('name', e.target.value)} placeholder="BSCS-2024 or Section-A" />
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
                <input className="form-input" value={batchForm.year} onChange={e => bf('year', e.target.value)} placeholder="2024-2028" />
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
                <label className="form-label">Max Students</label>
                <input className="form-input" type="number" value={batchForm.maxStudents} onChange={e => bf('maxStudents', e.target.value)} min={1} />
              </div>
            </div>

            <div className="setup-note">
              A unique secret code will be auto-generated for this batch. Share it with students to register.
            </div>

            <div className="setup-btn-row">
              <button className="btn btn-secondary" onClick={skipBatch}>Skip for now</button>
              <button className="btn btn-primary" onClick={submitBatch} disabled={saving}>
                {saving ? 'Creating...' : 'Create Batch'} {!saving && <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="setup-card setup-done">
            <div className="setup-done-icon"><Check size={32} /></div>
            <h2>You're all set!</h2>
            <p>Your department <strong>{createdDept?.name}</strong> has been created successfully.</p>

            {createdBatch && (
              <div className="setup-code-reveal">
                <div className="setup-code-label">Batch Secret Code for <strong>{createdBatch.name}</strong></div>
                <div className="setup-code">{createdBatch.secretCode}</div>
                <div className="setup-code-hint">Share this code with your students so they can register</div>
              </div>
            )}

            <button className="btn btn-primary setup-next-btn" onClick={finish}>
              Go to Dashboard <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
