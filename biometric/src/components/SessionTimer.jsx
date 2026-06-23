import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

/**
 * SessionTimer – live countdown to endTime.
 *
 * Props:
 *   endTime   – Date object or ISO string when the session ends
 *   onExpire  – callback fired once when time reaches 0
 *   compact   – if true renders a small inline version (for schedule cards)
 */
export default function SessionTimer({ endTime, onExpire, compact = false }) {
  const [remaining, setRemaining] = useState(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!endTime) return;
    firedRef.current = false;

    function tick() {
      const diff = Math.max(0, new Date(endTime) - Date.now());
      setRemaining(diff);
      if (diff === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, onExpire]);

  if (remaining === null) return null;

  const totalSecs = Math.floor(remaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const pad  = (n) => String(n).padStart(2, '0');

  const label = remaining <= 0 ? 'Expired' : `${pad(mins)}:${pad(secs)} remaining`;

  // Color thresholds
  const colorClass =
    remaining <= 0           ? 'text-gray-500'  :
    remaining <= 5 * 60_000  ? 'text-red-400'   :  // last 5 min
    remaining <= 10 * 60_000 ? 'text-yellow-400':  // last 10 min
                                'text-green-400';

  if (compact) {
    return (
      <span className={`flex items-center gap-1 text-sm font-mono font-medium ${colorClass}`}>
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        {label}
      </span>
    );
  }

  // Full timer widget (used in ActiveSession header)
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono
                     ${remaining <= 0
                       ? 'bg-gray-900/40 border-gray-700/40 text-gray-500'
                       : remaining <= 5 * 60_000
                       ? 'bg-red-900/30 border-red-700/50 text-red-400'
                       : remaining <= 10 * 60_000
                       ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400'
                       : 'bg-green-900/20 border-green-700/40 text-green-400'}`}>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-semibold tabular-nums">{label}</span>
    </div>
  );
}
