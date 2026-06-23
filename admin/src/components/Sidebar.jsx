import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Building2, Users, BookOpen,
  CheckSquare, Key, ShieldCheck, LogOut,
  CalendarClock, Star, LayoutGrid, Radio, BarChart2, Settings,
} from 'lucide-react'
import './Sidebar.css'

const mainNavItems = [
  { path: '/',               label: 'Dashboard',       Icon: LayoutDashboard },
  { path: '/departments',    label: 'Departments',      Icon: Building2 },
  { path: '/students',       label: 'Students',         Icon: Users },
  { path: '/courses',        label: 'Courses',          Icon: BookOpen },
  { path: '/attendance',     label: 'Attendance',       Icon: CheckSquare },
  { path: '/serials',        label: 'Serial Codes',     Icon: Key },
  { path: '/admins',         label: 'Admins',           Icon: ShieldCheck, superOnly: true },
]

const academicNavItems = [
  { path: '/leave',           label: 'Leave Requests',  Icon: CalendarClock },
  { path: '/marks',           label: 'Marks & Grades',  Icon: Star },
  { path: '/timetable',       label: 'Timetable',       Icon: LayoutGrid },
  { path: '/live-attendance', label: 'Live Attendance', Icon: Radio, live: true },
  { path: '/sessions',        label: 'Sessions',        Icon: BarChart2 },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">AX</div>
        <div>
          <div className="sidebar-logo-title">AcademicX</div>
          <div className="sidebar-logo-sub">Admin Panel</div>
        </div>
      </div>

      {/* Dept badge */}
      {user?.department && (
        <div className="sidebar-dept">
          <Building2 size={12} />
          <span>{user.department}</span>
        </div>
      )}

      {/* Main Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">MAIN MENU</div>
        {mainNavItems.map(({ path, label, Icon, superOnly }) => {
          if (superOnly && user?.role !== 'superadmin') return null
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={15} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Academic Nav */}
      <nav className="sidebar-nav" style={{ marginTop: 4 }}>
        <div className="sidebar-nav-label">ACADEMIC</div>
        {academicNavItems.map(({ path, label, Icon, live }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
            {live && (
              <span style={{
                marginLeft: 'auto',
                width: 7, height: 7, borderRadius: '50%',
                background: '#10B981',
                flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
                animation: 'sidebarPulse 2s ease-in-out infinite',
              }} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings link */}
      <nav className="sidebar-nav" style={{ marginTop: 'auto', paddingTop: 8 }}>
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <Settings size={15} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Logout">
          <LogOut size={14} />
        </button>
      </div>

      <style>{`
        @keyframes sidebarPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(1.3); }
        }
      `}</style>
    </aside>
  )
}
