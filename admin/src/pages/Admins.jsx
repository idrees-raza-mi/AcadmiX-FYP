import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const EMPTY = { name: '', email: '', password: '', role: 'admin', department: '', phone: '' }

export default function Admins() {
  const toast = useToast()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/admins').then(r => setAdmins(r.data.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = a => { setSelected(a); setForm({ name: a.name, email: a.email, password: '', role: a.role, department: a.department || '', phone: a.phone || '' }); setModal('edit') }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'create') {
        await api.post('/admin/admins', form)
        toast('Admin created', 'success')
      } else {
        const { password, email, ...rest } = form
        await api.put(`/admin/admins/${selected._id}`, rest)
        toast('Admin updated', 'success')
      }
      setModal(null); load()
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
    finally { setSaving(false) }
  }

  const remove = async id => {
    if (!confirm('Delete this admin?')) return
    try {
      await api.delete(`/admin/admins/${id}`)
      toast('Admin deleted', 'info'); load()
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
  }

  const toggle = async a => {
    await api.put(`/admin/admins/${a._id}`, { isActive: !a.isActive })
    toast(`Admin ${!a.isActive ? 'activated' : 'deactivated'}`, 'info'); load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const roleColor = { superadmin: 'badge-approved', admin: 'badge-pending', hod: 'badge-excused' }

  return (
    <div className="page">
      <div className="page-toolbar">
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{admins.length} admins</span>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openCreate}>+ Add Admin</button>
      </div>

      <div className="table-card">
        {loading ? <div className="table-loading"><div className="spinner" /></div> :
          admins.length === 0 ? <div className="table-empty">No admins yet</div> :
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Created By</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a._id}>
                  <td>
                    <div className="student-cell">
                      <div className="student-avatar">{a.name[0].toUpperCase()}</div>
                      <div className="student-name">{a.name}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{a.email}</td>
                  <td><span className={`badge ${roleColor[a.role] || 'badge-pending'}`}>{a.role}</span></td>
                  <td style={{ fontSize: 13 }}>{a.department || '—'}</td>
                  <td><span className={`badge ${a.isActive ? 'badge-approved' : 'badge-rejected'}`}>{a.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.createdBy?.name || 'System'}</td>
                  <td>
                    <div className="action-btns">
                      {a.role !== 'superadmin' && <>
                        <button className="action-btn view" onClick={() => openEdit(a)}>Edit</button>
                        <button className="action-btn approve" onClick={() => toggle(a)}>{a.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button className="action-btn delete" onClick={() => remove(a._id)}>Delete</button>
                      </>}
                      {a.role === 'superadmin' && <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Protected</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add Admin / HOD' : 'Edit Admin'} onClose={() => setModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Dr. Ahmed" />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={e => f('role', e.target.value)}>
                <option value="admin">Admin</option>
                <option value="hod">HOD</option>
              </select>
            </div>
          </div>
          {modal === 'create' && <>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Min 6 characters" />
            </div>
          </>}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={e => f('department', e.target.value)} placeholder="Computer Science" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => f('phone', e.target.value)} />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
              {saving ? 'Saving...' : modal === 'create' ? 'Create Admin' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
