import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, LogOut, Settings, RefreshCw, CheckCircle2,
  Clock, ChevronDown, Play, StopCircle, Wifi, WifiOff, AlertCircle
} from 'lucide-react';
import client from '../api/client.js';
import { socket, safeEmit } from '../socket/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import SessionTimer from '../components/SessionTimer.jsx';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getSlotStatus(slot, now) {
  if (slot.session) {
    if (slot.session.status === 'completed') return 'completed';
    if (slot.session.status === 'active') return 'active';
  }
  const start = new Date(slot.scheduledStart);
  const end   = new Date(slot.scheduledEnd);
  if (now < start) return 'upcoming';
  if (now > end)   return 'missed';
  return 'due'; // within window but no session started
}

function minutesUntil(dateStr, now) {
  return Math.round((new Date(dateStr) - now) / 60000);
}

export default function TodaySchedule() {
  const { admin, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [batches, setBatches]       = useState([]);
  const [selectedBatch, setSelected] = useState(() => localStorage.getItem('bx_batch') || '');
  const [slots, setSlots]           = useState([]);
  const [now, setNow]               = useState(new Date());
  const [loading, setLoading]       = useState(false);
  const [loadingSlot, setLoadingSlot] = useState(null);
  const [socketConnected, setSocketConn] = useState(socket.connected);
  const [error, setError]           = useState('');
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const autoStartedRef = useRef(new Set()); // track which scheduleIds were auto-started

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Load batches ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadBatches() {
      try {
        const { data } = await client.get('/api/departments/batches');
        const list = Array.isArray(data) ? data : (data.data || data.batches || []);
        setBatches(list);
        if (!selectedBatch && list.length > 0) {
          setSelected(list[0]._id);
          localStorage.setItem('bx_batch', list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load batches:', err.message);
      }
    }
    loadBatches();
  }, []);

  // ── Load schedule ─────────────────────────────────────────────────────────
  const loadSchedule = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get(`/api/schedule/today/${batchId}`);
      const rawSlots = Array.isArray(data) ? data : (data.data || data.slots || data.schedule || []);
      setSlots(rawSlots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBatch) loadSchedule(selectedBatch);
  }, [selectedBatch, loadSchedule]);

  // ── Periodic refresh every 30 s ───────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (selectedBatch) loadSchedule(selectedBatch);
    }, 30000);
    return () => clearInterval(id);
  }, [selectedBatch, loadSchedule]);

  // ── Auto-start sessions ───────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.sessionAutoStart) return;
    slots.forEach((slot) => {
      const status = getSlotStatus(slot, now);
      if ((status === 'due') && !autoStartedRef.current.has(slot._id)) {
        autoStartedRef.current.add(slot._id);
        startSession(slot._id, true);
      }
    });
  }, [now, slots, settings.sessionAutoStart]);

  // ── Socket: join batch + listen ───────────────────────────────────────────
  useEffect(() => {
    function onConnect() {
      setSocketConn(true);
      if (selectedBatch) safeEmit('join_batch', { batchId: selectedBatch });
    }
    function onDisconnect() { setSocketConn(false); }
    function onSessionCompleted() { loadSchedule(selectedBatch); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('session_completed', onSessionCompleted);

    if (socket.connected && selectedBatch) {
      safeEmit('join_batch', { batchId: selectedBatch });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('session_completed', onSessionCompleted);
    };
  }, [selectedBatch, loadSchedule]);

  // Re-join when batch changes
  useEffect(() => {
    if (socket.connected && selectedBatch) {
      safeEmit('join_batch', { batchId: selectedBatch });
    }
  }, [selectedBatch]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function startSession(scheduleId, auto = false) {
    setLoadingSlot(scheduleId);
    try {
      const { data } = await client.post(`/api/sessions/start/${scheduleId}`);
      const sessionId = data.data?._id || data._id || data.sessionId || data.session?._id;
      if (sessionId) {
        navigate(`/session/${sessionId}`);
      } else {
        await loadSchedule(selectedBatch);
      }
    } catch (err) {
      if (!auto) setError(err.message);
      else console.warn('[AutoStart]', err.message);
      autoStartedRef.current.delete(scheduleId);
    } finally {
      setLoadingSlot(null);
    }
  }

  async function completeSession(sessionId) {
    safeEmit('complete_session', { sessionId });
    try {
      await client.put(`/api/sessions/${sessionId}/complete`);
    } catch (err) {
      console.error('complete session failed:', err.message);
    }
    loadSchedule(selectedBatch);
  }

  function openSession(slot) {
    const sessionId = slot.session?._id;
    if (sessionId) navigate(`/session/${sessionId}`);
  }

  function handleBatchSelect(id) {
    setSelected(id);
    localStorage.setItem('bx_batch', id);
    setShowBatchMenu(false);
    autoStartedRef.current.clear();
  }

  const batchName = batches.find(b => b._id === selectedBatch)?.name || 'Select Batch';

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderSlot(slot) {
    const status = getSlotStatus(slot, now);
    const minsUntil = minutesUntil(slot.scheduledStart, now);
    const isLoadingThis = loadingSlot === slot._id;

    const cardClass = {
      completed: 'status-completed',
      active:    'status-active active-session-card',
      upcoming:  'status-upcoming',
      due:       'border-yellow-500/60 bg-yellow-900/10',
      missed:    'status-missed',
    }[status] || 'status-upcoming';

    const badge = {
      completed: <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                   <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                 </span>,
      active:    <span className="flex items-center gap-1 text-green-300 text-xs font-bold animate-pulse">
                   <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                   ACTIVE NOW
                 </span>,
      upcoming:  <span className="text-emerald-400 text-xs font-semibold">UPCOMING</span>,
      due:       <span className="text-yellow-400 text-xs font-semibold animate-pulse">STARTING…</span>,
      missed:    <span className="text-red-400 text-xs font-semibold">MISSED</span>,
    }[status];

    return (
      <div key={slot._id}
           className={`card border-2 ${cardClass} p-4 transition-all duration-300`}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: time + course info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-gray-400 text-sm font-mono">
                {formatTime(slot.scheduledStart)} – {formatTime(slot.scheduledEnd)}
              </span>
              {badge}
            </div>
            <div className="text-white font-semibold text-lg leading-tight">
              {slot.course?.name || slot.courseName || slot.subject || 'Course'}
            </div>
            <div className="text-gray-400 text-sm mt-0.5">
              {slot.course?.code || slot.courseCode || ''}
              {slot.instructor && ` · ${slot.instructor}`}
            </div>

            {/* Sub-info by status */}
            {status === 'completed' && slot.session && (
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="text-green-400 font-medium">
                  {slot.session.presentCount ?? '?'} present
                </span>
                <span className="text-red-400">
                  {slot.session.absentCount ?? '?'} absent
                </span>
              </div>
            )}
            {status === 'active' && slot.session && (
              <div className="mt-2">
                <SessionTimer
                  endTime={new Date(slot.scheduledEnd)}
                  compact
                  onExpire={() => {
                    if (settings.sessionAutoComplete) {
                      completeSession(slot.session._id);
                    }
                  }}
                />
              </div>
            )}
            {status === 'upcoming' && (
              <p className="text-emerald-300 text-sm mt-1">
                Starts in {minsUntil > 60
                  ? `${Math.floor(minsUntil/60)}h ${minsUntil%60}m`
                  : `${minsUntil} min`}
              </p>
            )}
            {status === 'due' && (
              <p className="text-yellow-300 text-sm mt-1 animate-pulse">
                Session window open — auto-starting…
              </p>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {status === 'active' && (
              <>
                <button
                  onClick={() => openSession(slot)}
                  className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Open Scanner
                </button>
                <button
                  onClick={() => completeSession(slot.session._id)}
                  className="btn-danger text-sm px-3 py-1.5 flex items-center gap-1.5"
                >
                  <StopCircle className="w-3.5 h-3.5" /> Complete Now
                </button>
              </>
            )}
            {(status === 'upcoming' || status === 'due') && (
              <button
                onClick={() => startSession(slot._id)}
                disabled={isLoadingThis}
                className="btn-success text-sm px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-60"
              >
                {isLoadingThis ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Start Now
              </button>
            )}
            {status === 'completed' && slot.session && (
              <button
                onClick={() => openSession(slot)}
                className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5"
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* ── Top bar ── */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">AX</span>
            </div>
            <div>
              <span className="text-white font-semibold text-lg">AcademicX Biometric</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-gray-400 text-xs">{formatDate(now)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Socket status */}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full
                            ${socketConnected
                              ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                              : 'bg-red-900/40 text-red-400 border border-red-700/40'}`}>
              {socketConnected
                ? <><Wifi className="w-3 h-3" /> Live</>
                : <><WifiOff className="w-3 h-3" /> Offline</>}
            </div>

            {/* Batch picker */}
            <div className="relative">
              <button
                onClick={() => setShowBatchMenu(v => !v)}
                className="btn-secondary flex items-center gap-2 text-sm py-1.5"
              >
                {batchName}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showBatchMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-dark-700 border border-dark-500
                                rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  {batches.length === 0 ? (
                    <p className="px-4 py-3 text-gray-400 text-sm">No batches found</p>
                  ) : batches.map(b => (
                    <button
                      key={b._id}
                      onClick={() => handleBatchSelect(b._id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                                  ${b._id === selectedBatch
                                    ? 'bg-emerald-700/30 text-emerald-300'
                                    : 'text-gray-300 hover:bg-dark-600'}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/setup')}
              className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
            >
              <Settings className="w-4 h-4" /> Setup
            </button>

            <button
              onClick={logout}
              className="btn-danger flex items-center gap-1.5 text-sm py-1.5"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Today's Schedule</h2>
            <p className="text-gray-400 text-sm mt-1">
              {slots.length === 0
                ? selectedBatch ? 'Loading…' : 'Select a batch to view schedule'
                : `${slots.length} lecture${slots.length !== 1 ? 's' : ''} scheduled`}
            </p>
          </div>
          <button
            onClick={() => loadSchedule(selectedBatch)}
            disabled={loading || !selectedBatch}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40
                          text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button className="ml-auto text-red-400 hover:text-red-200 text-xs underline"
                    onClick={() => setError('')}>dismiss</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && slots.length === 0 && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card border border-dark-600 p-5 animate-pulse">
                <div className="h-3 bg-dark-600 rounded w-32 mb-3" />
                <div className="h-5 bg-dark-600 rounded w-56 mb-2" />
                <div className="h-3 bg-dark-700 rounded w-40" />
              </div>
            ))}
          </div>
        )}

        {/* Slot list */}
        {!loading && slots.length > 0 && (
          <div className="space-y-3">
            {slots
              .slice()
              .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
              .map(renderSlot)}
          </div>
        )}

        {/* Empty state */}
        {!loading && slots.length === 0 && selectedBatch && !error && (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-gray-400 font-medium text-lg">No classes today</h3>
            <p className="text-gray-600 text-sm mt-1">
              Enjoy your day off, or check a different batch.
            </p>
          </div>
        )}

        {/* After-schedule note */}
        {slots.length > 0 && (() => {
          const last = slots.slice().sort((a,b) =>
            new Date(b.scheduledEnd) - new Date(a.scheduledEnd))[0];
          const lastEnd = new Date(last.scheduledEnd);
          if (now > lastEnd) {
            return (
              <p className="text-center text-gray-500 text-sm mt-6">
                <Clock className="inline w-4 h-4 mr-1 mb-0.5" />
                No more classes today after {formatTime(last.scheduledEnd)}
              </p>
            );
          }
          return null;
        })()}
      </main>

      {/* Clock footer */}
      <footer className="bg-dark-800 border-t border-dark-600 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <span>Signed in as <span className="text-gray-300">{admin?.name || admin?.email}</span></span>
          <span className="font-mono text-gray-400 text-sm tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </footer>
    </div>
  );
}
