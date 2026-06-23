import React, { useRef, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';

/**
 * FaceOverlay – canvas drawn absolutely on top of the webcam feed.
 *
 * Props:
 *   detections   – array of face detections from face-api (resized to display)
 *   matchResult  – { name, confidence, studentId } | null
 *   displaySize  – { width, height } of the video element
 */
export default function FaceOverlay({ detections = [], matchResult, displaySize }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (displaySize) {
      canvas.width  = displaySize.width;
      canvas.height = displaySize.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections || detections.length === 0) return;

    detections.forEach((det) => {
      const box = det.detection?.box || det.box;
      if (!box) return;

      const { x, y, width, height } = box;
      const isMatch = !!matchResult;

      // Colour scheme
      const mainColor  = isMatch ? '#22c55e' : '#eab308';
      const labelColor = isMatch ? 'rgba(34,197,94,0.9)' : 'rgba(234,179,8,0.9)';

      // ── Bounding box ──────────────────────────────────────────────────────
      ctx.save();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = mainColor;
      ctx.shadowBlur  = 14;
      ctx.strokeRect(x, y, width, height);
      ctx.restore();

      // ── Corner brackets ────────────────────────────────────────────────────
      const cs = Math.min(20, width * 0.15);
      ctx.save();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth   = 4;
      ctx.lineCap     = 'round';

      const corners = [
        [x,         y,          cs,  0,  0,  cs],
        [x + width, y,          -cs, 0,  0,  cs],
        [x,         y + height, cs,  0,  0, -cs],
        [x + width, y + height, -cs, 0,  0, -cs],
      ];
      corners.forEach(([cx, cy, dx1, dy1, dx2, dy2]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx1, cy + dy1);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx2, cy + dy2);
        ctx.stroke();
      });
      ctx.restore();

      // ── Label ──────────────────────────────────────────────────────────────
      const name = matchResult?.name || 'Unknown';
      const conf = matchResult?.confidence != null ? `${matchResult.confidence}%` : '';
      const label = isMatch ? `${name}  ${conf}` : `Unknown`;

      ctx.save();
      ctx.font = 'bold 13px system-ui, sans-serif';
      const textW  = ctx.measureText(label).width + 18;
      const labelH = 26;
      const labelY = y > labelH + 4 ? y - labelH - 4 : y + height + 4;

      // Rounded rectangle background
      const radius = 6;
      const lx = x;
      const ly = labelY;
      ctx.fillStyle = labelColor;
      ctx.beginPath();
      ctx.moveTo(lx + radius, ly);
      ctx.lineTo(lx + textW - radius, ly);
      ctx.quadraticCurveTo(lx + textW, ly, lx + textW, ly + radius);
      ctx.lineTo(lx + textW, ly + labelH - radius);
      ctx.quadraticCurveTo(lx + textW, ly + labelH, lx + textW - radius, ly + labelH);
      ctx.lineTo(lx + radius, ly + labelH);
      ctx.quadraticCurveTo(lx, ly + labelH, lx, ly + labelH - radius);
      ctx.lineTo(lx, ly + radius);
      ctx.quadraticCurveTo(lx, ly, lx + radius, ly);
      ctx.closePath();
      ctx.fill();

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, lx + 9, ly + labelH - 8);
      ctx.restore();

      // ── Confidence arc (only when matched) ────────────────────────────────
      if (isMatch && matchResult?.confidence != null) {
        const conf01 = matchResult.confidence / 100;
        const cx2    = x + width - 22;
        const cy2    = y + 22;
        const r      = 14;

        ctx.save();
        ctx.lineWidth = 3;

        // Background circle
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
        ctx.stroke();

        // Filled arc
        const arcColor = conf01 >= 0.8 ? '#22c55e' : conf01 >= 0.6 ? '#eab308' : '#ef4444';
        ctx.strokeStyle = arcColor;
        ctx.shadowColor = arcColor;
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.arc(cx2, cy2, r, -Math.PI / 2, -Math.PI / 2 + conf01 * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });
  }, [detections, matchResult, displaySize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
