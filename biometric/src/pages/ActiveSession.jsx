import React, {
  useState, useEffect, useRef, useCallback
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import {
  ArrowLeft, Camera, Fingerprint, StopCircle,
  CheckCircle2, Clock, Users, AlertTriangle, Wifi, WifiOff,
  UserCheck
} from 'lucide-react';
import client from '../api/client.js';
import { socket, safeEmit } from '../socket/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import SessionTimer from '../components/SessionTimer.jsx';
import AttendanceList from '../components/AttendanceList.jsx';
import FaceOverlay from '../components/FaceOverlay.jsx';

const MODELS_PATH = '/models';
const SCAN_INTERVAL_MS = 500;

// ── Web Audio beep ─────────────────────────────────────────────────────────
function playBeep(frequency = 880, duration = 150, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {}
}

function successBeep() {
  playBeep(880, 120);
  setTimeout(() => playBeep(1100, 150), 130);
}

export default function ActiveSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  // ── State ──────────────────────────────────────────────────────────────────
  const [session, setSession]       = useState(null);
  const [mode, setMode]             = useState('face'); // 'face' | 'fingerprint'
  const [modelsLoaded, setModels]   = useState(false);
  const [modelsError, setModelsErr] = useState('');
  const [cameraError, setCamError]  = useState('');
  const [cameraReady, setCamReady]  = useState(false);

  const [presentStudents, setPresent]  = useState([]); // {studentId, studentName, time, method}
  const [absentStudents, setAbsent]    = useState([]); // {studentId, studentName}
  const [allStudents, setAll]          = useState([]); // full roster from descriptors endpoint

  // Face detection state
  const [detectionState, setDetect]  = useState('idle'); // idle | detecting | verifying | matched | no_face
  const [matchResult, setMatch]       = useState(null);  // {name, confidence, studentId}
  const [liveDetections, setLiveDet] = useState([]);     // raw face detections array
  const [matcherReady, setMatcherR]  = useState(false);

  // Notification queue
  const [notification, setNotif]     = useState(null);  // latest matched student card

  // Session complete modal
  const [completeModal, setCompleteModal] = useState(false);
  const [completeSummary, setCompleteSummary] = useState(null);

  const [socketConnected, setSocketConn] = useState(socket.connected);

  // Refs
  const webcamRef    = useRef(null);
  const canvasRef    = useRef(null);
  const matcherRef   = useRef(null);  // FaceMatcher instance
  const markedSetRef = useRef(new Set()); // studentIds already marked
  const scannerRef   = useRef(null);  // interval id
  const descriptorsRef = useRef([]);  // raw descriptors array

  // ── Load session detail ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadSession() {
      try {
        const { data } = await client.get(`/api/sessions/${sessionId}`);
        // Server returns { success, data: { session, attendance } }
        const payload = data?.data || data;
        const sess = payload.session || payload;
        setSession({ ...sess, attendance: payload.attendance || [] });
      } catch (err) {
        console.error('Failed to load session:', err.message);
      }
    }
    loadSession();
  }, [sessionId]);

  // ── Load face-api models ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
        ]);
        setModels(true);
      } catch (err) {
        setModelsErr(
          'Face recognition models not found. Please download models from ' +
          'https://github.com/vladmandic/face-api/tree/master/model ' +
          'and place them in biometric/public/models/'
        );
        console.error('[face-api] model load error:', err);
      }
    }
    if (mode === 'face') loadModels();
  }, [mode]);

  // ── Load face descriptors + build FaceMatcher ─────────────────────────────
  const buildMatcher = useCallback(async (courseId) => {
    if (!courseId) return;
    try {
      const { data } = await client.get(`/api/biometric/descriptors/${courseId}`);
      const list = data?.data || data || [];
      descriptorsRef.current = list;

      // Build full student roster for absent list
      const roster = list.map(s => ({ studentId: s.studentId, studentName: s.studentName, rollNumber: s.rollNumber }));
      setAll(roster);

      // Only use students that have face descriptors
      const labeled = list
        .filter(s => s.hasFace && Array.isArray(s.faceDescriptors) && s.faceDescriptors.length > 0)
        .map(s => {
          const descriptors = s.faceDescriptors.map(
            d => new Float32Array(Array.isArray(d) ? d : Object.values(d))
          );
          return new faceapi.LabeledFaceDescriptors(s.studentId, descriptors);
        });

      if (labeled.length > 0) {
        const threshold = settings?.faceMatchThreshold ?? 0.5;
        matcherRef.current = new faceapi.FaceMatcher(labeled, threshold);
        setMatcherR(true);
      }
    } catch (err) {
      console.error('Failed to load face descriptors:', err.message);
    }
  }, [settings?.faceMatchThreshold]);

  useEffect(() => {
    if (session?.course?._id || session?.courseId) {
      buildMatcher(session.course?._id || session.courseId);
    }
  }, [session, buildMatcher]);

  // ── Pre-populate present list from existing attendance ────────────────────
  useEffect(() => {
    if (!session?.attendance) return;
    const existing = session.attendance
      .filter(a => a.status === 'present')
      .map(a => ({
        studentId: a.student?._id || a.studentId,
        studentName: a.student?.profile?.name || a.student?.name || a.studentName || a.student?.email || 'Unknown',
        time: a.markedAt || a.time || new Date().toISOString(),
        method: a.method || 'manual',
      }));
    existing.forEach(e => markedSetRef.current.add(e.studentId));
    setPresent(existing);
  }, [session]);

  // ── Face scanning loop ────────────────────────────────────────────────────
  const runFaceScan = useCallback(async () => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) return;
    if (!matcherRef.current || !modelsLoaded) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setDetect('no_face');
        setMatch(null);
        setLiveDet([]);

        // Draw empty canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      setLiveDet([detection]);
      setDetect('verifying');

      // Resize detection to display dimensions
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      const resized = faceapi.resizeResults(detection, displaySize);

      // Find best match
      const best = matcherRef.current.findBestMatch(detection.descriptor);
      const isMatch = best.label !== 'unknown';
      const confidence = Math.round((1 - best.distance) * 100);

      // Update canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const box = resized.detection.box;
        const color = isMatch ? '#22c55e' : '#eab308';

        // Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.shadowBlur = 0;

        // Corner accents
        const cs = 20;
        ctx.lineWidth = 4;
        [[box.x, box.y, cs, 0, 0, cs],
         [box.x + box.width, box.y, -cs, 0, 0, cs],
         [box.x, box.y + box.height, cs, 0, 0, -cs],
         [box.x + box.width, box.y + box.height, -cs, 0, 0, -cs]]
          .forEach(([x, y, dx1, dy1, dx2, dy2]) => {
            ctx.beginPath();
            ctx.moveTo(x + dx1, y + dy1);
            ctx.lineTo(x, y);
            ctx.lineTo(x + dx2, y + dy2);
            ctx.stroke();
          });

        // Label background
        const studentName = isMatch
          ? descriptorsRef.current.find(s => s.studentId === best.label)?.studentName || best.label
          : 'Unknown';
        const label = isMatch
          ? `${studentName}  ${confidence}%`
          : `Unknown  ${confidence}%`;

        ctx.font = 'bold 14px system-ui';
        const textW = ctx.measureText(label).width + 16;
        ctx.fillStyle = isMatch ? 'rgba(34,197,94,0.85)' : 'rgba(234,179,8,0.85)';
        ctx.roundRect(box.x, box.y - 28, textW, 24, 6);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillText(label, box.x + 8, box.y - 10);
      }

      if (isMatch) {
        setDetect('matched');
        setMatch({ name: descriptorsRef.current.find(s => s.studentId === best.label)?.studentName || best.label,
                   confidence,
                   studentId: best.label });

        // Mark attendance if not already done
        if (!markedSetRef.current.has(best.label)) {
          markedSetRef.current.add(best.label);

          const studentName = descriptorsRef.current.find(s => s.studentId === best.label)?.studentName || best.label;

          // Persist via REST (works on serverless) + emit socket (for live monitor)
          client.post(`/api/sessions/${sessionId}/mark`, { studentId: best.label, method: 'face' })
            .catch(err => console.error('mark attendance failed:', err.message));
          safeEmit('biometric_match', {
            sessionId,
            studentId: best.label,
            method: 'face',
          });

          // Optimistic UI update
          const entry = {
            studentId: best.label,
            studentName,
            time: new Date().toISOString(),
            method: 'face',
          };
          setPresent(prev => [entry, ...prev]);
          setAbsent(prev => prev.filter(s => s.studentId !== best.label));

          // Notification card
          setNotif(entry);
          setTimeout(() => setNotif(null), 4000);

          // Audio feedback
          successBeep();
        }
      } else {
        setDetect('detecting');
        setMatch(null);
      }
    } catch (err) {
      // Silently ignore per-frame errors
    }
  }, [modelsLoaded, sessionId]);

  // ── Start/stop scan loop based on mode + readiness ───────────────────────
  useEffect(() => {
    if (mode !== 'face' || !modelsLoaded || !cameraReady || !matcherReady) {
      if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null; }
      return;
    }
    scannerRef.current = setInterval(runFaceScan, SCAN_INTERVAL_MS);
    return () => { clearInterval(scannerRef.current); scannerRef.current = null; };
  }, [mode, modelsLoaded, cameraReady, matcherReady, runFaceScan]);

  // ── Update absent list whenever present or allStudents changes ───────────
  useEffect(() => {
    const presentIds = new Set(presentStudents.map(s => s.studentId));
    setAbsent(allStudents.filter(s => !presentIds.has(s.studentId)));
  }, [presentStudents, allStudents]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onConnect() { setSocketConn(true); }
    function onDisconnect() { setSocketConn(false); }

    function onAttendanceMarked({ studentId, studentName, method, time, presentCount }) {
      if (!markedSetRef.current.has(studentId)) {
        markedSetRef.current.add(studentId);
        const entry = { studentId, studentName: studentName || studentId, time: time || new Date().toISOString(), method };
        setPresent(prev => {
          if (prev.find(s => s.studentId === studentId)) return prev;
          return [entry, ...prev];
        });
        setAbsent(prev => prev.filter(s => s.studentId !== studentId));
      }
    }

    function onSessionCompleted({ sessionId: sid, presentCount, absentCount }) {
      if (sid === sessionId) {
        setCompleteSummary({ presentCount, absentCount });
        setCompleteModal(true);
        if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null; }
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('attendance_marked', onAttendanceMarked);
    socket.on('session_completed', onSessionCompleted);

    // Join batch room
    const batchId = localStorage.getItem('bx_batch');
    if (batchId) safeEmit('join_batch', { batchId });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('attendance_marked', onAttendanceMarked);
      socket.off('session_completed', onSessionCompleted);
    };
  }, [sessionId]);

  // ── WebAuthn fingerprint mark ─────────────────────────────────────────────
  async function verifyFingerprint(student) {
    if (markedSetRef.current.has(student.studentId)) return;
    try {
      // Get challenge from server ({ success, data: { challenge } })
      const { data: challData } = await client.get('/api/biometric/challenge');
      const b64 = (challData.data?.challenge || challData.challenge || '')
        .replace(/-/g, '+').replace(/_/g, '/');
      const challenge = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (credential) {
        markedSetRef.current.add(student.studentId);
        client.post(`/api/sessions/${sessionId}/mark`, { studentId: student.studentId, method: 'fingerprint' })
          .catch(err => console.error('mark attendance failed:', err.message));
        safeEmit('biometric_match', {
          sessionId,
          studentId: student.studentId,
          method: 'fingerprint',
        });

        const entry = {
          studentId: student.studentId,
          studentName: student.studentName,
          time: new Date().toISOString(),
          method: 'fingerprint',
        };
        setPresent(prev => [entry, ...prev]);
        setAbsent(prev => prev.filter(s => s.studentId !== student.studentId));
        setNotif(entry);
        setTimeout(() => setNotif(null), 4000);
        successBeep();
      }
    } catch (err) {
      console.error('WebAuthn error:', err);
    }
  }

  async function handleCompleteSession() {
    // Emit socket (live monitor) + complete via REST (authoritative on serverless)
    safeEmit('complete_session', { sessionId });
    try {
      const { data } = await client.put(`/api/sessions/${sessionId}/complete`);
      const sum = data?.data?.summary;
      setCompleteSummary({
        presentCount: sum?.presentCount ?? presentStudents.length,
        absentCount:  sum?.absentCount ?? absentStudents.length,
      });
      setCompleteModal(true);
      if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null; }
    } catch (err) {
      console.error('complete session failed:', err.message);
    }
  }

  function handleModalClose() {
    setCompleteModal(false);
    navigate('/today');
  }

  // ── Status bar text ───────────────────────────────────────────────────────
  const scanStatusText = () => {
    if (!modelsLoaded && mode === 'face') return 'Loading face recognition models…';
    if (modelsError)                      return modelsError;
    if (cameraError)                      return cameraError;
    if (!cameraReady && mode === 'face')  return 'Starting camera…';
    if (!matcherReady && mode === 'face') return 'Loading student face data…';
    if (mode !== 'face')                  return 'Fingerprint mode — tap student to verify';
    switch (detectionState) {
      case 'no_face':   return 'Looking for faces…';
      case 'detecting': return 'Face detected — verifying…';
      case 'verifying': return 'Verifying identity…';
      case 'matched':   return `Matched: ${matchResult?.name}`;
      default:          return 'Ready — point camera at student';
    }
  };

  const scanStatusColor = () => {
    if (modelsError || cameraError) return 'text-red-400';
    if (!modelsLoaded || !cameraReady || !matcherReady) return 'text-yellow-400';
    switch (detectionState) {
      case 'no_face':   return 'text-gray-400';
      case 'detecting':
      case 'verifying': return 'text-yellow-400';
      case 'matched':   return 'text-green-400';
      default:          return 'text-emerald-400';
    }
  };

  const sessionName = session?.course?.name || session?.courseName || 'Loading…';
  const sessionCode = session?.course?.code || session?.courseCode || '';
  const schedStart  = session?.scheduledStart ? new Date(session.scheduledStart) : null;
  const schedEnd    = session?.scheduledEnd   ? new Date(session.scheduledEnd)   : null;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-dark-800 border-b border-dark-600 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/today')}
              className="btn-secondary p-1.5 flex items-center gap-1 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <h1 className="text-white font-bold text-lg leading-tight">
                  {sessionName}
                  {sessionCode && <span className="text-gray-400 font-normal text-sm ml-2">— {sessionCode}</span>}
                </h1>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                {schedStart && schedEnd && (
                  <span>
                    {schedStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    {' – '}
                    {schedEnd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </span>
                )}
                {session?.batch?.name && <span>· {session.batch.name}</span>}
                <span className={socketConnected ? 'text-green-400' : 'text-red-400'}>
                  {socketConnected ? '● Live' : '● Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {schedEnd && (
              <SessionTimer
                endTime={schedEnd}
                onExpire={() => {
                  if (settings?.sessionAutoComplete) handleCompleteSession();
                }}
              />
            )}
            <button
              onClick={() => setMode(m => m === 'face' ? 'fingerprint' : 'face')}
              className="btn-secondary flex items-center gap-2 text-sm py-1.5"
            >
              {mode === 'face'
                ? <><Fingerprint className="w-4 h-4" /> Fingerprint</>
                : <><Camera className="w-4 h-4" /> Face</>}
            </button>
            <button
              onClick={handleCompleteSession}
              className="btn-danger flex items-center gap-2 text-sm py-1.5"
            >
              <StopCircle className="w-4 h-4" /> Complete Session
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Camera/Scanner ── */}
        <div className="flex-1 flex flex-col bg-black relative overflow-hidden" style={{ minWidth: 0 }}>
          {mode === 'face' ? (
            <div className="relative flex-1 flex items-center justify-center">
              {/* Camera feed */}
              {!cameraError ? (
                <div className="relative" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                    onUserMedia={() => setCamReady(true)}
                    onUserMediaError={(e) => {
                      setCamError('Camera access denied. Please allow camera permissions.');
                      console.error('Camera error:', e);
                    }}
                    style={{ display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 160px)' }}
                  />
                  {/* Canvas overlay */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Scan line animation while detecting */}
                  {(detectionState === 'detecting' || detectionState === 'verifying') && (
                    <div className="scan-line" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center px-8">
                  <AlertTriangle className="w-16 h-16 text-red-400" />
                  <p className="text-red-300 font-medium">{cameraError}</p>
                  <p className="text-gray-500 text-sm">
                    Check browser permissions and refresh the page.
                  </p>
                </div>
              )}

              {/* Models loading overlay */}
              {mode === 'face' && (!modelsLoaded || !matcherReady) && !modelsError && !cameraError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                  <div className="flex gap-2">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </div>
                  <p className="text-emerald-300 font-medium text-sm">
                    {!modelsLoaded ? 'Loading face recognition models…' : 'Loading student face data…'}
                  </p>
                </div>
              )}

              {/* Models error overlay */}
              {modelsError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 px-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-400" />
                  <p className="text-yellow-300 text-center text-sm">{modelsError}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Fingerprint list mode ── */
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-gray-300 font-semibold mb-4">
                Tap a student to verify their fingerprint
              </h3>
              <div className="space-y-2">
                {allStudents.map(s => {
                  const marked = markedSetRef.current.has(s.studentId);
                  return (
                    <button
                      key={s.studentId}
                      onClick={() => !marked && verifyFingerprint(s)}
                      disabled={marked}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl
                                  border transition-all duration-200 text-left
                                  ${marked
                                    ? 'bg-green-900/20 border-green-700/40 cursor-default'
                                    : 'bg-dark-700 border-dark-500 hover:border-emerald-500 hover:bg-dark-600 active:scale-[0.99]'}`}
                    >
                      <div>
                        <p className={`font-medium ${marked ? 'text-green-300' : 'text-white'}`}>
                          {s.studentName}
                        </p>
                        <p className="text-gray-500 text-xs">{s.rollNumber}</p>
                      </div>
                      {marked
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <Fingerprint className="w-5 h-5 text-gray-500" />}
                    </button>
                  );
                })}
                {allStudents.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No students loaded</p>
                )}
              </div>
            </div>
          )}

          {/* ── Status bar ── */}
          <div className="bg-dark-800/90 border-t border-dark-600 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${scanStatusColor()}`}>
                {scanStatusText()}
              </span>
            </div>
            {mode === 'face' && matchResult && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Confidence</span>
                <div className="w-24 h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full confidence-bar"
                    style={{
                      width: `${matchResult.confidence}%`,
                      background: matchResult.confidence >= 80
                        ? '#22c55e' : matchResult.confidence >= 60
                        ? '#eab308' : '#ef4444',
                    }}
                  />
                </div>
                <span className={`text-xs font-bold tabular-nums
                                  ${matchResult.confidence >= 80 ? 'text-green-400'
                                  : matchResult.confidence >= 60 ? 'text-yellow-400'
                                  : 'text-red-400'}`}>
                  {matchResult.confidence}%
                </span>
              </div>
            )}
            {mode === 'face' && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Matched
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Detecting
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Attendance panel ── */}
        <div className="w-80 flex-shrink-0 bg-dark-800 border-l border-dark-600 flex flex-col">
          {/* Stats row */}
          <div className="px-4 py-4 border-b border-dark-600 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{presentStudents.length}</p>
              <p className="text-xs text-gray-400">Present</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{absentStudents.length}</p>
              <p className="text-xs text-gray-400">Not Yet</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{allStudents.length}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-2 border-b border-dark-600">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Attendance</span>
              <span className="font-mono">
                {allStudents.length > 0
                  ? Math.round((presentStudents.length / allStudents.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded-full transition-all duration-500"
                style={{
                  width: allStudents.length > 0
                    ? `${(presentStudents.length / allStudents.length) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>

          {/* Attendance list */}
          <div className="flex-1 overflow-hidden">
            <AttendanceList
              presentStudents={presentStudents}
              absentStudents={absentStudents}
              totalStudents={allStudents.length}
              onFingerprintClick={mode === 'fingerprint' ? verifyFingerprint : null}
            />
          </div>
        </div>
      </div>

      {/* ── Match notification card ── */}
      {notification && (
        <div className="match-notification fixed bottom-6 right-6 max-w-xs bg-green-900 border border-green-600
                        rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 z-50">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">{notification.studentName}</p>
            <p className="text-green-300 text-xs">
              {notification.method === 'face' ? '📷 Face scan' : '🖐 Fingerprint'} ·{' '}
              {new Date(notification.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 ml-auto" />
        </div>
      )}

      {/* ── Session complete modal ── */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-500 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-900/60 border-2 border-green-500 flex items-center
                            justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-white text-xl font-bold mb-1">Session Complete</h2>
            <p className="text-gray-400 text-sm mb-6">{sessionName}</p>

            {completeSummary && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-400">{completeSummary.presentCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Present</p>
                </div>
                <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-4">
                  <p className="text-3xl font-bold text-red-400">{completeSummary.absentCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Absent</p>
                </div>
              </div>
            )}

            <button onClick={handleModalClose} className="btn-primary w-full">
              Back to Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
