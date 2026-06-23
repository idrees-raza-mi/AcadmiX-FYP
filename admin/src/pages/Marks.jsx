import { useEffect, useState, useCallback } from 'react'
import { Save, CheckCircle, BookOpen } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

function calcTotal(row) {
  const mid = parseFloat(row.midterm) || 0
  const asg = parseFloat(row.assignments) || 0
  const qui = parseFloat(row.quizzes) || 0
  const fin = parseFloat(row.final) || 0
  return Math.min(mid, 30) + Math.min(asg, 20) + Math.min(qui, 10) + Math.min(fin, 40)
}

function calcGrade(total, scale) {
  if (total >= (scale?.Aplus ?? 90)) return 'A+'
  if (total >= (scale?.A ?? 80)) return 'A'
  if (total >= (scale?.Bplus ?? 70)) return 'B+'
  if (total >= (scale?.B ?? 60)) return 'B'
  if (total >= (scale?.C ?? 50)) return 'C'
  if (total >= (scale?.D ?? 40)) return 'D'
  return 'F'
}

function gradeColor(grade) {
  if (grade === 'A+' || grade === 'A') return { color: '#065F46', background: '#D1FAE5', border: '1px solid #A7F3D0' }
  if (grade === 'B+' || grade === 'B') return { color: '#047857', background: '#d1fae5', border: '1px solid #a7f3d0' }
  if (grade === 'C') return { color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A' }
  if (grade === 'D') return { color: '#9A3412', background: '#FFEDD5', border: '1px solid #FED7AA' }
  return { color: '#991B1B', background: '#FEE2E2', border: '1px solid #FECACA' }
}

const EMPTY_MARKS = { midterm: '', assignments: '', quizzes: '', final: '' }

export default function Marks() {
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [rows, setRows] = useState([])   // [{ studentId, name, email, existingId, ...marks, saved, saving, dirty }]
  const [loading, setLoading] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [scale, setScale] = useState(null)

  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data.data || []))
    api.get('/settings').then(r => {
      const s = r.data.data
      if (s?.gradingScale) setScale(s.gradingScale)
    }).catch(() => {})
  }, [])

  const loadMarks = useCallback(async (courseId) => {
    if (!courseId) return
    setLoading(true)
    try {
      const [courseRes, marksRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/marks/course/${courseId}`),
      ])
      const students = courseRes.data.data?.students || []
      const existingMarks = marksRes.data.data || []
      const marksMap = {}
      existingMarks.forEach(m => {
        marksMap[m.student?._id || m.studentId] = m
      })

      setRows(students.map(s => {
        const m = marksMap[s._id] || {}
        return {
          studentId: s._id,
          name: s.profile?.name || '—',
          email: s.email,
          existingId: m._id || null,
          midterm: m.midterm != null ? String(m.midterm) : '',
          assignments: m.assignments != null ? String(m.assignments) : '',
          quizzes: m.quizzes != null ? String(m.quizzes) : '',
          final: m.final != null ? String(m.final) : '',
          saved: !!m._id,
          saving: false,
          dirty: false,
        }
      }))
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to load marks', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (selectedCourse) loadMarks(selectedCourse)
    else setRows([])
  }, [selectedCourse, loadMarks])

  const updateRow = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => i === idx
      ? { ...r, [field]: val, saved: false, dirty: true }
      : r
    ))
  }

  const saveRow = async (idx) => {
    const row = rows[idx]
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: true } : r))
    try {
      const payload = {
        studentId: row.studentId,
        courseId: selectedCourse,
        midterm: parseFloat(row.midterm) || 0,
        assignments: parseFloat(row.assignments) || 0,
        quizzes: parseFloat(row.quizzes) || 0,
        final: parseFloat(row.final) || 0,
      }
      let newId = row.existingId
      if (row.existingId) {
        await api.put(`/marks/${row.existingId}`, payload)
      } else {
        const res = await api.post('/marks', payload)
        newId = res.data.data?._id || res.data._id || null
      }
      setRows(prev => prev.map((r, i) => i === idx
        ? { ...r, saving: false, saved: true, dirty: false, existingId: newId }
        : r
      ))
    } catch (e) {
      toast(e.response?.data?.message || 'Error saving marks', 'error')
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, saving: false } : r))
    }
  }

  const bulkSave = async () => {
    const dirtyIdxs = rows.map((r, i) => r.dirty ? i : -1).filter(i => i >= 0)
    if (dirtyIdxs.length === 0) { toast('No unsaved changes', 'info'); return }
    setBulkSaving(true)
    for (const idx of dirtyIdxs) {
      await saveRow(idx)
    }
    setBulkSaving(false)
    toast(`Saved ${dirtyIdxs.length} row(s)`, 'success')
  }

  const course = courses.find(c => c._id === selectedCourse)
  const dirtyCount = rows.filter(r => r.dirty).length

  return (
    <div className="page">
      {/* Course selector */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 260px' }}>
          <label className="form-label">
            <BookOpen size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
            Select Course
          </label>
          <select
            className="form-select"
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
          >
            <option value="">— Choose a course to view/edit marks —</option>
            {courses.map(c => (
              <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        {selectedCourse && dirtyCount > 0 && (
          <button
            className="btn btn-primary"
            onClick={bulkSave}
            disabled={bulkSaving}
          >
            <Save size={14} />
            {bulkSaving ? 'Saving...' : `Save All Changes (${dirtyCount})`}
          </button>
        )}
      </div>

      {!selectedCourse && (
        <div className="table-empty" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          Select a course to manage marks
        </div>
      )}

      {selectedCourse && (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{course?.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{rows.length} students</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>Midterm /30</span>
              <span>Assignments /20</span>
              <span>Quizzes /10</span>
              <span>Final /40</span>
              <span>Total /100</span>
            </div>
          </div>

          {loading ? (
            <div className="table-loading"><div className="spinner" /></div>
          ) : rows.length === 0 ? (
            <div className="table-empty">No students enrolled</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ width: 90 }}>Midterm<br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>/30</span></th>
                  <th style={{ width: 100 }}>Assignments<br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>/20</span></th>
                  <th style={{ width: 90 }}>Quizzes<br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>/10</span></th>
                  <th style={{ width: 90 }}>Final<br /><span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>/40</span></th>
                  <th style={{ width: 80 }}>Total</th>
                  <th style={{ width: 70 }}>Grade</th>
                  <th style={{ width: 90 }}>Save</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const total = calcTotal(row)
                  const grade = calcGrade(total, scale)
                  const gStyle = gradeColor(grade)
                  return (
                    <tr key={row.studentId}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar">{(row.name || row.email || '?')[0].toUpperCase()}</div>
                          <div>
                            <div className="student-name">{row.name}</div>
                            <div className="student-email">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      {['midterm', 'assignments', 'quizzes', 'final'].map(field => (
                        <td key={field}>
                          <input
                            type="number"
                            min={0}
                            max={field === 'midterm' ? 30 : field === 'assignments' ? 20 : field === 'quizzes' ? 10 : 40}
                            step={0.5}
                            value={row[field]}
                            onChange={e => updateRow(idx, field, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 13,
                              outline: 'none',
                              background: row.dirty ? '#FFFBEB' : 'white',
                              transition: 'border-color .15s, background .15s',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                          />
                        </td>
                      ))}
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{total.toFixed(1)}</span>
                      </td>
                      <td>
                        <span style={{
                          ...gStyle,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'inline-block',
                        }}>
                          {grade}
                        </span>
                      </td>
                      <td>
                        {row.saved && !row.dirty ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
                            <CheckCircle size={13} /> Saved
                          </span>
                        ) : (
                          <button
                            className="action-btn approve"
                            onClick={() => saveRow(idx)}
                            disabled={row.saving || !row.dirty}
                            style={{ opacity: !row.dirty ? 0.45 : 1 }}
                          >
                            {row.saving ? '...' : 'Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
