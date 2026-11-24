import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Users, Bot } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, rand, useAnimationFrame, useHiDPI, useKeys } from './engine';

const W = 960;
const H = 540;
const PADDLE_H = 96;
const PADDLE_W = 14;
const WIN_SCORE = 7;

export default function CyberPong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useKeys();
  const [started, setStarted] = useState(false);
  const [twoPlayer, setTwoPlayer] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<string | null>(null);

  const g = useRef({
    p1: H / 2,
    p2: H / 2,
    ball: { x: W / 2, y: H / 2, vx: 330, vy: 190, r: 10 },
    s1: 0,
    s2: 0,
    serveTimer: 0,
    rally: 0,
    t: 0,
    trail: [] as { x: number; y: number }[],
    flash: 0,
    shake: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    aiTarget: H / 2,
  });

  const serve = (dir: number) => {
    const s = g.current;
    s.ball = {
      x: W / 2,
      y: H / 2,
      vx: 330 * dir,
      vy: rand(-160, 160),
      r: 10,
    };
    s.trail = [];
    s.rally = 0;
  };

  const reset = useCallback(() => {
    const s = g.current;
    s.p1 = H / 2;
    s.p2 = H / 2;
    s.s1 = 0;
    s.s2 = 0;
    s.serveTimer = 0;
    s.rally = 0;
    s.particles = [];
    serve(Math.random() > 0.5 ? 1 : -1);
    setScores({ p1: 0, p2: 0 });
    setWinner(null);
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !winner) {
      s.t += dt;
      s.flash = Math.max(0, s.flash - dt);
      s.shake = Math.max(0, s.shake - dt);
      const k = keys.current;

      // player 1
      let p1dir = 0;
      if (k['w']) p1dir -= 1;
      if (k['s']) p1dir += 1;
      s.p1 = clamp(s.p1 + p1dir * 520 * dt, PADDLE_H / 2, H - PADDLE_H / 2);

      // player 2 / AI
      if (twoPlayer) {
        let p2dir = 0;
        if (k['arrowup']) p2dir -= 1;
        if (k['arrowdown']) p2dir += 1;
        s.p2 = clamp(s.p2 + p2dir * 520 * dt, PADDLE_H / 2, H - PADDLE_H / 2);
      } else {
        const target = s.ball.vx > 0 ? s.ball.y : H / 2;
        s.aiTarget += (target - s.aiTarget) * Math.min(1, dt * 4.4);
        s.p2 = clamp(s.p2 + (s.aiTarget - s.p2) * Math.min(1, dt * 7), PADDLE_H / 2, H - PADDLE_H / 2);
      }

      // ball
      s.ball.x += s.ball.vx * dt;
      s.ball.y += s.ball.vy * dt;
      s.trail.push({ x: s.ball.x, y: s.ball.y });
      if (s.trail.length > 16) s.trail.shift();

      if (s.ball.y - s.ball.r < 0) {
        s.ball.y = s.ball.r;
        s.ball.vy = Math.abs(s.ball.vy);
        sfx.playTone(560, 0.04, 'square', 0.05);
      }
      if (s.ball.y + s.ball.r > H) {
        s.ball.y = H - s.ball.r;
        s.ball.vy = -Math.abs(s.ball.vy);
        sfx.playTone(560, 0.04, 'square', 0.05);
      }

      const hitPaddle = (paddleX: number, paddleY: number, isLeft: boolean) => {
        const px = paddleX + PADDLE_W / 2;
        if (isLeft ? s.ball.vx < 0 : s.ball.vx > 0) {
          const withinX = Math.abs(s.ball.x - px) < PADDLE_W / 2 + s.ball.r + 4;
          const withinY = Math.abs(s.ball.y - paddleY) < PADDLE_H / 2 + s.ball.r;
          if (withinX && withinY) {
            const rel = (s.ball.y - paddleY) / (PADDLE_H / 2);
            const speed = Math.min(880, Math.hypot(s.ball.vx, s.ball.vy) * 1.055 + 12);
            const angle = clamp(rel, -1, 1) * 0.95;
            s.ball.vx = (isLeft ? 1 : -1) * Math.cos(angle) * speed;
            s.ball.vy = Math.sin(angle) * speed;
            s.ball.x = px + (isLeft ? 1 : -1) * (PADDLE_W / 2 + s.ball.r + 4);
            s.rally += 1;
            s.flash = 0.2;
            sfx.playTone(420 + s.rally * 30, 0.06, 'square', 0.07, 720);
            return true;
          }
        }
        return false;
      };

      hitPaddle(46, s.p1, true);
      hitPaddle(W - 46, s.p2, false);

      // scoring
      if (s.ball.x < -20) {
        s.s2 += 1;
        setScores({ p1: s.s1, p2: s.s2 });
        s.shake = 0.5;
        sfx.coin();
        if (s.s2 >= WIN_SCORE) setWinner(twoPlayer ? 'Player 2' : 'Cyber AI');
        else serve(1);
      }
      if (s.ball.x > W + 20) {
        s.s1 += 1;
        setScores({ p1: s.s1, p2: s.s2 });
        s.shake = 0.5;
        sfx.coin();
        if (s.s1 >= WIN_SCORE) setWinner('Player 1');
        else serve(-1);
      }

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
    }

    // ---------------- RENDER ----------------
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, W, H);

    // arena grid
    ctx.strokeStyle = 'rgba(56,189,248,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // center line
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 18]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(56,189,248,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    const sh = s.shake > 0 ? (Math.random() - 0.5) * 8 : 0;

    // paddles
    const drawPaddle = (x: number, cy: number, color: string) => {
      ctx.save();
      ctx.translate(x + sh, cy);
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-PADDLE_W / 2, -PADDLE_H / 2, PADDLE_W, PADDLE_H, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.roundRect(-PADDLE_W / 2 + 3, -PADDLE_H / 2 + 6, 3, PADDLE_H - 12, 2);
      ctx.fill();
      ctx.restore();
    };
    drawPaddle(46, s.p1, '#22d3ee');
    drawPaddle(W - 46, s.p2, twoPlayer ? '#f43f5e' : '#a855f7');

    // trail
    for (let i = 0; i < s.trail.length; i++) {
      const p = s.trail[i];
      ctx.globalAlpha = (i / s.trail.length) * 0.4;
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.ball.r * (0.4 + (i / s.trail.length) * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ball
    const bg = ctx.createRadialGradient(s.ball.x, s.ball.y, 2, s.ball.x, s.ball.y, s.ball.r * 2.6);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.4, '#7dd3fc');
    bg.addColorStop(1, 'rgba(125,211,252,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, s.ball.r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
    ctx.fill();

    // scores
    ctx.font = 'bold 74px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(34,211,238,0.85)';
    ctx.fillText(`${s.s1}`, W / 2 - 110, 96);
    ctx.fillStyle = 'rgba(244,63,94,0.85)';
    ctx.fillText(`${s.s2}`, W / 2 + 110, 96);

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.6)';
    ctx.fillText(twoPlayer ? 'PLAYER 1 — W / S' : 'YOU — W / S', W / 2 - 110, 120);
    ctx.fillText(twoPlayer ? 'PLAYER 2 — ↑ / ↓' : 'CYBER AI', W / 2 + 110, 120);

    if (s.rally > 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(251,191,36,${0.7 + Math.sin(s.t * 8) * 0.2})`;
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText(`${s.rally} HIT RALLY`, W / 2, H - 34);
    }

    if (s.flash > 0) {
      ctx.fillStyle = `rgba(125,211,252,${s.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050814]">
      <canvas ref={canvasRef} className="h-full w-full" />

      {started && !winner && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-white/10 bg-black/50 p-1 backdrop-blur">
          <button
            onClick={() => {
              setTwoPlayer(false);
              reset();
            }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${
              !twoPlayer ? 'bg-violet-500/30 text-violet-200' : 'text-slate-400'
            }`}
          >
            <Bot size={11} /> vs AI
          </button>
          <button
            onClick={() => {
              setTwoPlayer(true);
              reset();
            }}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${
              twoPlayer ? 'bg-rose-500/30 text-rose-200' : 'text-slate-400'
            }`}
          >
            <Users size={11} /> 2P
          </button>
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-slate-950/90 via-indigo-950/85 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              🏓 Local Multiplayer
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Cyber Pong Duel</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Plasma table tennis for one or two players on the same keyboard. First to 7 takes the arena.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => {
                  setTwoPlayer(false);
                  setStarted(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-violet-900/40 transition-transform hover:scale-105"
              >
                <Bot size={16} /> Play vs AI
              </button>
              <button
                onClick={() => {
                  setTwoPlayer(true);
                  setStarted(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition-transform hover:scale-105"
              >
                <Users size={16} /> 2 Players
              </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-400">P1: W / S · P2: ↑ / ↓</p>
          </div>
        </div>
      )}

      {winner && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🏆</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">{winner} Wins!</h3>
            <p className="mt-1 text-xs text-slate-300">
              {scores.p1} — {scores.p2}
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Rematch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
