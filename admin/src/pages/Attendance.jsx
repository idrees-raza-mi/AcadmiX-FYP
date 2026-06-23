import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import './Attendance.css'

export default function Attendance() {
  const toast = useToast()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState({})   // { studentId: status }
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('mark') // 'mark' | 'stats'

  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data.data))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    setLoading(true)
    // Load enrolled students
    api.get(`/courses/${selectedCourse}`).then(r => {
      const enrolled = r.data.data.students || []
      setStudents(enrolled)
      setRecords(Object.fromEntries(enrolled.map(s => [s._id, 'present'])))
    }).finally(() => setLoading(false))

    // Load stats
    api.get(`/attendance/stats/course/${selectedCourse}`).then(r => setStats(r.data.data))
  }, [selectedCourse])

  const markAll = status => {
    setRecords(Object.fromEntries(students.map(s => [s._id, status])))
  }

  const submit = async () => {
    if (!selectedCourse || !date) return
    setSaving(true)
    try {
      const recs = students.map(s => ({ studentId: s._id, status: records[s._id] || 'absent' }))
      await api.post('/attendance/mark', { courseId: selectedCourse, date, records: recs })
      toast('Attendance saved successfully', 'success')
    } catch (e) {
      toast(e.response?.data?.message || 'Error saving', 'error')
    } finally { setSaving(false) }
  }

  const course = courses.find(c => c._id === selectedCourse)

  return (
    <div className="page">
      {/* Controls */}
      <div className="att-controls">
        <div className="form-group" style={{ margin: 0, flex: 2 }}>
          <label className="form-label">Course</label>
          <select className="form-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">— Select a course —</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {selectedCourse && (
          <div className="att-tabs">
            <button className={`tab-btn ${tab === 'mark' ? 'active' : ''}`} onClick={() => setTab('mark')}>Mark Attendance</button>
            <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Summary</button>
          </div>
        )}
      </div>

      {!selectedCourse && (
        <div className="att-empty">Select a course to mark or view attendance</div>
      )}

      {/* Mark attendance */}
      {selectedCourse && tab === 'mark' && (
        <div className="table-card">
          <div className="att-header">
            <div>
              <h3 className="att-title">{course?.name}</h3>
              <p className="att-sub">{students.length} students enrolled · {date}</p>
            </div>
            <div className="att-quick-btns">
              <button className="action-btn approve" onClick={() => markAll('present')}>All Present</button>
              <button className="action-btn reject" onClick={() => markAll('absent')}>All Absent</button>
            </div>
          </div>

          {loading ? <div className="table-loading"><div className="spinner" /></div> :
            students.length === 0 ? <div className="table-empty">No students enrolled in this course</div> :
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th style={{ width: 280 }}>Status</th>
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
                    <td>
                      <div className="att-status-group">
                        {['present', 'absent', 'late', 'excused'].map(st => (
                          <button
                            key={st}
                            className={`att-status-btn ${records[s._id] === st ? 'active-' + st : ''}`}
                            onClick={() => setRecords(r => ({ ...r, [s._id]: st }))}
                          >
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }

          {students.length > 0 && (
            <div className="att-footer">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Present: {Object.values(records).filter(v => v === 'present').length} /
                Absent: {Object.values(records).filter(v => v === 'absent').length} /
                Late: {Object.values(records).filter(v => v === 'late').length}
              </span>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {selectedCourse && tab === 'stats' && (
        <div className="table-card">
          <div className="att-header">
            <h3 className="att-title">Attendance Summary — {course?.name}</h3>
          </div>
          {!stats ? <div className="table-loading"><div className="spinner" /></div> :
            stats.length === 0 ? <div className="table-empty">No attendance records yet</div> :
            <table className="table">
              <thead>
                <tr><th>Student</th><th>Total</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th></tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s._id?._id}>
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">{(s._id?.profile?.name || s._id?.email || '?')[0].toUpperCase()}</div>
                        <div>
                          <div className="student-name">{s._id?.profile?.name || '—'}</div>
                          <div className="student-email">{s._id?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.total}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{s.present}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 600 }}>{s.absent}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{s.late}</td>
                    <td>
                      <div className="att-pct-wrap">
                        <div className="att-pct-bar">
                          <div className="att-pct-fill" style={{
                            width: `${Math.round(s.percentage)}%`,
                            background: s.percentage >= 75 ? 'var(--success)' : s.percentage >= 50 ? 'var(--warning)' : 'var(--error)'
                          }} />
                        </div>
                        <span>{Math.round(s.percentage)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      )}
    </div>
  )
}
