import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Clock, UserCheck, BookOpen, ClipboardList, Building2,
} from 'lucide-react'
import api from '../api/axios'
import './Dashboard.css'

const StatCard = ({ label, value, Icon, tint, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: tint.bg, color: tint.fg }}>
      <Icon size={20} strokeWidth={1.8} />
    </div>
    <div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
)

// Soft, flat tints — professional, no gradients.
const TINT = {
  blue:   { bg: '#ecfdf5', fg: '#047857' },
  amber:  { bg: '#FFF7ED', fg: '#D97706' },
  green:  { bg: '#ECFDF5', fg: '#059669' },
  violet: { bg: '#ecfdf5', fg: '#047857' },
  indigo: { bg: '#ecfdf5', fg: '#047857' },
  teal:   { bg: '#ECFDF5', fg: '#059669' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/departments'),
    ]).then(([dash, dept]) => {
      setData(dash.data.data)
      setDepts(dept.data.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>

  const s = data?.stats || {}

  return (
    <div className="dashboard">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Students"     value={s.totalStudents}    Icon={Users}         tint={TINT.blue} />
        <StatCard label="Pending Approval"   value={s.pendingStudents}  Icon={Clock}         tint={TINT.amber} sub="Awaiting review" />
        <StatCard label="Approved Students"  value={s.approvedStudents} Icon={UserCheck}     tint={TINT.green} />
        <StatCard label="Active Courses"     value={s.totalCourses}     Icon={BookOpen}      tint={TINT.violet} />
        <StatCard label="Attendance Records" value={s.totalAttendance}  Icon={ClipboardList} tint={TINT.indigo} />
        <StatCard label="Departments"        value={depts.length}       Icon={Building2}     tint={TINT.teal} />
      </div>

      {/* Departments overview */}
      {depts.length > 0 && (
        <div className="dash-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="dash-section-title" style={{ margin: 0 }}>Departments Overview</h3>
            <button className="btn btn-primary" style={{ padding: '7px 16px', fontSize: 12 }} onClick={() => navigate('/departments')}>Manage All →</button>
          </div>
          <div className="dept-overview-grid">
            {depts.map(d => (
              <div key={d._id} className="dept-overview-card" onClick={() => navigate('/departments')}>
                <div className="dept-overview-top">
                  <div className="dept-overview-icon">{d.code.substring(0, 2)}</div>
                  <div>
                    <div className="dept-overview-name">{d.name}</div>
                    <div className="dept-overview-hod">{d.hod?.name ? `HOD: ${d.hod.name}` : d.code}</div>
                  </div>
                </div>
                <div className="dept-overview-counts">
                  <div><span>{d.batchCount || 0}</span><label>Batches</label></div>
                  <div><span>{d.studentCount || 0}</span><label>Students</label></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending students */}
      <div className="dash-section">
        <h3 className="dash-section-title">Pending Student Registrations</h3>
        {data?.recentPendingStudents?.length === 0 && <div className="dash-empty">No pending registrations</div>}
        {data?.recentPendingStudents?.length > 0 && (
          <div className="pending-list">
            {data.recentPendingStudents.map(s => (
              <div key={s._id} className="pending-item">
                <div className="pending-avatar">{s.email[0].toUpperCase()}</div>
                <div>
                  <div className="pending-email">{s.email}</div>
                  <div className="pending-date">{s.profile?.name || 'Profile not filled'} · Registered {new Date(s.createdAt).toLocaleDateString()}</div>
                </div>
                <span className="badge badge-pending">Pending</span>
              </div>
            ))}
          </div>
        )}
        {data?.recentPendingStudents?.length > 0 && (
          <a href="/students?status=pending" className="dash-view-all">View all pending →</a>
        )}
      </div>
    </div>
  )
}
