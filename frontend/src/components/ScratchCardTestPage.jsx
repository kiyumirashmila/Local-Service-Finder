import React, { useEffect, useRef, useState } from 'react';

const demoCoupons = [
  { code: 'SCRATCH-DEMO10', type: 'percentage', value: 10 },
  { code: 'SCRATCH-DEMO20', type: 'percentage', value: 20 },
  { code: 'SCRATCH-DEMO500', type: 'fixed', value: 500 },
];

const ScratchCardTestPage = ({ onBack }) => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [coupon, setCoupon] = useState(() => demoCoupons[Math.floor(Math.random() * demoCoupons.length)]);
  const [ticketSeed, setTicketSeed] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const [revealedPct, setRevealedPct] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initCanvas = (attempt = 0) => {
      if (cancelled) return;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) {
        if (attempt < 20) window.requestAnimationFrame(() => initCanvas(attempt + 1));
        return;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const w = Math.max(1, Math.floor(wrap.clientWidth || 320));
      const h = Math.max(1, Math.floor(wrap.clientHeight || 190));
      canvas.width = w;
      canvas.height = h;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#b6bec8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < 1500; i += 1) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SCRATCH HERE', w / 2, h / 2);
      setRevealedPct(0);
      setDone(false);
    };
    initCanvas();
    return () => {
      cancelled = true;
    };
  }, [coupon.code, ticketSeed]);

  const scratchAt = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  };

  const updateProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 120) transparent += 1;
    }
    const total = Math.max(1, Math.floor(data.length / 4));
    const pct = Math.round((transparent / total) * 100);
    setRevealedPct(pct);
    if (pct >= 45) setDone(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fbf2e8', padding: 20 }}>
      <div style={{ maxWidth: 620, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e5e7eb' }}>
        <button type="button" onClick={onBack} style={{ border: '1px solid #d1d5db', borderRadius: 10, padding: '8px 12px', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>
          ← Back
        </button>
        <h2 style={{ margin: '12px 0 6px' }}>Scratch Card Test</h2>
        <div style={{ color: '#6b7280', fontWeight: 700, marginBottom: 10 }}>Temp testing route (no payment form)</div>
        <div ref={wrapRef} style={{ position: 'relative', minHeight: 200, border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#64748b' }}>YOU WON</div>
            <div style={{ fontSize: 34, fontWeight: 1000, color: '#b91c1c' }}>
              {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `LKR ${coupon.value.toLocaleString()} OFF`}
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 900 }}>{coupon.code}</div>
          </div>
          {!done && (
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, touchAction: 'none' }}
              onPointerDown={(e) => {
                setIsScratching(true);
                scratchAt(e.clientX, e.clientY);
                updateProgress();
              }}
              onPointerMove={(e) => {
                if (!isScratching) return;
                scratchAt(e.clientX, e.clientY);
                updateProgress();
              }}
              onPointerUp={() => {
                setIsScratching(false);
                updateProgress();
              }}
              onPointerLeave={() => setIsScratching(false)}
            />
          )}
        </div>
        <div style={{ marginTop: 10, fontWeight: 800, color: done ? '#166534' : '#64748b' }}>
          {done ? 'Revealed! Scratch is working.' : `Scratch to reveal (${revealedPct}%)`}
        </div>
        <button
          type="button"
          onClick={() => {
            setCoupon(demoCoupons[Math.floor(Math.random() * demoCoupons.length)]);
            setIsScratching(false);
            setRevealedPct(0);
            setDone(false);
            setTicketSeed((s) => s + 1);
          }}
          style={{ marginTop: 10, border: 'none', background: '#1f2937', color: '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontWeight: 900 }}
        >
          New test card
        </button>
      </div>
    </div>
  );
};

export default ScratchCardTestPage;
