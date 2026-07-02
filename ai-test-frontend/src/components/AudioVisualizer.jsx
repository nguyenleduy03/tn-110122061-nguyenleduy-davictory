import { useEffect, useRef } from 'react';

export default function AudioVisualizer({ audioRef, isPlaying, barCount = 48, height = 40, color = 'var(--primary)', progressColor = '#4F46E5' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!audioRef?.current || !canvasRef.current) return;

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyserRef.current = analyser;
      ctxRef.current = audioCtx;
      sourceRef.current = source;
    } catch {
      // Fallback: audio context already exists or not supported
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (ctxRef.current?.state !== 'closed') {
        try { ctxRef.current?.close(); } catch {}
      }
    };
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    function draw() {
      if (!canvas) return;
      const w = canvas.offsetWidth * dpr;
      const h = canvas.offsetHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);

      const isAudioPlaying = audioRef?.current && !audioRef.current.paused;

      // Get frequency data
      let dataArray = null;
      if (isAudioPlaying && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
      }

      const barW = (w - (barCount - 1) * 2) / barCount;
      const barH = h - 5;

      // Draw progress background
      const duration = audioRef?.current?.duration || 0;
      const currentTime = audioRef?.current?.currentTime || 0;
      const progress = duration > 0 ? currentTime / duration : 0;

      for (let i = 0; i < barCount; i++) {
        let val = 0;
        if (dataArray) {
          const idx = Math.floor((i / barCount) * dataArray.length);
          val = dataArray[idx] / 255;
        } else if (isPlaying && !dataArray) {
          // Animated fallback when playing but no analyzer
          val = 0.2 + Math.sin(Date.now() / 200 + i) * 0.15;
        } else if (isPlaying) {
          // Still loading analyzer, gentle pulse
          val = 0.1 + Math.sin(Date.now() / 300 + i * 0.5) * 0.1;
        } else {
          // Static small bars when idle
          val = 0.05 + (Math.sin(i * 0.8) * 0.5 + 0.5) * 0.1;
        }

        const x = i * (barW + 2);
        const barHeight = Math.max(3, val * barH);

        // Determine color based on progress
        const barProgress = i / barCount;
        let barColor;
        if (barProgress <= progress) {
          barColor = progressColor;
        } else {
          barColor = color;
        }

        const opacity = isPlaying ? 0.9 : 0.35;
        ctx.fillStyle = barColor;
        ctx.globalAlpha = opacity;
        // Round top corners
        const radius = Math.min(3, barW / 2);
        const y = h - barHeight;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barW - radius, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
        ctx.lineTo(x + barW, h);
        ctx.lineTo(x, h);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      }

      // Progress line
      if (progress > 0 && progress < 1) {
        const lineX = progress * w;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, h);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [audioRef, isPlaying, barCount, height, color, progressColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, borderRadius: 'var(--radius-sm)' }}
    />
  );
}
