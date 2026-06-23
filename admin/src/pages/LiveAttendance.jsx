import { useEffect, useState, useRef, useCallback } from 'react'
import { Wifi, WifiOff, Clock, Users, CheckCircle, XCircle, AlertCircle, Radio } from 'lucide-react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'

// Resolve socket server URL from env or fallback to same base as API
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'

function useCountdown(targetTime) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!targetTime) { setRemaining(''); return }
    const tick = () => {
      const diff = new Date(targetTime) - Date.now()
      if (diff <= 0) { setRemaining('00:00'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetTime])
  return remaining
}

function SessionCard({ session, isActive }) {
  const countdown = useCountdown(isActive ? session.endTime : null)

  const statusColor = {
    upcoming: { bg: '#F1F5F9', border: '#CBD5E1', dot: '#94A3B8', label: '#64748B' },
    active:   { bg: '#ECFDF5', border: '#6EE7B7', dot: '#10B981', label: '#065F46' },
    completed:{ bg: '#F0FDF4', border: '#BBF7D0', dot: '#16A34A', label: '#15803D' },
    cancelled:{ bg: '#FFF1F2', border: '#FECDD3', dot: '#F43F5E', label: '#BE123C' },
  }[session.status] || { bg: '#F1F5F9', border: '#CBD5E1', dot: '#94A3B8', label: '#64748B' }

  const total = session.totalStudents || 0
  const present = session.presentCount || 0
  const pct = total > 0 ? Math.round((present / total) * 100) : 0

  return (
    <div style={{
      background: statusColor.bg,
      border: `1px solid ${statusColor.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      transition: 'box-shadow .2s',
      boxShadow: isActive ? '0 0 0 2px #10B981' : 'none',
    }}>
      {/* Status dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%', background: statusColor.dot, flexShrink: 0,
        boxShadow: session.status === 'active' ? `0 0 0 4px ${statusColor.border}` : 'none',
        animation: session.status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: statusColor.label }}>
          {session.course?.name || session.courseName || '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          {session.startTime} — {session.endTime}
          {session.room && ` · Room ${session.room}`}
        </div>
        {session.status === 'active' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>{present} / {total} present</span>
              <span>{pct}%</span>
            </div>
            <div style={{ background: '#D1FAE5', borderRadius: 999, height: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#10B981', borderRadius: 999, transition: 'width .5s' }} />
            </div>
          </div>
        )}
        {session.status === 'completed' && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Final: {present} / {total} · {pct}%
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {session.status === 'active' && countdown && (
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
            {countdown}
          </div>
        )}
        {session.status === 'upcoming' && <Clock size={18} style={{ color: '#94A3B8' }} />}
        {session.status === 'completed' && <CheckCircle size={18} style={{ color: '#16A34A' }} />}
        {session.status === 'cancelled' && <XCircle size={18} style={{ color: '#F43F5E' }} />}
      </div>
    </div>
  )
}

export default function LiveAttendance() {
  const toast = useToast()
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [liveFeed, setLiveFeed] = useState([])
  const [notArrived, setNotArrived] = useState([])
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const feedEndRef = useRef(null)

  useEffect(() => {
    api.get('/departments/batches').then(r => setBatches(r.data.data || [])).catch(() => {})
  }, [])

  // Auto-scroll live feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveFeed])

  const loadSessions = useCallback(async (batchId, dateStr) => {
    if (!batchId) return
    setLoading(true)
    try {
      const r = await api.get('/sessions', { params: { batchId, date: dateStr } })
      const data = r.data.data || []
      setSessions(data)
      const active = data.find(s => s.status === 'active')
      if (active) {
        setActiveSession(active)
        setLiveFeed(active.presentStudents || [])
        setNotArrived(active.absentStudents || [])
      } else {
        setActiveSession(null)
        setLiveFeed([])
        setNotArrived([])
      }
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to load sessions', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (selectedBatch) loadSessions(selectedBatch, date)
  }, [selectedBatch, date, loadSessions])

  // Socket.io connection
  useEffect(() => {
    if (!selectedBatch) return

    let io
    const connectSocket = async () => {
      try {
        const { io: socketIO } = await import('socket.io-client')
        io = socketIO(SOCKET_URL, { transports: ['websocket', 'polling'] })

        io.on('connect', () => {
          setConnected(true)
          io.emit('join_batch', { batchId: selectedBatch })
        })

        io.on('disconnect', () => setConnected(false))

        io.on('attendance_marked', (data) => {
          setLiveFeed(prev => [
            ...prev,
            {
              _id: Date.now(),
              name: data.studentName || 'Student',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: data.method || 'biometric',
            }
          ])
          setSessions(prev => prev.map(s =>
            s._id === data.sessionId
              ? { ...s, presentCount: (s.presentCount || 0) + 1 }
              : s
          ))
          setActiveSession(prev => prev?._id === data.sessionId
            ? { ...prev, presentCount: (prev.presentCount || 0) + 1 }
            : prev
          )
          setNotArrived(prev => prev.filter(s => s._id !== data.studentId))
        })

        io.on('session_completed', (data) => {
          setSessions(prev => prev.map(s =>
            s._id === data.sessionId ? { ...s, status: 'completed' } : s
          ))
          if (activeSession?._id === data.sessionId) {
            setActiveSession(prev => ({ ...prev, status: 'completed' }))
          }
          toast('Session completed', 'info')
        })

        socketRef.current = io
      } catch {
        // socket.io-client might not be installed — silently skip
      }
    }

    connectSocket()
    return () => {
      socketRef.current?.disconnect()
      setConnected(false)
    }
  }, [selectedBatch]) // eslint-disable-line

  const presentCount = activeSession?.presentCount || 0
  const totalCount = activeSession?.totalStudents || 0
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  return (
    <div className="page">
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .4 } }
        @keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.4); opacity: .6 } }
      `}</style>

      {/* Controls */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '14px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
      }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
          <label className="form-label">Batch</label>
          <select className="form-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
            <option value="">— Select batch —</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 160px' }}>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {selectedBatch && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, paddingBottom: 2,
            color: connected ? '#065F46' : 'var(--text-muted)',
            fontWeight: 600,
          }}>
            {connected
              ? <><Wifi size={13} /> Live</>
              : <><WifiOff size={13} /> Offline</>
            }
          </div>
        )}
      </div>

      {!selectedBatch ? (
        <div className="table-empty" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          Select a batch to monitor attendance
        </div>
      ) : loading ? (
        <div className="table-loading" style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: activeSession ? '1fr 380px' : '1fr', gap: 14, alignItems: 'start' }}>
          {/* Session timeline */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: 16, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={15} style={{ color: 'var(--primary)' }} />
              Session Timeline
              {sessions.some(s => s.status === 'active') && (
                <span style={{
                  background: '#D1FAE5', color: '#065F46', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  animation: 'pulse 2s ease-in-out infinite',
                }}>LIVE</span>
              )}
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No sessions scheduled for this date
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => (
                  <SessionCard
                    key={s._id}
                    session={s}
                    isActive={s.status === 'active'}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Active session panel */}
          {activeSession && (
            <div style={{
              background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                  {activeSession.course?.name || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {activeSession.startTime} – {activeSession.endTime}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#ECFDF5', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{presentCount}</div>
                  <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600 }}>Present</div>
                </div>
                <div style={{ background: '#F1F5F9', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-secondary)' }}>{totalCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Total</div>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5 }}>
                  <span>Attendance progress</span>
                  <span style={{ fontWeight: 700, color: pct >= 75 ? '#10B981' : 'var(--warning)' }}>{pct}%</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 999, transition: 'width .5s',
                    background: pct >= 75 ? '#10B981' : pct >= 50 ? 'var(--warning)' : 'var(--error)',
                  }} />
                </div>
              </div>

              {/* Live feed */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', animation: 'pulseDot 1.5s ease-in-out infinite' }} />
                  Live Check-ins
                </div>
                <div style={{ height: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {liveFeed.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingTop: 24 }}>
                      Waiting for check-ins...
                    </div>
                  ) : (
                    liveFeed.map((entry, i) => (
                      <div key={entry._id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', background: '#ECFDF5', borderRadius: 8, fontSize: 12,
                      }}>
                        <CheckCircle size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, flex: 1 }}>{entry.name || entry.student?.profile?.name || 'Student'}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{entry.time || entry.markedAt}</span>
                        {entry.method && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                            background: entry.method === 'face' ? '#EDE9FE' : '#ecfdf5',
                            color: entry.method === 'face' ? '#065f46' : '#047857',
                          }}>
                            {entry.method.toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={feedEndRef} />
                </div>
              </div>

              {/* Not yet arrived */}
              {notArrived.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={12} style={{ color: 'var(--warning)' }} />
                    Not Yet Arrived ({notArrived.length})
                  </div>
                  <div style={{ height: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {notArrived.map((s, i) => (
                      <div key={s._id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 10px', background: '#FFF7ED', borderRadius: 8, fontSize: 12,
                      }}>
                        <div className="student-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>
                          {(s.profile?.name || s.name || '?')[0].toUpperCase()}
                        </div>
                        <span>{s.profile?.name || s.name || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
