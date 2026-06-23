import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import {
  ArrowLeft, Camera, Fingerprint, CheckCircle2, XCircle,
  Search, User, AlertTriangle, RefreshCw, ChevronDown
} from 'lucide-react';
import client from '../api/client.js';
import { useSettings } from '../context/SettingsContext.jsx';

const MODELS_PATH = '/models';

export default function BiometricSetup() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [batches, setBatches]        = useState([]);
  const [selectedBatch, setSelected] = useState('');
  const [students, setStudents]      = useState([]);
  const [search, setSearch]          = useState('');
  const [loading, setLoading]        = useState(false);
  const [modelsLoaded, setModels]    = useState(false);
  const [modelsError, setModelsErr]  = useState('');
  const [showBatchMenu, setShowBatchMenu] = useState(false);

  // Modal state
  const [modalStudent, setModalStudent] = useState(null);
  const [modalMode, setModalMode]       = useState(null); // 'face' | 'fingerprint'

  // Face capture state
  const [capturing, setCapturing]   = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [captureTotal, setCaptureTotal] = useState(5);
  const [captureError, setCaptureErr] = useState('');
  const [captureDone, setCaptureDone] = useState(false);

  // Fingerprint state
  const [fpStatus, setFpStatus] = useState('idle'); // idle | capturing | done | error
  const [fpError, setFpError]   = useState('');

  const webcamRef = useRef(null);
  const captureTargetsRef = useRef(null); // interval ref

  // ── Load batches ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadBatches() {
      try {
        const { data } = await client.get('/api/departments/batches');
        const list = Array.isArray(data) ? data : (data.data || data.batches || []);
        setBatches(list);
        if (list.length > 0) {
          const stored = localStorage.getItem('bx_batch');
          setSelected(stored && list.find(b => b._id === stored) ? stored : list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load batches:', err.message);
      }
    }
    loadBatches();
  }, []);

  // ── Load students for batch ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBatch) return;
    setLoading(true);
    async function loadStudents() {
      try {
        const { data } = await client.get(`/api/admin/students?batch=${selectedBatch}`);
        const list = Array.isArray(data) ? data : (data.data || data.students || []);
        setStudents(list);
      } catch (err) {
        console.error('Failed to load students:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [selectedBatch]);

  // ── Load models when modal opens for face ─────────────────────────────────
  useEffect(() => {
    if (modalMode !== 'face' || modelsLoaded) return;
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
        ]);
        setModels(true);
      } catch (err) {
        setModelsErr('Models not found. Download from https://github.com/vladmandic/face-api/tree/master/model');
      }
    }
    loadModels();
  }, [modalMode, modelsLoaded]);

  // ── Face capture ───────────────────────────────────────────────────────────
  const captureTotal_ = settings?.faceCaptureSamples || 5;

  const runFaceCapture = useCallback(async (studentId) => {
    if (!webcamRef.current || !modelsLoaded) return;
    setCapturing(true);
    setCaptureErr('');
    setCaptureDone(false);
    setCaptureCount(0);
    setCaptureTotal(captureTotal_);

    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    const videoReady = (v) => v && v.readyState >= 3 && v.videoWidth > 0;

    // 1. Wait until the webcam is actually streaming (up to ~10s)
    let video = null;
    for (let i = 0; i < 50; i++) {
      const v = webcamRef.current?.video;
      if (videoReady(v)) { video = v; break; }
      await delay(200);
    }
    if (!video) {
      setCapturing(false);
      setCaptureErr('Camera not ready. Please allow camera access, wait a moment, and try again.');
      return;
    }

    // 2. Capture loop — lower confidence + generous time budget
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 1 });
    const descriptors = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    while (descriptors.length < captureTotal_ && attempts < MAX_ATTEMPTS) {
      attempts++;
      try {
        const v = webcamRef.current?.video;
        if (!videoReady(v)) { await delay(200); continue; }

        const det = await faceapi
          .detectSingleFace(v, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!det) { await delay(250); continue; }

        descriptors.push(Array.from(det.descriptor));
        setCaptureCount(descriptors.length);

        try {
          await client.post('/api/biometric/face/register', { studentId, descriptor: Array.from(det.descriptor) });
        } catch (e) {
          console.warn('Register descriptor error:', e.message);
        }

        await delay(500); // brief pause between captures
      } catch (err) {
        await delay(250);
      }
    }

    setCapturing(false);

    const refresh = async () => {
      try {
        const { data } = await client.get(`/api/admin/students?batch=${selectedBatch}`);
        const list = Array.isArray(data) ? data : (data.data || data.students || []);
        setStudents(list);
      } catch {}
    };

    if (descriptors.length >= captureTotal_) {
      setCaptureDone(true);
      await refresh();
    } else if (descriptors.length > 0) {
      // partial success — samples were still saved
      setCaptureDone(true);
      setCaptureErr(`Captured ${descriptors.length}/${captureTotal_} samples. Tap "Recapture" in better lighting to add more.`);
      await refresh();
    } else {
      setCaptureErr('No face detected. Make sure your face is centered in the circle, well-lit, and not too far from the camera, then try again.');
    }
  }, [modelsLoaded, captureTotal_, selectedBatch]);

  // ── Fingerprint registration ───────────────────────────────────────────────
  async function runFingerprintRegister(studentId) {
    setFpStatus('capturing');
    setFpError('');
    try {
      // Get challenge
      const { data: challData } = await client.get('/api/biometric/challenge');
      const challenge = Uint8Array.from(atob(challData.challenge), c => c.charCodeAt(0));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'AcademicX', id: window.location.hostname },
          user: {
            id: Uint8Array.from(studentId, c => c.charCodeAt(0)),
            name: modalStudent?.rollNumber || studentId,
            displayName: modalStudent?.name || studentId,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      if (credential) {
        const fingerprintId = btoa(String.fromCharCode(
          ...new Uint8Array(credential.rawId)
        ));
        await client.post('/api/biometric/fingerprint/register', {
          studentId,
          fingerprintId,
        });
        setFpStatus('done');
        try {
          const { data } = await client.get(`/api/admin/students?batch=${selectedBatch}`);
          const list = Array.isArray(data) ? data : (data.data || data.students || []);
          setStudents(list);
        } catch {}
      }
    } catch (err) {
      setFpStatus('error');
      setFpError(err.name === 'NotAllowedError'
        ? 'Fingerprint verification cancelled or not allowed.'
        : err.message);
    }
  }

  function openModal(student, mode) {
    setModalStudent(student);
    setModalMode(mode);
    setCapturing(false);
    setCaptureCount(0);
    setCaptureErr('');
    setCaptureDone(false);
    setFpStatus('idle');
    setFpError('');
  }

  function closeModal() {
    setModalStudent(null);
    setModalMode(null);
  }

  // ── Filter students ────────────────────────────────────────────────────────
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) ||
           (s.rollNumber || '').toLowerCase().includes(q);
  });

  const batchName = batches.find(b => b._id === selectedBatch)?.name || 'Select Batch';

  function StatusIcon({ has }) {
    return has
      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
      : <XCircle className="w-4 h-4 text-gray-600" />;
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/today')} className="btn-secondary p-1.5">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-white font-bold text-xl">Biometric Setup</h1>
              <p className="text-gray-400 text-xs mt-0.5">Register student face & fingerprint data</p>
            </div>
          </div>

          {/* Batch picker */}
          <div className="relative">
            <button
              onClick={() => setShowBatchMenu(v => !v)}
              className="btn-secondary flex items-center gap-2"
            >
              {batchName} <ChevronDown className="w-4 h-4" />
            </button>
            {showBatchMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-dark-700 border border-dark-500
                              rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                {batches.map(b => (
                  <button
                    key={b._id}
                    onClick={() => { setSelected(b._id); setShowBatchMenu(false); }}
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
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or roll number…"
            className="input-field pl-10"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Registered
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-gray-600" /> Not registered
          </span>
          <span className="ml-auto text-gray-500">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''} shown
          </span>
        </div>

        {/* Student grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-dark-600 rounded w-32 mb-2" />
                    <div className="h-3 bg-dark-700 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(student => {
              const hasFace = student.biometric?.hasFace || student.hasFace || false;
              const hasFingerprint = student.biometric?.hasFingerprint || student.hasFingerprint || false;

              return (
                <div key={student._id} className="card border border-dark-600 p-4
                                                    hover:border-dark-400 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{student.name}</p>
                      <p className="text-gray-500 text-xs">{student.rollNumber}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {/* Face button */}
                    <button
                      onClick={() => openModal(student, 'face')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                                  text-sm font-medium transition-all border
                                  ${hasFace
                                    ? 'bg-green-900/30 border-green-700/40 text-green-300 hover:bg-green-900/50'
                                    : 'bg-dark-700 border-dark-500 text-gray-400 hover:border-emerald-500 hover:text-emerald-300'}`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Face</span>
                      <StatusIcon has={hasFace} />
                    </button>

                    {/* Fingerprint button */}
                    <button
                      onClick={() => openModal(student, 'fingerprint')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                                  text-sm font-medium transition-all border
                                  ${hasFingerprint
                                    ? 'bg-green-900/30 border-green-700/40 text-green-300 hover:bg-green-900/50'
                                    : 'bg-dark-700 border-dark-500 text-gray-400 hover:border-emerald-500 hover:text-emerald-300'}`}
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Fingerprint</span>
                      <StatusIcon has={hasFingerprint} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !loading && (
              <div className="col-span-2 text-center py-20">
                <User className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                <p className="text-gray-400">No students found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Registration Modal ── */}
      {modalStudent && modalMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-dark-600 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">
                  {modalMode === 'face' ? 'Register Face' : 'Register Fingerprint'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {modalStudent.name} · {modalStudent.rollNumber}
                </p>
              </div>
              <button onClick={closeModal}
                      className="text-gray-500 hover:text-white transition-colors p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* ── Face modal ── */}
              {modalMode === 'face' && (
                <div>
                  {modelsError ? (
                    <div className="text-center py-6">
                      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                      <p className="text-yellow-300 text-sm">{modelsError}</p>
                    </div>
                  ) : (
                    <>
                      {/* Webcam */}
                      <div className="relative rounded-xl overflow-hidden bg-black mb-4">
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                          style={{ width: '100%', display: 'block' }}
                        />
                        {/* Guide overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="border-2 border-dashed border-emerald-400/50 rounded-full w-40 h-48" />
                        </div>
                        {/* Loading indicator */}
                        {!modelsLoaded && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <p className="text-emerald-300 text-sm">Loading models…</p>
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      {capturing && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-emerald-300 font-medium">
                              Capturing {captureCount}/{captureTotal}…
                            </span>
                            <span className="text-gray-400">{Math.round((captureCount/captureTotal)*100)}%</span>
                          </div>
                          <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${(captureCount/captureTotal)*100}%` }}
                            />
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            Please look directly at the camera. Turn head slightly between captures.
                          </p>
                        </div>
                      )}

                      {captureDone && (
                        <div className="mb-4 px-4 py-3 bg-green-900/30 border border-green-700/40 rounded-xl
                                        flex items-center gap-2 text-green-300">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          Face registered successfully! ({captureTotal} samples captured)
                        </div>
                      )}

                      {captureError && (
                        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-xl
                                        flex items-center gap-2 text-red-300 text-sm">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          {captureError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => runFaceCapture(modalStudent._id)}
                          disabled={capturing || !modelsLoaded}
                          className="flex-1 btn-primary flex items-center justify-center gap-2
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {capturing ? (
                            <>
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                              </svg>
                              Capturing…
                            </>
                          ) : captureDone ? (
                            <><RefreshCw className="w-4 h-4" /> Recapture</>
                          ) : (
                            <><Camera className="w-4 h-4" /> Capture Face</>
                          )}
                        </button>
                        <button onClick={closeModal} className="btn-secondary px-5">Done</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Fingerprint modal ── */}
              {modalMode === 'fingerprint' && (
                <div className="text-center py-4">
                  <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto mb-6
                                   transition-all duration-300
                                   ${fpStatus === 'capturing' ? 'border-emerald-500 bg-emerald-900/30 animate-pulse'
                                   : fpStatus === 'done'      ? 'border-green-500 bg-green-900/30'
                                   : fpStatus === 'error'     ? 'border-red-500 bg-red-900/30'
                                   : 'border-dark-500 bg-dark-700'}`}>
                    <Fingerprint className={`w-10 h-10
                                             ${fpStatus === 'capturing' ? 'text-emerald-400'
                                             : fpStatus === 'done'      ? 'text-green-400'
                                             : fpStatus === 'error'     ? 'text-red-400'
                                             : 'text-gray-400'}`} />
                  </div>

                  {fpStatus === 'idle' && (
                    <p className="text-gray-300 mb-6 text-sm">
                      Click the button below to start fingerprint registration.
                      The student should place their finger on the device sensor.
                    </p>
                  )}
                  {fpStatus === 'capturing' && (
                    <p className="text-emerald-300 mb-6 font-medium">
                      Please place your finger on the sensor…
                    </p>
                  )}
                  {fpStatus === 'done' && (
                    <div className="mb-6 px-4 py-3 bg-green-900/30 border border-green-700/40 rounded-xl
                                    flex items-center justify-center gap-2 text-green-300">
                      <CheckCircle2 className="w-5 h-5" />
                      Fingerprint registered successfully!
                    </div>
                  )}
                  {fpStatus === 'error' && (
                    <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-xl
                                    text-red-300 text-sm">
                      {fpError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => runFingerprintRegister(modalStudent._id)}
                      disabled={fpStatus === 'capturing'}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Fingerprint className="w-4 h-4" />
                      {fpStatus === 'done' ? 'Register Again' : 'Register Fingerprint'}
                    </button>
                    <button onClick={closeModal} className="btn-secondary px-5">Done</button>
                  </div>

                  {!window.PublicKeyCredential && (
                    <p className="text-yellow-400 text-xs mt-4">
                      WebAuthn is not supported on this browser/device.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
