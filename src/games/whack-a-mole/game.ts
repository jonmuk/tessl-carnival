import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_WHACK = 10;
export const HOLE_RADIUS = 48;
const COLUMNS = [200, 400, 600];
const ROWS = [150, 270, 390];

/** How often a mole pops up, in seconds: every 1 s at the start, every 0.4 s at the end. */
const SPAWN_START = 1;
const SPAWN_END = 0.4;
/** How long a mole stays up, in seconds: 1.2 s at the start, 0.6 s at the end. */
const UP_START = 1.2;
const UP_END = 0.6;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole stays up; 0 when the hole is empty. */
  upFor: number;
  /** Seconds since the mole in this hole was whacked, or undefined. */
  whackedAgo?: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  elapsed: number;
  untilNextMole: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = ROWS.flatMap((y) => COLUMNS.map((x) => ({ x, y, upFor: 0 })));
  return { holes, elapsed: 0, untilNextMole: SPAWN_START, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 to 1. */
function progress(elapsed: number): number {
  return Math.min(Math.max(elapsed / ROUND_SECONDS, 0), 1);
}

/** Seconds between moles; shrinks as the round goes on. */
export function spawnInterval(elapsed: number): number {
  return SPAWN_START + (SPAWN_END - SPAWN_START) * progress(elapsed);
}

/** Seconds a mole stays up; shrinks as the round goes on. */
export function upTime(elapsed: number): number {
  return UP_START + (UP_END - UP_START) * progress(elapsed);
}

export function timeLeft(state: WhackAMoleState): number {
  return Math.max(ROUND_SECONDS - state.elapsed, 0);
}

/** Whacks at a point on the canvas. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => h.upFor > 0 && Math.hypot(x - h.x, y - h.y) <= HOLE_RADIUS);
  if (!hole) return false;
  hole.upFor = 0;
  hole.whackedAgo = 0;
  state.score += POINTS_PER_WHACK;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` returns a number in [0, 1) and
 * picks which empty hole the next mole pops up from.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random) {
  if (state.phase !== 'playing') return;
  state.elapsed += dt;

  for (const hole of state.holes) {
    hole.upFor = Math.max(hole.upFor - dt, 0);
    if (hole.whackedAgo !== undefined) {
      hole.whackedAgo += dt;
      if (hole.whackedAgo > 0.3) hole.whackedAgo = undefined;
    }
  }

  if (state.elapsed >= ROUND_SECONDS) {
    for (const hole of state.holes) hole.upFor = 0;
    state.phase = 'over';
    return;
  }

  state.untilNextMole -= dt;
  if (state.untilNextMole <= 0) {
    const empty = state.holes.filter((h) => h.upFor === 0 && h.whackedAgo === undefined);
    if (empty.length > 0) {
      empty[Math.floor(random() * empty.length)].upFor = upTime(state.elapsed);
    }
    state.untilNextMole += spawnInterval(state.elapsed);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The counter the holes sit in.
  ctx.fillStyle = colors.surface;
  ctx.fillRect(100, 80, WIDTH - 200, 370);

  for (const hole of state.holes) {
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.upFor > 0) {
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 32, Math.PI, 0);
      ctx.lineTo(hole.x + 32, hole.y + 20);
      ctx.lineTo(hole.x - 32, hole.y + 20);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(hole.x - 11, hole.y - 10, 5, 0, Math.PI * 2);
      ctx.arc(hole.x + 11, hole.y - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y + 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hole.whackedAgo !== undefined) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - hole.whackedAgo / 0.3;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 20 + hole.whackedAgo * 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(timeLeft(state))}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
