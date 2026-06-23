import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, Clock } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' }

function timeToMins(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minsToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function generateSlots(start, end, duration) {
  const slots = []
  let cur = timeToMins(start)
  const endM = timeToMins(end)
  const dur = parseInt(duration) || 60
  while (cur + dur <= endM) {
    slots.push(minsToTime(cur))
    cur += dur
  }
  return slots
}

function hasConflict(slots, day, startTime, endTime, excludeId = null) {
  const newStart = timeToMins(startTime)
  const newEnd = timeToMins(endTime)
  return slots.some(s => {
    if (s._id === excludeId) return false
    if (s.day !== day) return false
    const sStart = timeToMins(s.startTime)
    const sEnd = timeToMins(s.endTime)
    return newStart < sEnd && newEnd > sStart
  })
}

const DEFAULT_FORM = { courseId: '', day: '', startTime: '', endTime: '', room: '' }

export default function Timetable() {
  const toast = useToast()
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [settings, setSettings] = useState({ lectureDuration: 60, classStartTime: '08:00', classEndTime: '17:00', workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday'] })
  const [selectedBatch, setSelectedBatch] = useState('')
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | 'add' | 'edit'
  const [editSlot, setEditSlot] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/departments/batches'),
      api.get('/courses'),
      api.get('/settings'),
    ]).then(([bRes, cRes, sRes]) => {
      setBatches(bRes.data.data || [])
      setCourses(cRes.data.data || [])
      const s = sRes.data.data || {}
      setSettings({
        lectureDuration: s.lectureDuration || 60,
        classStartTime: s.classStartTime || '08:00',
        classEndTime: s.classEndTime || '17:00',
        workingDays: s.workingDays || ['Monday','Tuesday','Wednesday','Thursday','Friday'],
      })
    }).catch(() => {})
  }, [])

  const loadSlots = useCallback(async (batchId) => {
    if (!batchId) return
    setLoading(true)
    try {
      const r = await api.get(`/schedule/batch/${batchId}`)
      // API may return a flat array OR an object grouped by day — normalize to a flat array
      const d = r.data.data || []
      setSlots(Array.isArray(d) ? d : Object.values(d).flat())
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to load schedule', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (selectedBatch) loadSlots(selectedBatch)
    else setSlots([])
  }, [selectedBatch, loadSlots])

  const workingDays = ALL_DAYS.filter(d => settings.workingDays.includes(d))
  const timeSlots = generateSlots(settings.classStartTime, settings.classEndTime, settings.lectureDuration)

  const getCellSlot = (day, time) => slots.find(s => s.day === day && s.startTime === time)

  const openAdd = (day, time) => {
    const endMins = timeToMins(time) + parseInt(settings.lectureDuration || 60)
    setForm({ courseId: '', day, startTime: time, endTime: minsToTime(endMins), room: '' })
    setEditSlot(null)
    setConflict(false)
    setModal('add')
  }

  const openEdit = (slot) => {
    setForm({ courseId: slot.course?._id || slot.courseId || '', day: slot.day, startTime: slot.startTime, endTime: slot.endTime, room: slot.room || '' })
    setEditSlot(slot)
    setConflict(false)
    setModal('edit')
  }

  const handleFormChange = (field, val) => {
    const updated = { ...form, [field]: val }
    if (field === 'startTime') {
      const endMins = timeToMins(val) + parseInt(settings.lectureDuration || 60)
      updated.endTime = minsToTime(endMins)
    }
    const hasConf = hasConflict(slots, updated.day, updated.startTime, updated.endTime, editSlot?._id)
    setConflict(hasConf)
    setForm(updated)
  }

  const submitForm = async () => {
    if (!form.courseId || !form.day || !form.startTime || !form.endTime) {
      toast('Please fill all required fields', 'error'); return
    }
    if (conflict) { toast('Time conflict detected', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, batchId: selectedBatch }
      if (modal === 'edit' && editSlot) {
        await api.put(`/schedule/${editSlot._id}`, payload)
        toast('Slot updated', 'success')
      } else {
        await api.post('/schedule', payload)
        toast('Slot added', 'success')
      }
      setModal(null)
      loadSlots(selectedBatch)
    } catch (e) {
      toast(e.response?.data?.message || 'Error saving slot', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteSlot = async (id) => {
    try {
      await api.delete(`/schedule/${id}`)
      toast('Slot deleted', 'info')
      setDeleteConfirm(null)
      loadSlots(selectedBatch)
    } catch (e) {
      toast(e.response?.data?.message || 'Error deleting', 'error')
    }
  }

  const batchCourses = (() => {
    if (!selectedBatch) return courses
    const inBatch = courses.filter(c => (c.batch?._id || c.batch) === selectedBatch)
    return inBatch.length ? inBatch : courses // fall back to all if none assigned yet
  })()

  return (
    <div className="page">
      {/* Controls */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '14px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
          <label className="form-label">Batch</label>
          <select className="form-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
            <option value="">— Select a batch —</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        {selectedBatch && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 2 }}>
            <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {settings.classStartTime} – {settings.classEndTime} · {settings.lectureDuration}min slots
          </div>
        )}
      </div>

      {!selectedBatch ? (
        <div className="table-empty" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          Select a batch to view or edit timetable
        </div>
      ) : loading ? (
        <div className="table-loading" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{
                  padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid var(--border)',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em',
                  width: 80, textAlign: 'center',
                }}>Time</th>
                {workingDays.map(day => (
                  <th key={day} style={{
                    padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid var(--border)',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em',
                    textAlign: 'center', minWidth: 140,
                  }}>
                    {DAY_SHORT[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td style={{
                    padding: '8px', textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)',
                    fontWeight: 600, borderBottom: '1px solid var(--border-light)', background: '#FAFBFF',
                    whiteSpace: 'nowrap',
                  }}>
                    {time}
                  </td>
                  {workingDays.map(day => {
                    const slot = getCellSlot(day, time)
                    return (
                      <td key={day} style={{
                        padding: 6, borderBottom: '1px solid var(--border-light)',
                        borderLeft: '1px solid var(--border-light)',
                      }}>
                        {slot ? (
                          <div style={{
                            background: 'linear-gradient(135deg, #ecfdf5, #ecfdf5)',
                            border: '1px solid #a7f3d0',
                            borderRadius: 8, padding: '8px 10px',
                            fontSize: 12, cursor: 'pointer',
                            position: 'relative',
                          }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 2 }}>
                              {slot.course?.name || slot.courseName || '—'}
                            </div>
                            {slot.room && (
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Room: {slot.room}</div>
                            )}
                            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                              <button
                                style={{ background: '#ecfdf5', color: '#065f46', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => openEdit(slot)}
                              ><Edit2 size={9} style={{ verticalAlign: 'middle' }} /> Edit</button>
                              <button
                                style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setDeleteConfirm(slot)}
                              ><Trash2 size={9} style={{ verticalAlign: 'middle' }} /></button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAdd(day, time)}
                            style={{
                              width: '100%', height: 54, border: '1.5px dashed var(--border)',
                              borderRadius: 8, background: 'transparent', color: 'var(--text-muted)',
                              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', gap: 4, transition: 'all .15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = '#ecfdf5' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                          >
                            <Plus size={13} /> Add
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit slot modal */}
      {modal && (
        <Modal title={modal === 'edit' ? 'Edit Time Slot' : 'Add Time Slot'} onClose={() => setModal(null)} width={440}>
          <div className="form-group">
            <label className="form-label">Course *</label>
            <select className="form-select" value={form.courseId} onChange={e => handleFormChange('courseId', e.target.value)}>
              <option value="">— Select course —</option>
              {batchCourses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Day *</label>
              <select className="form-select" value={form.day} onChange={e => handleFormChange('day', e.target.value)}>
                <option value="">— Select day —</option>
                {workingDays.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Room</label>
              <input className="form-input" value={form.room} onChange={e => handleFormChange('room', e.target.value)} placeholder="e.g. Room 101" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input className="form-input" type="time" value={form.startTime} onChange={e => handleFormChange('startTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input className="form-input" type="time" value={form.endTime} onChange={e => handleFormChange('endTime', e.target.value)} />
            </div>
          </div>

          {conflict && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: 12,
              fontSize: 12, color: '#92400E', fontWeight: 500,
            }}>
              <AlertTriangle size={14} />
              Time conflict detected with an existing slot on the same day.
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitForm} disabled={saving || conflict}>
              {saving ? 'Saving...' : modal === 'edit' ? 'Update Slot' : 'Add Slot'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="Delete Slot" onClose={() => setDeleteConfirm(null)} width={380}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            Delete <strong>{deleteConfirm.course?.name}</strong> slot on <strong>{deleteConfirm.day}</strong> at <strong>{deleteConfirm.startTime}</strong>?
          </p>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => deleteSlot(deleteConfirm._id)}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
