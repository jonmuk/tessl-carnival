import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** The world map fills the canvas between these rows; the HUD sits below. */
const MAP_TOP = 40;
const MAP_BOTTOM = 440;

export const COUNTRIES_TO_END = 5;
export const POINTS_PER_HIT = 100;
export const INTERCEPTOR_SPEED = 600;
export const RELOAD_TIME = 0.4;
export const BLAST_RADIUS = 40;
export const BLAST_TIME = 0.5;
const FIRST_LAUNCH = 1;

export interface Point {
  x: number;
  y: number;
}

/** Equirectangular projection from longitude and latitude to the canvas. */
export function project(lon: number, lat: number): Point {
  return {
    x: ((lon + 180) / 360) * WIDTH,
    y: MAP_TOP + ((80 - lat) / 140) * (MAP_BOTTOM - MAP_TOP),
  };
}

export interface Country {
  name: string;
  /** Where its warheads come down and its interceptor base would be. */
  city: Point;
  hit: boolean;
}

const COUNTRIES: [string, number, number][] = [
  ['USA', -77, 39],
  ['Canada', -75, 45],
  ['Mexico', -99, 19],
  ['Brazil', -47, -15],
  ['Argentina', -58, -34],
  ['UK', 0, 51.5],
  ['France', 2, 47],
  ['Germany', 13, 52],
  ['Russia', 37, 55],
  ['China', 116, 40],
  ['India', 77, 28],
  ['Japan', 139, 35],
  ['Australia', 149, -35],
  ['Egypt', 31, 30],
  ['South Africa', 28, -26],
];

/** Interceptors launch from NORAD, in Colorado. */
export const NORAD = project(-105, 39);

export interface Warhead {
  from: Point;
  /** Index into `state.countries` of the country it is aimed at. */
  target: number;
  /** 0 at launch, 1 on impact. */
  progress: number;
  /** Seconds from launch to impact. */
  flightTime: number;
}

export interface Interceptor {
  x: number;
  y: number;
  /** Where it bursts. */
  tx: number;
  ty: number;
}

export interface Blast {
  x: number;
  y: number;
  age: number;
  kind: 'intercept' | 'impact';
}

export interface ThermonuclearWarState {
  countries: Country[];
  warheads: Warhead[];
  interceptors: Interceptor[];
  blasts: Blast[];
  /** Seconds until the next launch. */
  nextLaunch: number;
  /** Seconds until another interceptor is ready. */
  reload: number;
  destroyed: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): ThermonuclearWarState {
  return {
    countries: COUNTRIES.map(([name, lon, lat]) => ({ name, city: project(lon, lat), hit: false })),
    warheads: [],
    interceptors: [],
    blasts: [],
    nextLaunch: FIRST_LAUNCH,
    reload: 0,
    destroyed: 0,
    score: 0,
    phase: 'playing',
  };
}

export function countriesHit(state: ThermonuclearWarState): number {
  return state.countries.filter((c) => c.hit).length;
}

/** Launches come faster as more warheads are destroyed, down to one every 0.7 s. */
export function launchInterval(destroyed: number): number {
  return Math.max(0.7, 2.2 - destroyed * 0.05);
}

/** Where a warhead is now: on an arc that rises above the straight line to its target. */
export function warheadPosition(state: ThermonuclearWarState, warhead: Warhead): Point {
  return arcPoint(warhead.from, state.countries[warhead.target].city, warhead.progress);
}

function arcPoint(from: Point, to: Point, t: number): Point {
  const control = {
    x: (from.x + to.x) / 2,
    y: Math.min(from.y, to.y) - Math.hypot(to.x - from.x, to.y - from.y) * 0.3,
  };
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

/**
 * Launches a warhead from one country at a country that hasn't been hit yet.
 * `random` returns numbers in [0, 1), like Math.random.
 */
export function launch(state: ThermonuclearWarState, random: () => number = Math.random): void {
  const targets = state.countries.map((_, i) => i).filter((i) => !state.countries[i].hit);
  if (targets.length === 0) return;
  const target = targets[Math.floor(random() * targets.length)];
  const origins = state.countries.map((_, i) => i).filter((i) => i !== target);
  const origin = origins[Math.floor(random() * origins.length)];
  state.warheads.push({
    from: { ...state.countries[origin].city },
    target,
    progress: 0,
    flightTime: 5 + random() * 3,
  });
}

/** Fires an interceptor from NORAD that bursts at the aim point. Returns false if nothing fired. */
export function fire(state: ThermonuclearWarState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.reload > 0) return false;
  state.interceptors.push({ x: NORAD.x, y: NORAD.y, tx: aimX, ty: aimY });
  state.reload = RELOAD_TIME;
  return true;
}

/** How far a blast reaches `age` seconds after it starts. */
export function blastRadius(age: number): number {
  return BLAST_RADIUS * Math.min(1, age / (BLAST_TIME / 2));
}

/** Advances the game by `dt` seconds. */
export function step(
  state: ThermonuclearWarState,
  dt: number,
  random: () => number = Math.random,
): void {
  for (const blast of state.blasts) blast.age += dt;
  state.blasts = state.blasts.filter((b) => b.age < BLAST_TIME);

  if (state.phase === 'over') return;

  state.reload = Math.max(0, state.reload - dt);
  state.nextLaunch -= dt;
  if (state.nextLaunch <= 0) {
    launch(state, random);
    state.nextLaunch += launchInterval(state.destroyed);
  }

  const flying: Interceptor[] = [];
  for (const interceptor of state.interceptors) {
    const dx = interceptor.tx - interceptor.x;
    const dy = interceptor.ty - interceptor.y;
    const distance = Math.hypot(dx, dy);
    const travel = INTERCEPTOR_SPEED * dt;
    if (travel >= distance) {
      state.blasts.push({ x: interceptor.tx, y: interceptor.ty, age: 0, kind: 'intercept' });
    } else {
      interceptor.x += (dx / distance) * travel;
      interceptor.y += (dy / distance) * travel;
      flying.push(interceptor);
    }
  }
  state.interceptors = flying;

  const remaining: Warhead[] = [];
  for (const warhead of state.warheads) {
    warhead.progress += dt / warhead.flightTime;
    const position = warheadPosition(state, warhead);
    const caught = state.blasts.some(
      (b) =>
        b.kind === 'intercept' &&
        Math.hypot(b.x - position.x, b.y - position.y) <= blastRadius(b.age),
    );
    if (caught) {
      state.destroyed += 1;
      state.score += POINTS_PER_HIT;
    } else if (warhead.progress >= 1) {
      const country = state.countries[warhead.target];
      country.hit = true;
      state.blasts.push({ ...country.city, age: 0, kind: 'impact' });
    } else {
      remaining.push(warhead);
    }
  }
  state.warheads = remaining;

  if (countriesHit(state) >= COUNTRIES_TO_END) {
    state.phase = 'over';
    state.warheads = [];
    state.interceptors = [];
  }
}

/** Rough continent outlines as [longitude, latitude] pairs, drawn like the WOPR's screen. */
const CONTINENTS: [number, number][][] = [
  // North America
  [
    [-165, 65],
    [-140, 70],
    [-95, 72],
    [-80, 63],
    [-60, 55],
    [-55, 48],
    [-70, 43],
    [-76, 35],
    [-81, 25],
    [-90, 30],
    [-97, 26],
    [-97, 20],
    [-87, 15],
    [-83, 9],
    [-79, 8],
    [-92, 15],
    [-105, 20],
    [-112, 30],
    [-118, 34],
    [-124, 42],
    [-124, 48],
    [-135, 58],
    [-150, 60],
    [-165, 55],
  ],
  // Greenland
  [
    [-50, 80],
    [-25, 80],
    [-20, 70],
    [-42, 60],
    [-55, 68],
  ],
  // South America
  [
    [-79, 8],
    [-75, 11],
    [-62, 10],
    [-50, 0],
    [-35, -6],
    [-40, -22],
    [-48, -28],
    [-58, -38],
    [-65, -55],
    [-72, -50],
    [-73, -35],
    [-70, -18],
    [-81, -5],
  ],
  // Europe and Asia
  [
    [-10, 36],
    [-9, 43],
    [-2, 44],
    [-5, 48],
    [5, 53],
    [8, 57],
    [5, 62],
    [15, 69],
    [28, 71],
    [40, 67],
    [60, 70],
    [80, 73],
    [105, 78],
    [140, 72],
    [180, 68],
    [170, 60],
    [160, 58],
    [140, 52],
    [142, 46],
    [130, 42],
    [127, 35],
    [122, 30],
    [120, 22],
    [108, 18],
    [109, 12],
    [104, 1],
    [100, 13],
    [98, 8],
    [93, 20],
    [88, 22],
    [80, 14],
    [78, 8],
    [72, 20],
    [66, 25],
    [57, 25],
    [56, 22],
    [52, 15],
    [44, 12],
    [35, 30],
    [35, 36],
    [27, 37],
    [24, 40],
    [15, 40],
    [12, 44],
    [13, 38],
    [3, 42],
    [-5, 36],
  ],
  // Africa
  [
    [-17, 15],
    [-17, 21],
    [-10, 30],
    [-5, 36],
    [10, 37],
    [20, 32],
    [32, 31],
    [35, 28],
    [43, 12],
    [51, 12],
    [40, -15],
    [35, -25],
    [20, -35],
    [17, -30],
    [12, -15],
    [9, 0],
    [5, 5],
    [-8, 4],
    [-14, 10],
  ],
  // Australia
  [
    [114, -22],
    [122, -18],
    [130, -12],
    [137, -12],
    [142, -11],
    [145, -15],
    [153, -25],
    [150, -37],
    [140, -38],
    [132, -32],
    [115, -35],
  ],
  // Great Britain
  [
    [-5, 50],
    [1, 51],
    [-2, 56],
    [-5, 58],
    [-6, 55],
    [-3, 54],
  ],
  // Japan
  [
    [130, 31],
    [140, 35],
    [142, 40],
    [141, 45],
    [139, 38],
    [133, 34],
  ],
];

function draw(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState, aim: Point) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Latitude and longitude grid.
  ctx.strokeStyle = colors.surface;
  ctx.lineWidth = 1;
  for (let lon = -150; lon <= 150; lon += 30) {
    const { x } = project(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, MAP_TOP);
    ctx.lineTo(x, MAP_BOTTOM);
    ctx.stroke();
  }
  for (let lat = 60; lat >= -40; lat -= 20) {
    const { y } = project(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 2;
  for (const outline of CONTINENTS) {
    ctx.beginPath();
    outline.forEach(([lon, lat], i) => {
      const { x, y } = project(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  ctx.font = canvasFont('small');
  ctx.textAlign = 'center';
  for (const country of state.countries) {
    ctx.fillStyle = country.hit ? colors.danger : colors.muted;
    ctx.beginPath();
    ctx.arc(country.city.x, country.city.y, country.hit ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (country.hit) ctx.fillText(country.name, country.city.x, country.city.y - 10);
  }

  ctx.fillStyle = colors.accent;
  ctx.fillRect(NORAD.x - 4, NORAD.y - 4, 8, 8);

  // Warheads, with the trail of their arc so far.
  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = 2;
  for (const warhead of state.warheads) {
    const to = state.countries[warhead.target].city;
    ctx.beginPath();
    ctx.moveTo(warhead.from.x, warhead.from.y);
    for (let t = 0.05; t < warhead.progress; t += 0.05) {
      const p = arcPoint(warhead.from, to, t);
      ctx.lineTo(p.x, p.y);
    }
    const head = warheadPosition(state, warhead);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = colors.accent;
  for (const interceptor of state.interceptors) {
    ctx.beginPath();
    ctx.moveTo(NORAD.x, NORAD.y);
    ctx.lineTo(interceptor.x, interceptor.y);
    ctx.stroke();
  }

  for (const blast of state.blasts) {
    ctx.globalAlpha = 1 - blast.age / BLAST_TIME;
    ctx.strokeStyle = blast.kind === 'intercept' ? colors.accent : colors.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const radius = blast.kind === 'intercept' ? blastRadius(blast.age) : 8 + blast.age * 50;
    ctx.arc(blast.x, blast.y, Math.max(radius, 1), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Crosshair.
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(aim.x - 10, aim.y);
  ctx.lineTo(aim.x + 10, aim.y);
  ctx.moveTo(aim.x, aim.y - 10);
  ctx.lineTo(aim.x, aim.y + 10);
  ctx.stroke();

  ctx.fillStyle = colors.water;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('GLOBAL THERMONUCLEAR WAR', WIDTH / 2, 26);

  ctx.fillStyle = colors.text;
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Countries hit ${countriesHit(state)}/${COUNTRIES_TO_END}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Game over! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2 - 20);
    ctx.fillStyle = colors.water;
    ctx.font = canvasFont('body');
    ctx.fillText(
      'A strange game. The only winning move is not to play.',
      WIDTH / 2,
      HEIGHT / 2 + 20,
    );
    ctx.fillStyle = colors.text;
    ctx.fillText('Press Space or click to play again', WIDTH / 2, HEIGHT / 2 + 55);
  }
}

export const thermonuclearWar: CarnivalGame = {
  id: 'thermonuclear-war',
  name: 'Thermonuclear War',
  description:
    'Shoot down the warheads before they hit five countries. Each one stopped scores 100.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const restart = () => {
      state = createState();
      scoreRecorded = false;
    };
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      aim.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      aim.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    };
    const onDown = () => {
      if (state.phase === 'over') restart();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      // Keep Space from scrolling the page.
      event.preventDefault();
      if (event.repeat) return;
      if (state.phase === 'over') restart();
      else fire(state, aim.x, aim.y);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(thermonuclearWar.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  },
};

export default thermonuclearWar;
