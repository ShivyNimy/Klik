import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy, Zap } from 'lucide-react';
import { sfx } from '../utils/sound';
import { clamp, useAnimationFrame, useHiDPI } from './engine';

const W = 960;
const H = 540;
const COLS = 10;
const ROWS = 20;
const CELL = 24;
const BOARD_X = (W - COLS * CELL) / 2;
const BOARD_Y = 20;

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
];
const COLORS = ['#22d3ee', '#a855f7', '#f472b6', '#fbbf24', '#4ade80', '#818cf8', '#fb7185'];

export default function HexaBlocks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, best: 0 });
  const keysRef = useRef<Record<string, boolean>>({});

  const g = useRef({
    board: [] as number[][],
    piece: null as { shape: number[][]; color: number; x: number; y: number } | null,
    next: 0,
    dropTimer: 0,
    dropSpeed: 0.75,
    score: 0,
    lines: 0,
    level: 1,
    best: 0,
    t: 0,
    clearFlash: 0,
    shake: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    softDrop: false,
  });

  const newPiece = (idx: number) => {
    const shape = SHAPES[idx].map((r) => [...r]);
    return {
      shape,
      color: idx,
      x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
      y: 0,
    };
  };

  const reset = useCallback(() => {
    const s = g.current;
    s.board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    s.next = Math.floor(Math.random() * SHAPES.length);
    s.piece = newPiece(Math.floor(Math.random() * SHAPES.length));
    s.dropTimer = 0;
    s.dropSpeed = 0.75;
    s.score = 0;
    s.lines = 0;
    s.level = 1;
    s.clearFlash = 0;
    s.particles = [];
    setOver(false);
    setHud({ score: 0, lines: 0, level: 1, best: s.best });
  }, []);

  useEffect(() => {
    if (started) reset();
  }, [started, reset]);

  useHiDPI(canvasRef, W, H);

  const collide = (shape: number[][], px: number, py: number, board: number[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = px + c;
        const y = py + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x] !== -1) return true;
      }
    }
    return false;
  };

  const lockPiece = () => {
    const s = g.current;
    if (!s.piece) return;
    const { shape, color, x, y } = s.piece;
    shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v && y + r >= 0) s.board[y + r][x + c] = color;
      })
    );
    // clear lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (s.board[r].every((v) => v !== -1)) {
        s.board.splice(r, 1);
        s.board.unshift(Array(COLS).fill(-1));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      const pts = [0, 100, 300, 500, 800][cleared] * s.level;
      s.score += pts;
      s.lines += cleared;
      s.level = 1 + Math.floor(s.lines / 10);
      s.dropSpeed = Math.max(0.09, 0.75 - (s.level - 1) * 0.06);
      s.clearFlash = 0.35;
      s.shake = 0.25;
      cleared === 4 ? sfx.powerup() : sfx.coin();
      for (let i = 0; i < 24; i++) {
        s.particles.push({
          x: BOARD_X + Math.random() * COLS * CELL,
          y: BOARD_Y + Math.random() * ROWS * CELL,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.5) * 260,
          life: 0.5,
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    } else {
      sfx.playNoise(0.06, 0.05, 500);
    }

    s.piece = newPiece(s.next);
    s.next = Math.floor(Math.random() * SHAPES.length);
    if (collide(s.piece.shape, s.piece.x, s.piece.y, s.board)) {
      s.best = Math.max(s.best, s.score);
      setHud({ score: s.score, lines: s.lines, level: s.level, best: s.best });
      setOver(true);
      sfx.gameOver();
    }
    setHud({ score: s.score, lines: s.lines, level: s.level, best: s.best });
  };

  const rotate = () => {
    const s = g.current;
    if (!s.piece) return;
    const shape = s.piece.shape;
    const rotated = shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collide(rotated, s.piece.x + kick, s.piece.y, s.board)) {
        s.piece.shape = rotated;
        s.piece.x += kick;
        sfx.playTone(520, 0.04, 'triangle', 0.05);
        return;
      }
    }
  };

  const move = (dx: number) => {
    const s = g.current;
    if (!s.piece) return;
    if (!collide(s.piece.shape, s.piece.x + dx, s.piece.y, s.board)) {
      s.piece.x += dx;
      sfx.playTone(300, 0.03, 'sine', 0.04);
    }
  };

  const hardDrop = () => {
    const s = g.current;
    if (!s.piece) return;
    let dropped = 0;
    while (!collide(s.piece.shape, s.piece.x, s.piece.y + 1, s.board)) {
      s.piece.y += 1;
      dropped++;
    }
    s.score += dropped * 2;
    sfx.playNoise(0.1, 0.09, 320);
    lockPiece();
  };

  useEffect(() => {
    if (!started) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'arrowleft') move(-1);
      if (k === 'arrowright') move(1);
      if (k === 'arrowup' || k === 'w') rotate();
      if (k === 'arrowdown' || k === 's') {
        const s = g.current;
        if (s.piece && !collide(s.piece.shape, s.piece.x, s.piece.y + 1, s.board)) {
          s.piece.y += 1;
          s.score += 1;
        }
      }
      if (k === ' ') hardDrop();
    };
    const up = (e: KeyboardEvent) => (keysRef.current[e.key.toLowerCase()] = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = g.current;

    if (started && !over) {
      s.t += dt;
      s.clearFlash = Math.max(0, s.clearFlash - dt);
      s.shake = Math.max(0, s.shake - dt);
      s.dropTimer += dt;
      if (s.dropTimer > s.dropSpeed) {
        s.dropTimer = 0;
        if (s.piece) {
          if (!collide(s.piece.shape, s.piece.x, s.piece.y + 1, s.board)) s.piece.y += 1;
          else lockPiece();
        }
      }
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
      if (Math.floor(s.t * 4) % 2 === 0) {
        setHud({ score: s.score, lines: s.lines, level: s.level, best: s.best });
      }
    }

    // ---------------- RENDER ----------------
    ctx.fillStyle = '#0b0718';
    ctx.fillRect(0, 0, W, H);
    // backdrop
    const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.7);
    bg.addColorStop(0, 'rgba(124,58,237,0.18)');
    bg.addColorStop(1, 'rgba(10,6,24,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const shx = s.shake > 0 ? (Math.random() - 0.5) * 8 : 0;

    // board frame
    ctx.save();
    ctx.translate(shx, 0);
    ctx.fillStyle = 'rgba(10,8,26,0.9)';
    ctx.beginPath();
    ctx.roundRect(BOARD_X - 10, BOARD_Y - 10, COLS * CELL + 20, ROWS * CELL + 20, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // grid
    ctx.strokeStyle = 'rgba(148,163,184,0.06)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * CELL, BOARD_Y);
      ctx.lineTo(BOARD_X + c * CELL, BOARD_Y + ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * CELL);
      ctx.lineTo(BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
      ctx.stroke();
    }

    const drawCell = (x: number, y: number, color: string, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x + 4, y + 4, CELL - 8, 3);
      ctx.globalAlpha = 1;
    };

    // settled blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = s.board[r]?.[c];
        if (v >= 0) drawCell(BOARD_X + c * CELL, BOARD_Y + r * CELL, COLORS[v]);
      }
    }

    // ghost + active piece
    if (s.piece && !over) {
      let gy = s.piece.y;
      while (!collide(s.piece.shape, s.piece.x, gy + 1, s.board)) gy++;
      s.piece.shape.forEach((row, r) =>
        row.forEach((v, c) => {
          if (!v) return;
          const gx = BOARD_X + (s.piece!.x + c) * CELL;
          const gyy = BOARD_Y + (gy + r) * CELL;
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(gx + 2, gyy + 2, CELL - 4, CELL - 4, 4);
          ctx.stroke();
        })
      );
      s.piece.shape.forEach((row, r) =>
        row.forEach((v, c) => {
          if (!v) return;
          drawCell(
            BOARD_X + (s.piece!.x + c) * CELL,
            BOARD_Y + (s.piece!.y + r) * CELL,
            COLORS[s.piece!.color]
          );
        })
      );
    }

    for (const p of s.particles) {
      ctx.globalAlpha = clamp(p.life / 0.5, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // side panel
    const panelX = BOARD_X + COLS * CELL + 40;
    ctx.fillStyle = 'rgba(18,14,38,0.92)';
    ctx.beginPath();
    ctx.roundRect(panelX, BOARD_Y, 250, 240, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.3)';
    ctx.stroke();

    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NEXT', panelX + 18, BOARD_Y + 26);

    // next preview
    const nextShape = SHAPES[s.next];
    const previewCell = 20;
    const offsetX = panelX + 18;
    const offsetY = BOARD_Y + 40;
    nextShape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (!v) return;
        ctx.fillStyle = COLORS[s.next];
        ctx.beginPath();
        ctx.roundRect(offsetX + c * previewCell, offsetY + r * previewCell, previewCell - 2, previewCell - 2, 3);
        ctx.fill();
      })
    );

    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('SCORE', panelX + 18, BOARD_Y + 130);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText(s.score.toLocaleString(), panelX + 18, BOARD_Y + 156);
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('LINES', panelX + 18, BOARD_Y + 186);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(`${s.lines}`, panelX + 18, BOARD_Y + 208);
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('LEVEL', panelX + 130, BOARD_Y + 186);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(`${s.level}`, panelX + 130, BOARD_Y + 208);

    ctx.fillStyle = 'rgba(18,14,38,0.92)';
    ctx.beginPath();
    ctx.roundRect(panelX, BOARD_Y + 258, 250, 200, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.25)';
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Inter, sans-serif';
    const controls = [
      ['← →', 'Move piece'],
      ['↑ / W', 'Rotate'],
      ['↓ / S', 'Soft drop'],
      ['SPACE', 'Hard drop'],
    ];
    controls.forEach(([k, v], i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(panelX + 16, BOARD_Y + 276 + i * 40, 74, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(k, panelX + 53, BOARD_Y + 293 + i * 40);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(v, panelX + 100, BOARD_Y + 293 + i * 40);
    });

    if (s.clearFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${s.clearFlash * 0.35})`;
      ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    }
  }, true);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0718]">
      <canvas ref={canvasRef} className="h-full w-full" />

      {started && !over && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <div className="pointer-events-none rounded-t-lg border border-b-0 border-white/10 bg-black/50 px-3 py-1 text-[10px] font-bold text-slate-400 backdrop-blur">
            ← → move · ↑ rotate · Space hard drop
          </div>
        </div>
      )}

      {!started && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-purple-950/85 via-slate-950/90 to-black p-6 text-center">
          <div className="animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300">
              🎮 Block Puzzle
            </div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">Neon Block Blitz</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300">
              Stack the glowing tetrominoes, clear full rows and survive the speed-up. Quad clears send your score
              into overdrive.
            </p>
            <button
              onClick={() => setStarted(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-7 py-3 text-sm font-black text-white shadow-xl shadow-purple-900/40 transition-transform hover:scale-105"
            >
              <Play size={17} className="fill-white" /> Start Stacking
            </button>
            <div className="mt-3 flex justify-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Zap size={10} className="text-purple-400" /> Speed levels
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={10} className="text-amber-400" /> High score
              </span>
            </div>
          </div>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="animate-pop-in">
            <div className="text-4xl">🧩</div>
            <h3 className="mt-2 font-display text-2xl font-black text-white">Blocks Overflowed</h3>
            <p className="mt-1 text-xs text-slate-300">
              {hud.score.toLocaleString()} pts · {hud.lines} lines · level {hud.level}
            </p>
            <button
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-black text-white shadow-lg"
            >
              <RotateCcw size={15} /> Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
