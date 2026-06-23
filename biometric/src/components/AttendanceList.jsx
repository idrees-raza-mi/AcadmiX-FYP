import React, { useRef, useEffect } from 'react';
import { Camera, Fingerprint, Clock, CheckCircle2 } from 'lucide-react';

/**
 * AttendanceList – scrollable side panel showing present/absent students.
 *
 * Props:
 *   presentStudents    – [{ studentId, studentName, time, method }]
 *   absentStudents     – [{ studentId, studentName, rollNumber }]
 *   totalStudents      – number
 *   onFingerprintClick – optional callback(student) for fingerprint mode
 */
export default function AttendanceList({
  presentStudents = [],
  absentStudents  = [],
  totalStudents   = 0,
  onFingerprintClick,
}) {
  const presentEndRef = useRef(null);

  // Auto-scroll to newest entry when list grows
  useEffect(() => {
    presentEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [presentStudents.length]);

  function MethodIcon({ method }) {
    if (method === 'fingerprint') {
      return <Fingerprint className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
    }
    return <Camera className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />;
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Present section */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 px-4 py-2.5 border-b border-dark-600 z-10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Present
            <span className="ml-auto bg-green-900/50 text-green-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {presentStudents.length}
            </span>
          </h3>
        </div>

        <div className="px-3 py-2 space-y-1.5">
          {presentStudents.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-4">No attendance yet</p>
          ) : (
            presentStudents.map((s, i) => (
              <div
                key={`${s.studentId}-${i}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-900/15
                           border border-green-900/30 animate-fade-in"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-green-800/60 flex items-center justify-center
                                flex-shrink-0 text-green-400 text-xs font-bold">
                  {(s.studentName || '?')[0].toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate leading-tight">
                    {s.studentName || s.studentId}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MethodIcon method={s.method} />
                    <span className="text-gray-500 text-xs tabular-nums">
                      {formatTime(s.time)}
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              </div>
            ))
          )}
          <div ref={presentEndRef} />
        </div>
      </div>

      {/* Not Yet section */}
      <div className="flex-shrink-0 border-t border-dark-600" style={{ maxHeight: '42%' }}>
        <div className="bg-dark-800 px-4 py-2.5 border-b border-dark-600">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            Not Yet
            <span className="ml-auto bg-red-900/50 text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {absentStudents.length}
            </span>
          </h3>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(42vh - 48px)' }}>
          <div className="px-3 py-2 space-y-1">
            {absentStudents.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-3">Everyone is present!</p>
            ) : (
              absentStudents.map((s) => (
                <div
                  key={s.studentId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg
                              ${onFingerprintClick
                                ? 'cursor-pointer hover:bg-dark-700 active:bg-dark-600 transition-colors'
                                : ''}`}
                  onClick={() => onFingerprintClick?.(s)}
                >
                  <div className="w-6 h-6 rounded-full bg-dark-600 flex items-center justify-center
                                  flex-shrink-0 text-gray-500 text-xs font-bold">
                    {(s.studentName || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-sm truncate">{s.studentName || s.studentId}</p>
                    {s.rollNumber && (
                      <p className="text-gray-600 text-xs">{s.rollNumber}</p>
                    )}
                  </div>
                  {onFingerprintClick
                    ? <Fingerprint className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    : <Clock className="w-3 h-3 text-gray-700 flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
