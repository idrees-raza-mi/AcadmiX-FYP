import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2 } from 'lucide-react'
import './Header.css'

const titles = {
  '/':             'Dashboard',
  '/departments':  'Departments & Batches',
  '/students':     'Students',
  '/courses':      'Courses',
  '/attendance':   'Attendance',
  '/serials':      'Serial Codes',
  '/admins':       'Admin Management',
  '/leave':        'Leave Requests',
  '/marks':        'Marks & Grades',
  '/timetable':    'Timetable',
  '/live-attendance': 'Live Attendance',
  '/sessions':     'Sessions',
  '/settings':     'Settings',
}

export default function Header() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const title = titles[pathname] || 'AcademicX'

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
        {user?.department && (
          <div className="header-dept">
            <Building2 size={11} />
            <span>{user.department}</span>
          </div>
        )}
      </div>
      <div className="header-right">
        <div className="header-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <div className="header-user">
          <div className="header-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="header-name">{user?.name}</div>
            <div className="header-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
