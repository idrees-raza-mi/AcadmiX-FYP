import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Departments from './pages/Departments'
import Students from './pages/Students'
import Courses from './pages/Courses'
import Attendance from './pages/Attendance'
import Serials from './pages/Serials'
import Admins from './pages/Admins'
import SetupWizard from './pages/SetupWizard'
import Register from './pages/Register'
import Leave from './pages/Leave'
import Marks from './pages/Marks'
import Timetable from './pages/Timetable'
import LiveAttendance from './pages/LiveAttendance'
import Sessions from './pages/Sessions'
import Settings from './pages/Settings'

function PrivateRoute({ children, superOnly = false }) {
  const { user, needsSetup } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (superOnly && user.role !== 'superadmin') return <Navigate to="/" replace />
  if (needsSetup) return <Navigate to="/setup" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

function SetupRoute({ children }) {
  const { user, needsSetup } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!needsSetup) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/setup" element={<SetupRoute><SetupWizard /></SetupRoute>} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="departments" element={<Departments />} />
              <Route path="students" element={<Students />} />
              <Route path="courses" element={<Courses />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="serials" element={<Serials />} />
              <Route path="admins" element={<PrivateRoute superOnly><Admins /></PrivateRoute>} />
              <Route path="leave" element={<Leave />} />
              <Route path="marks" element={<Marks />} />
              <Route path="timetable" element={<Timetable />} />
              <Route path="live-attendance" element={<LiveAttendance />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
