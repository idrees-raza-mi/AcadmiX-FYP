import { useEffect, useState, useCallback } from 'react'
import { Copy } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import './Serials.css'

export default function Serials() {
  const toast = useToast()
  const [serials, setSerials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | used | unused
  const [modal, setModal] = useState(false)
  const [count, setCount] = useState(5)
  const [note, setNote] = useState('')
  const [generating, setGenerating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = filter !== 'all' ? { isUsed: filter === 'used' } : {}
    api.get('/admin/serials', { params }).then(r => setSerials(r.data.data)).finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await api.post('/admin/serials/generate', { count, note })
      toast(`${r.data.count} serial codes generated`, 'success')
      setModal(false); setCount(5); setNote(''); load()
    } catch (e) { toast(e.response?.data?.message || 'Error', 'error') }
    finally { setGenerating(false) }
  }

  const remove = async id => {
    try {
      await api.delete(`/admin/serials/${id}`)
      toast('Serial deleted', 'info'); load()
    } catch (e) { toast(e.response?.data?.message || 'Cannot delete', 'error') }
  }

  const copy = code => {
    navigator.clipboard.writeText(code)
    toast(`Copied: ${code}`, 'success')
  }

  const unusedCount = serials.filter(s => !s.isUsed).length

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="status-tabs">
          {['all', 'unused', 'used'].map(f => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {unusedCount} unused available
          </span>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Generate Codes</button>
        </div>
      </div>

      <div className="table-card">
        {loading ? <div className="table-loading"><div className="spinner" /></div> :
          serials.length === 0 ? <div className="table-empty">No serial codes found</div> :
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Status</th><th>Note</th><th>Used By</th><th>Used At</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {serials.map(s => (
                <tr key={s._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code className="serial-code-large">{s.code}</code>
                      <button className="copy-btn" onClick={() => copy(s.code)} title="Copy"><Copy size={14} /></button>
                    </div>
                  </td>
                  <td><span className={`badge ${s.isUsed ? 'badge-rejected' : 'badge-approved'}`}>{s.isUsed ? 'Used' : 'Available'}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.note || '—'}</td>
                  <td>
                    {s.usedBy ? (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.usedBy.profile?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.usedBy.email}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>{s.usedAt ? new Date(s.usedAt).toLocaleDateString() : '—'}</td>
                  <td style={{ fontSize: 12 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>
                    {!s.isUsed && <button className="action-btn delete" onClick={() => remove(s._id)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {modal && (
        <Modal title="Generate Serial Codes" onClose={() => setModal(false)} width={380}>
          <div className="form-group">
            <label className="form-label">How many codes? (max 50)</label>
            <input className="form-input" type="number" min={1} max={50} value={count} onChange={e => setCount(+e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Batch 2024, CS Dept" />
          </div>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={generate} disabled={generating}>
              {generating ? 'Generating...' : `Generate ${count} Code${count !== 1 ? 's' : ''}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
