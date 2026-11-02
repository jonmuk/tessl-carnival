import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** The stream: two straights joined by half circles, as a loop. */
export const STREAM = { left: 160, right: 640, top: 190, bottom: 370 } as const;
const BEND_RADIUS = (STREAM.bottom - STREAM.top) / 2;
const STRAIGHT = STREAM.right - STREAM.left;
export const STREAM_LENGTH = 2 * STRAIGHT + 2 * Math.PI * BEND_RADIUS;
export const DUCK_SPEED = 110;
export const DUCK_RADIUS = 22;
/** The numbers on the ducks' bases, one duck each, in order round the stream. */
export const DUCK_VALUES = [10, 20, 10, 50, 10, 30, 10, 20, 10, 100] as const;
/** The hook hangs here between casts, and drops to the near straight of the stream. */
export const ROD_Y = 70;
export const WATER_Y = STREAM.bottom;
/** Seconds the hook takes to drop to the water, and again to come back up. */
export const DROP_TIME = 0.4;
export const CATCH_RADIUS = 26;
const SHOW_CATCH_TIME = 1;

export interface Duck {
  /** Distance travelled round the stream, in pixels from the start of the near straight. */
  along: number;
  value: number;
}

export interface Hook {
  x: number;
  /** 'up' waits for a cast, 'down' is dropping, 'rising' is coming back with or without a duck. */
  mode: 'up' | 'down' | 'rising';
  /** 0 is at the rod, 1 is at the water. */
  depth: number;
  caught?: Duck;
}

export interface Catch {
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  casts: number;
  score: number;
  /** The last duck caught, shown with its number for a moment. */
  lastCatch?: Catch;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const spacing = STREAM_LENGTH / DUCK_VALUES.length;
  return {
    ducks: DUCK_VALUES.map((value, i) => ({ along: i * spacing, value })),
    hook: { x: WIDTH / 2, mode: 'up', depth: 0 },
    casts: CASTS,
    score: 0,
    phase: 'playing',
  };
}

/** Where a duck is on the canvas. The near straight runs left to right. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  let d = ((duck.along % STREAM_LENGTH) + STREAM_LENGTH) % STREAM_LENGTH;
  if (d < STRAIGHT) return { x: STREAM.left + d, y: STREAM.bottom };
  d -= STRAIGHT;
  const bend = Math.PI * BEND_RADIUS;
  const middle = (STREAM.top + STREAM.bottom) / 2;
  if (d < bend) {
    const angle = Math.PI / 2 - d / BEND_RADIUS;
    return {
      x: STREAM.right + Math.cos(angle) * BEND_RADIUS,
      y: middle + Math.sin(angle) * BEND_RADIUS,
    };
  }
  d -= bend;
  if (d < STRAIGHT) return { x: STREAM.right - d, y: STREAM.top };
  d -= STRAIGHT;
  const angle = -Math.PI / 2 - d / BEND_RADIUS;
  return {
    x: STREAM.left + Math.cos(angle) * BEND_RADIUS,
    y: middle + Math.sin(angle) * BEND_RADIUS,
  };
}

/** Moves the hook along the rod, when it is not in the water. */
export function moveHook(state: HookADuckState, x: number): void {
  if (state.hook.mode !== 'up') return;
  state.hook.x = Math.min(Math.max(x, STREAM.left), STREAM.right);
}

/** Lowers the hook. Returns false if it could not cast. */
export function cast(state: HookADuckState): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook.mode !== 'up') return false;
  state.hook.mode = 'down';
  state.casts -= 1;
  return true;
}

/** The duck under the hook when it reaches the water, if there is one. */
export function duckUnderHook(state: HookADuckState): Duck | undefined {
  return state.ducks.find((duck) => {
    const { x, y } = duckPosition(duck);
    return Math.hypot(x - state.hook.x, y - WATER_Y) <= CATCH_RADIUS;
  });
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.along = (duck.along + DUCK_SPEED * dt) % STREAM_LENGTH;
  }

  const { hook } = state;
  if (hook.mode === 'down') {
    hook.depth = Math.min(hook.depth + dt / DROP_TIME, 1);
    if (hook.depth === 1) {
      const duck = duckUnderHook(state);
      if (duck) {
        hook.caught = duck;
        state.ducks = state.ducks.filter((d) => d !== duck);
      }
      hook.mode = 'rising';
    }
  } else if (hook.mode === 'rising') {
    hook.depth = Math.max(hook.depth - dt / DROP_TIME, 0);
    if (hook.depth === 0) {
      if (hook.caught) {
        state.score += hook.caught.value;
        state.lastCatch = { value: hook.caught.value, age: 0 };
        // Put the duck back in the stream, opposite the hook.
        state.ducks.push({ ...hook.caught, along: hook.caught.along + STREAM_LENGTH / 2 });
        hook.caught = undefined;
      }
      hook.mode = 'up';
    }
  }

  if (state.lastCatch) {
    state.lastCatch.age += dt;
    if (state.lastCatch.age >= SHOW_CATCH_TIME) state.lastCatch = undefined;
  }

  if (state.casts === 0 && hook.mode === 'up') state.phase = 'over';
}

function hookY(hook: Hook): number {
  return ROD_Y + (WATER_Y - ROD_Y) * hook.depth;
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.5, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.danger;
  ctx.beginPath();
  ctx.moveTo(x + DUCK_RADIUS * 0.9, y - DUCK_RADIUS * 0.75);
  ctx.lineTo(x + DUCK_RADIUS * 1.3, y - DUCK_RADIUS * 0.6);
  ctx.lineTo(x + DUCK_RADIUS * 0.9, y - DUCK_RADIUS * 0.5);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.6, y - DUCK_RADIUS * 0.8, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream, a loop of water inside a wooden trough.
  const middle = (STREAM.top + STREAM.bottom) / 2;
  const traceLoop = () => {
    ctx.beginPath();
    ctx.arc(STREAM.left, middle, BEND_RADIUS, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.arc(STREAM.right, middle, BEND_RADIUS, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  };
  ctx.lineCap = 'round';
  traceLoop();
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 66;
  ctx.stroke();
  traceLoop();
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 50;
  ctx.stroke();

  for (const duck of state.ducks) {
    const { x, y } = duckPosition(duck);
    drawDuck(ctx, x, y);
  }

  // The rod and the hook on its line.
  const { hook } = state;
  const y = hookY(hook);
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(STREAM.left - 60, ROD_Y - 10);
  ctx.lineTo(STREAM.right + 60, ROD_Y - 10);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, ROD_Y - 10);
  ctx.lineTo(hook.x, y);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x - 6, y, 6, 0, Math.PI);
  ctx.stroke();
  if (hook.caught) drawDuck(ctx, hook.x, y + DUCK_RADIUS);

  if (state.lastCatch) {
    ctx.globalAlpha = 1 - state.lastCatch.age / SHOW_CATCH_TIME;
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(`+${state.lastCatch.value}`, WIDTH / 2, middle + 10);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Lower the hook to catch a rubber duck. The number on its base is your score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onMove = (event: PointerEvent) => moveHook(state, toCanvasX(event));
    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        moveHook(state, toCanvasX(event));
        cast(state);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default hookADuck;
