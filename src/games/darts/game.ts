import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const DARTS_PER_ROUND = 3;
/** Seconds a dart takes to fly from the oche to the board. */
export const FLIGHT_TIME = 0.45;
export const BOARD = { x: WIDTH / 2, y: 240, radius: 170 } as const;
/** Where a thrown dart leaves from: just below the bottom of the screen. */
export const THROW_FROM = { x: WIDTH / 2, y: HEIGHT + 40 } as const;

/** Ring edges, in pixels from the centre of the board. */
export const RINGS = {
  bull: 7,
  outerBull: 16,
  tripleInner: 99,
  tripleOuter: 107,
  doubleInner: 162,
  doubleOuter: BOARD.radius,
} as const;

/** The board's numbers, clockwise from the top. */
export const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SECTOR_ANGLE = (Math.PI * 2) / SECTORS.length;

export interface Dart {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. The dart lands once this reaches FLIGHT_TIME. */
  age: number;
  /** Points scored, set when the dart lands. */
  points: number | null;
}

export interface DartsState {
  /** Seconds the round has run; the aim sweeps across the board with it. */
  time: number;
  darts: Dart[];
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): DartsState {
  return { time: 0, darts: [], score: 0, phase: 'playing' };
}

/** Where the aim is at `time`: it sweeps across the board and a little past its edge. */
export function aimAt(time: number): { x: number; y: number } {
  const reach = BOARD.radius * 1.1;
  return {
    x: BOARD.x + reach * Math.sin(time * 1.9),
    y: BOARD.y + reach * Math.sin(time * 2.7 + 1),
  };
}

/** The board number for a point, from its angle around the centre. */
export function sectorAt(x: number, y: number): number {
  // Clockwise from straight up, shifted half a sector so 20 sits centred at the top.
  const angle = Math.atan2(x - BOARD.x, BOARD.y - y) + SECTOR_ANGLE / 2;
  const turn = Math.PI * 2;
  const index = Math.floor((((angle % turn) + turn) % turn) / SECTOR_ANGLE);
  return SECTORS[index % SECTORS.length];
}

/** Points for a dart that lands at (x, y). */
export function scoreAt(x: number, y: number): number {
  const distance = Math.hypot(x - BOARD.x, y - BOARD.y);
  if (distance <= RINGS.bull) return 50;
  if (distance <= RINGS.outerBull) return 25;
  if (distance > RINGS.doubleOuter) return 0;
  const sector = sectorAt(x, y);
  if (distance >= RINGS.doubleInner) return sector * 2;
  if (distance >= RINGS.tripleInner && distance <= RINGS.tripleOuter) return sector * 3;
  return sector;
}

/** Darts thrown so far, in the air or on the board. */
export function dartsLeft(state: DartsState): number {
  return DARTS_PER_ROUND - state.darts.length;
}

/** Throws a dart at the current aim. Returns false if nothing was thrown. */
export function throwDart(state: DartsState): boolean {
  if (state.phase !== 'playing' || dartsLeft(state) === 0) return false;
  // One dart in the air at a time.
  if (state.darts.some((dart) => dart.points === null)) return false;
  const aim = aimAt(state.time);
  state.darts.push({
    fromX: THROW_FROM.x,
    fromY: THROW_FROM.y,
    toX: aim.x,
    toY: aim.y,
    age: 0,
    points: null,
  });
  return true;
}

/** Where a dart is drawn: on its way to the board, or stuck in it. */
export function dartPosition(dart: Dart): { x: number; y: number; progress: number } {
  const progress = Math.min(dart.age / FLIGHT_TIME, 1);
  // A little arc, so the dart rises and drops on its way in.
  const lift = Math.sin(progress * Math.PI) * 60;
  return {
    x: dart.fromX + (dart.toX - dart.fromX) * progress,
    y: dart.fromY + (dart.toY - dart.fromY) * progress - lift,
    progress,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: DartsState, dt: number): void {
  if (state.phase !== 'playing') return;
  state.time += dt;

  for (const dart of state.darts) {
    if (dart.points !== null) continue;
    dart.age += dt;
    if (dart.age >= FLIGHT_TIME) {
      dart.points = scoreAt(dart.toX, dart.toY);
      state.score += dart.points;
    }
  }

  if (dartsLeft(state) === 0 && state.darts.every((dart) => dart.points !== null)) {
    state.phase = 'over';
  }
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  const { colors } = theme;
  const ring = (outer: number, inner: number, even: string, odd: string) => {
    SECTORS.forEach((_, i) => {
      const start = -Math.PI / 2 - SECTOR_ANGLE / 2 + i * SECTOR_ANGLE;
      ctx.fillStyle = i % 2 === 0 ? even : odd;
      ctx.beginPath();
      ctx.arc(BOARD.x, BOARD.y, outer, start, start + SECTOR_ANGLE);
      ctx.arc(BOARD.x, BOARD.y, inner, start + SECTOR_ANGLE, start, true);
      ctx.closePath();
      ctx.fill();
    });
  };

  // The surround, where the numbers sit.
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.arc(BOARD.x, BOARD.y, BOARD.radius + 30, 0, Math.PI * 2);
  ctx.fill();

  ring(RINGS.doubleOuter, RINGS.doubleInner, colors.stripeA, colors.water);
  ring(RINGS.doubleInner, RINGS.tripleOuter, colors.background, colors.stripeB);
  ring(RINGS.tripleOuter, RINGS.tripleInner, colors.stripeA, colors.water);
  ring(RINGS.tripleInner, RINGS.outerBull, colors.background, colors.stripeB);

  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.arc(BOARD.x, BOARD.y, RINGS.outerBull, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.arc(BOARD.x, BOARD.y, RINGS.bull, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  SECTORS.forEach((number, i) => {
    const angle = -Math.PI / 2 + i * SECTOR_ANGLE;
    const r = BOARD.radius + 16;
    ctx.fillText(String(number), BOARD.x + Math.cos(angle) * r, BOARD.y + Math.sin(angle) * r);
  });
  ctx.textBaseline = 'alphabetic';
}

function drawDart(ctx: CanvasRenderingContext2D, dart: Dart) {
  const { colors } = theme;
  const { x, y, progress } = dartPosition(dart);
  // The dart shrinks as it flies away from the player.
  const scale = 2.2 - 1.2 * progress;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = colors.muted;
  ctx.fillRect(-1, 0, 2, 6);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(-2, 6, 4, 14);
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(-7, 30);
  ctx.lineTo(7, 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (dart.points !== null) {
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(dart.points), x, y - 8);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: DartsState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  drawBoard(ctx);
  for (const dart of state.darts) drawDart(ctx, dart);

  if (state.phase === 'playing' && dartsLeft(state) > 0) {
    const aim = aimAt(state.time);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
    ctx.moveTo(aim.x - 16, aim.y);
    ctx.lineTo(aim.x + 16, aim.y);
    ctx.moveTo(aim.x, aim.y - 16);
    ctx.lineTo(aim.x, aim.y + 16);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Darts ${dartsLeft(state)}/${DARTS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Three darts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Press Space to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const darts: CarnivalGame = {
  id: 'darts',
  name: 'Darts',
  description:
    'Press Space to throw three darts at the board. Doubles, trebles and the bull score big.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      // Keep Space from scrolling the page.
      event.preventDefault();
      if (event.repeat) return;
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwDart(state);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(darts.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
    };
  },
};

export default darts;
