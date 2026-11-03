import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** The header and footer bars, like the WOPR's terminal. */
const HEADER = 28;
const FOOTER_TOP = HEIGHT - 28;
/** The WOPR console runs down the left side. */
const CONSOLE_WIDTH = 280;
/** The wireframe globe sits above the world map, both right of the console. */
const PANEL_LEFT = CONSOLE_WIDTH + 8;
const PANEL_RIGHT = WIDTH - 8;
const GLOBE_TOP = HEADER + 8;
const GLOBE_BOTTOM = 188;
const MAP_TOP = 196;
const MAP_BOTTOM = FOOTER_TOP - 8;

export const COUNTRIES_TO_END = 5;
export const POINTS_PER_HIT = 100;
export const INTERCEPTOR_SPEED = 600;
export const RELOAD_TIME = 0.4;
export const BLAST_RADIUS = 40;
export const BLAST_TIME = 0.5;
const FIRST_LAUNCH = 1;

/** The launch code the WOPR cracks, one character per stalemate of tic-tac-toe. */
export const CODE_LENGTH = 8;
export const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
/** Seconds between new guesses on each character still being cracked. */
export const FLICKER_TIME = 0.05;
/** Seconds between moves in the WOPR's tic-tac-toe. */
export const MOVE_TIME = 0.12;
/** Seconds a finished board stays up before the next game. */
export const BOARD_PAUSE = 0.5;
/** The console keeps this many lines; older ones scroll away. */
export const LOG_LENGTH = 40;

export interface Point {
  x: number;
  y: number;
}

/** Equirectangular projection from longitude and latitude to the canvas. */
export function project(lon: number, lat: number): Point {
  return {
    x: PANEL_LEFT + ((lon + 180) / 360) * (PANEL_RIGHT - PANEL_LEFT),
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

export type Mark = 'X' | 'O';
export type Cell = Mark | null;

export interface TicTacToe {
  board: Cell[];
  /** Who moves next. */
  turn: Mark;
  /** Seconds until the next move, or until a finished board clears. */
  timer: number;
  /** 'draw' or the winning mark once the game is over, else null. */
  result: Mark | 'draw' | null;
}

export interface LaunchCode {
  /** The code being cracked. */
  code: string;
  /** Which characters have been found and stopped flipping. */
  found: boolean[];
  /** What each character shows now: the real one once found, else a guess. */
  shown: string[];
  /** Seconds until the unfound characters show new guesses. */
  flicker: number;
  /** True once every warhead has been launched for the cracked code. */
  launched: boolean;
}

/** One line of the WOPR console. Alerts show in red. */
export interface LogLine {
  text: string;
  alert: boolean;
}

export interface ThermonuclearWarState {
  ticTacToe: TicTacToe;
  /** The WOPR console, oldest line first. */
  log: LogLine[];
  /** Seconds since the round started. */
  time: number;
  /** Warheads launched so far. */
  launches: number;
  launchCode: LaunchCode;
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

function randomCharacter(random: () => number): string {
  return CODE_CHARACTERS[Math.floor(random() * CODE_CHARACTERS.length)];
}

export function createTicTacToe(): TicTacToe {
  return { board: Array<Cell>(9).fill(null), turn: 'X', timer: MOVE_TIME, result: null };
}

export function createLaunchCode(random: () => number = Math.random): LaunchCode {
  const code = Array.from({ length: CODE_LENGTH }, () => randomCharacter(random)).join('');
  return {
    code,
    found: Array<boolean>(CODE_LENGTH).fill(false),
    shown: Array.from({ length: CODE_LENGTH }, () => randomCharacter(random)),
    flicker: FLICKER_TIME,
    launched: false,
  };
}

export function createState(random: () => number = Math.random): ThermonuclearWarState {
  return {
    ticTacToe: createTicTacToe(),
    log: [
      'W.O.P.R SYSTEM ONLINE',
      'INITIALIZING GLOBAL',
      'THERMONUCLEAR WAR SIMULATION',
      'OBJECTIVE: STOP THE WARHEADS',
      `BEFORE ${COUNTRIES_TO_END} COUNTRIES ARE HIT`,
      'AIM: MOVE THE MOUSE',
      'FIRE: SPACE, FROM NORAD',
      'WOPR CRACKING LAUNCH CODE',
    ].map((text) => ({ text, alert: false })),
    time: 0,
    launches: 0,
    launchCode: createLaunchCode(random),
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

/** Adds lines to the WOPR console, dropping the oldest past LOG_LENGTH. */
export function log(state: ThermonuclearWarState, alert: boolean, ...lines: string[]): void {
  for (const text of lines) state.log.push({ text, alert });
  if (state.log.length > LOG_LENGTH) state.log.splice(0, state.log.length - LOG_LENGTH);
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
  const flightTime = 5 + random() * 3;
  state.warheads.push({
    from: { ...state.countries[origin].city },
    target,
    progress: 0,
    flightTime,
  });
  state.launches += 1;
  log(state, true, 'MISSILE LAUNCH DETECTED');
  log(
    state,
    false,
    `SOURCE: ${state.countries[origin].name.toUpperCase()}`,
    `TARGET: ${state.countries[target].name.toUpperCase()}`,
    `ETA: ${Math.round(flightTime)} SECONDS`,
  );
}

/** Launches a warhead at every country that hasn't been hit yet, all at once. */
export function launchAll(state: ThermonuclearWarState, random: () => number = Math.random): void {
  state.countries.forEach((country, target) => {
    if (country.hit) return;
    const origins = state.countries.map((_, i) => i).filter((i) => i !== target);
    const origin = origins[Math.floor(random() * origins.length)];
    state.warheads.push({
      from: { ...state.countries[origin].city },
      target,
      progress: 0,
      flightTime: 5 + random() * 3,
    });
    state.launches += 1;
  });
  if (state.warheads.length > 0) {
    log(state, true, 'LAUNCHING ALL WEAPONS');
    log(state, false, `${state.warheads.length} WARHEADS IN FLIGHT`);
  }
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The winning mark, 'draw' when the board is full with no winner, else null. */
export function ticTacToeResult(board: Cell[]): Mark | 'draw' | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every((cell) => cell !== null) ? 'draw' : null;
}

/** How the game ends for `player` with best play from both sides: 1 win, 0 draw, -1 loss. */
function outcome(board: Cell[], turn: Mark, player: Mark): number {
  const result = ticTacToeResult(board);
  if (result === 'draw') return 0;
  if (result) return result === player ? 1 : -1;
  const next: Mark = turn === 'X' ? 'O' : 'X';
  const scores = board.flatMap((cell, i) => {
    if (cell) return [];
    board[i] = turn;
    const score = outcome(board, next, player);
    board[i] = null;
    return [score];
  });
  return turn === player ? Math.max(...scores) : Math.min(...scores);
}

/**
 * The cell `player` should take: one of the best moves, picked at random so the
 * games differ. With both sides playing it, every game is a stalemate.
 */
export function bestMove(board: Cell[], player: Mark, random: () => number = Math.random): number {
  const empty = board.map((_, i) => i).filter((i) => board[i] === null);
  // Every opening move draws with best play, and searching them all is slow.
  if (empty.length === 9) return empty[Math.floor(random() * empty.length)];
  const next: Mark = player === 'X' ? 'O' : 'X';
  const scored = empty.map((i) => {
    const trial = [...board];
    trial[i] = player;
    return { i, score: outcome(trial, next, player) };
  });
  const best = Math.max(...scored.map((m) => m.score));
  const moves = scored.filter((m) => m.score === best);
  return moves[Math.floor(random() * moves.length)].i;
}

/** Finds one more character of the launch code, at random. Returns false if none are left. */
export function crackCharacter(code: LaunchCode, random: () => number = Math.random): boolean {
  const left = code.found.map((_, i) => i).filter((i) => !code.found[i]);
  if (left.length === 0) return false;
  const index = left[Math.floor(random() * left.length)];
  code.found[index] = true;
  code.shown[index] = code.code[index];
  return true;
}

export function codeCracked(code: LaunchCode): boolean {
  return code.found.every(Boolean);
}

/**
 * Advances the WOPR by `dt` seconds: the unfound characters flip, both sides
 * of tic-tac-toe move, and each stalemate finds a character. Once the whole
 * code is found, every warhead launches.
 */
export function stepWopr(
  state: ThermonuclearWarState,
  dt: number,
  random: () => number = Math.random,
): void {
  const code = state.launchCode;
  code.flicker -= dt;
  while (code.flicker <= 0) {
    code.flicker += FLICKER_TIME;
    code.found.forEach((found, i) => {
      if (!found) code.shown[i] = randomCharacter(random);
    });
  }

  if (codeCracked(code)) {
    if (!code.launched) {
      code.launched = true;
      log(state, true, 'LAUNCH CODE ACCEPTED');
      launchAll(state, random);
    }
    return;
  }

  const game = state.ticTacToe;
  game.timer -= dt;
  while (game.timer <= 0) {
    if (game.result) {
      state.ticTacToe = createTicTacToe();
      return;
    }
    game.board[bestMove(game.board, game.turn, random)] = game.turn;
    game.turn = game.turn === 'X' ? 'O' : 'X';
    game.result = ticTacToeResult(game.board);
    if (game.result) {
      game.timer += BOARD_PAUSE;
      if (game.result === 'draw') crackCharacter(code, random);
    } else {
      game.timer += MOVE_TIME;
    }
  }
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

  state.time += dt;
  stepWopr(state, dt, random);
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
      log(state, false, `WARHEAD DESTROYED +${POINTS_PER_HIT}`);
    } else if (warhead.progress >= 1) {
      const country = state.countries[warhead.target];
      country.hit = true;
      state.blasts.push({ ...country.city, age: 0, kind: 'impact' });
      log(state, true, `CITY DESTROYED: ${country.name.toUpperCase()}`);
      log(state, false, `COUNTRIES HIT: ${countriesHit(state)}/${COUNTRIES_TO_END}`);
    } else {
      remaining.push(warhead);
    }
  }
  state.warheads = remaining;

  if (countriesHit(state) >= COUNTRIES_TO_END) {
    state.phase = 'over';
    log(state, true, 'SIMULATION ENDED');
    log(state, false, `FINAL SCORE: ${state.score}`);
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

/** Draws the text in a smaller size, for labels that have to fit between cities. */
function smallText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A terminal panel: dark fill with a green border. */
function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.terminalBackground;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = colors.terminal;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Header across the top: the title, the round's clock and the connection. */
function drawHeader(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState) {
  const { colors } = theme;
  ctx.fillStyle = colors.terminal;
  ctx.font = canvasFont('small', 'bold', 'mono');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('W.O.P.R // GLOBAL THERMONUCLEAR WAR', 10, HEADER / 2);
  const seconds = Math.floor(state.time);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillText(`TIME: ${clock}   CONNECTION: ACTIVE`, WIDTH - 10, HEADER / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.fillRect(0, HEADER - 1, WIDTH, 1);
}

/** Footer across the bottom: NORAD and the round's numbers. */
function drawFooter(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState) {
  const { colors } = theme;
  ctx.fillStyle = colors.terminal;
  ctx.fillRect(0, FOOTER_TOP, WIDTH, 1);
  ctx.font = canvasFont('small', 'bold', 'mono');
  ctx.textBaseline = 'middle';
  const y = FOOTER_TOP + (HEIGHT - FOOTER_TOP) / 2;
  ctx.textAlign = 'left';
  ctx.fillText('NORAD // CHEYENNE MTN', 10, y);
  ctx.textAlign = 'center';
  ctx.fillText(
    `LAUNCHES: ${state.launches} | DESTROYED: ${state.destroyed} | SCORE: ${state.score}`,
    (WIDTH + 200) / 2,
    y,
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = countriesHit(state) > 0 ? colors.danger : colors.terminal;
  ctx.fillText(`HIT: ${countriesHit(state)}/${COUNTRIES_TO_END}`, WIDTH - 10, y);
  ctx.textBaseline = 'alphabetic';
}

/** The WOPR console on the left: the log, then the launch code at the prompt. */
function drawConsole(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState) {
  const { colors } = theme;
  const top = HEADER;
  const bottom = FOOTER_TOP;
  ctx.fillStyle = colors.terminalBackground;
  ctx.fillRect(0, top, CONSOLE_WIDTH, bottom - top);
  ctx.fillStyle = colors.terminal;
  ctx.fillRect(CONSOLE_WIDTH, top, 1, bottom - top);

  ctx.font = canvasFont('small', 'bold', 'mono');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WOPR CONSOLE', CONSOLE_WIDTH / 2, top + 14);
  ctx.fillRect(0, top + 28, CONSOLE_WIDTH, 1);

  // The prompt at the bottom shows the launch code being cracked.
  const promptTop = bottom - 56;
  ctx.fillRect(0, promptTop, CONSOLE_WIDTH, 1);
  const code = state.launchCode;
  ctx.textAlign = 'left';
  ctx.fillStyle = code.launched ? colors.danger : colors.terminalDim;
  ctx.fillText(code.launched ? 'LAUNCHING ALL WEAPONS' : 'LAUNCH CODE', 10, promptTop + 16);
  ctx.fillStyle = colors.terminal;
  ctx.font = canvasFont('body', 'bold', 'mono');
  ctx.fillText('>', 10, promptTop + 38);
  code.shown.forEach((character, i) => {
    ctx.fillStyle = code.found[i] ? colors.terminal : colors.terminalDim;
    ctx.fillText(character, 34 + i * 16, promptTop + 38);
  });

  // The log, newest at the bottom; older lines scroll off the top.
  const lineHeight = 17;
  const logTop = top + 40;
  const fits = Math.floor((promptTop - 8 - logTop) / lineHeight);
  const lines = state.log.slice(-fits);
  ctx.font = canvasFont('small', 'normal', 'mono');
  lines.forEach((line, i) => {
    const y = logTop + i * lineHeight + lineHeight / 2;
    if (line.alert) {
      ctx.fillStyle = colors.danger;
      const width = ctx.measureText(line.text).width;
      ctx.fillRect(8, y - 6, 5, 12);
      ctx.fillRect(22 + width, y - 6, 5, 12);
      ctx.fillText(line.text, 17, y);
    } else {
      ctx.fillStyle = colors.terminal;
      ctx.fillText(line.text, 8, y);
    }
  });
  ctx.textBaseline = 'alphabetic';
}

/** Where a longitude and latitude land on the spinning globe, and whether it faces us. */
function globePoint(lon: number, lat: number, spin: number, cx: number, cy: number, r: number) {
  const tilt = 0.35;
  const lambda = ((lon + spin) * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(lambda);
  return {
    x: cx + r * x,
    y: cy - r * (y * Math.cos(tilt) - z * Math.sin(tilt)),
    front: y * Math.sin(tilt) + z * Math.cos(tilt) >= 0,
  };
}

/** The wireframe globe above the map, turning slowly, with satellites in orbit. */
function drawGlobe(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState) {
  const { colors } = theme;
  drawPanel(ctx, PANEL_LEFT, GLOBE_TOP, PANEL_RIGHT - PANEL_LEFT, GLOBE_BOTTOM - GLOBE_TOP);
  const cx = (PANEL_LEFT + PANEL_RIGHT) / 2;
  const cy = (GLOBE_TOP + GLOBE_BOTTOM) / 2 + 4;
  const r = (GLOBE_BOTTOM - GLOBE_TOP) / 2 - 16;
  const spin = state.time * 12;

  // Each grid line is drawn in short segments, bright in front and dim behind.
  const front = new Path2D();
  const back = new Path2D();
  const segment = (a: [number, number], b: [number, number]) => {
    const p = globePoint(a[0], a[1], spin, cx, cy, r);
    const q = globePoint(b[0], b[1], spin, cx, cy, r);
    const path = p.front && q.front ? front : back;
    path.moveTo(p.x, p.y);
    path.lineTo(q.x, q.y);
  };
  for (let lon = 0; lon < 360; lon += 20) {
    for (let lat = -90; lat < 90; lat += 10) segment([lon, lat], [lon, lat + 10]);
  }
  for (let lat = -60; lat <= 60; lat += 20) {
    for (let lon = 0; lon < 360; lon += 10) segment([lon, lat], [lon + 10, lat]);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.terminalDim;
  ctx.stroke(back);
  ctx.strokeStyle = colors.terminal;
  ctx.stroke(front);

  state.countries.forEach((country, i) => {
    const [, lon, lat] = COUNTRIES[i];
    const p = globePoint(lon, lat, spin, cx, cy, r);
    if (!p.front) return;
    ctx.fillStyle = country.hit ? colors.danger : colors.accent;
    ctx.beginPath();
    ctx.arc(p.x, p.y, country.hit ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // SDI satellites, on orbits a little wider than the globe.
  ctx.fillStyle = colors.water;
  for (let i = 0; i < 4; i++) {
    const angle = state.time * 0.4 + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * (r + 26), cy - r * 0.9 + Math.sin(angle) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.terminalDim;
  ctx.font = canvasFont('small', 'normal', 'mono');
  ctx.textAlign = 'left';
  smallText(ctx, 'ORBITAL VIEW', PANEL_LEFT + 8, GLOBE_TOP + 16, 0.8);
}

/** The WOPR's tic-tac-toe, in the top right corner of the globe panel. */
function drawTicTacToe(ctx: CanvasRenderingContext2D, game: TicTacToe) {
  const { colors } = theme;
  const cell = 18;
  const left = PANEL_RIGHT - 12 - cell * 3;
  const top = GLOBE_TOP + 24;

  ctx.fillStyle = colors.terminalDim;
  ctx.font = canvasFont('small', 'normal', 'mono');
  ctx.textAlign = 'left';
  smallText(ctx, 'TIC-TAC-TOE', left - 4, top - 8, 0.7);

  ctx.strokeStyle = colors.terminal;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(left + cell * i, top);
    ctx.lineTo(left + cell * i, top + cell * 3);
    ctx.moveTo(left, top + cell * i);
    ctx.lineTo(left + cell * 3, top + cell * i);
  }
  ctx.stroke();

  ctx.font = canvasFont('small', 'bold', 'mono');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  game.board.forEach((mark, i) => {
    if (!mark) return;
    ctx.fillStyle = mark === 'X' ? colors.accent : colors.water;
    ctx.fillText(mark, left + cell * (i % 3) + cell / 2, top + cell * Math.floor(i / 3) + cell / 2);
  });
  ctx.textBaseline = 'alphabetic';
}

/** The green world map, with every country marked and named. */
function drawMap(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState) {
  const { colors } = theme;
  drawPanel(ctx, PANEL_LEFT, MAP_TOP, PANEL_RIGHT - PANEL_LEFT, MAP_BOTTOM - MAP_TOP);

  const coastline = new Path2D();
  for (const outline of CONTINENTS) {
    outline.forEach(([lon, lat], i) => {
      const { x, y } = project(lon, lat);
      if (i === 0) coastline.moveTo(x, y);
      else coastline.lineTo(x, y);
    });
    coastline.closePath();
  }
  // A wide dim stroke under a thin bright one reads as a phosphor glow.
  ctx.strokeStyle = colors.terminalDim;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  ctx.stroke(coastline);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colors.terminal;
  ctx.lineWidth = 1.5;
  ctx.stroke(coastline);

  ctx.font = canvasFont('small', 'bold', 'mono');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const country of state.countries) {
    ctx.fillStyle = colors.danger;
    ctx.beginPath();
    ctx.arc(country.city.x, country.city.y, country.hit ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = country.hit ? colors.danger : colors.terminal;
    // Names near the right edge go on the left of their dot so they stay on the map.
    const name = country.name.toUpperCase();
    const width = ctx.measureText(name).width * 0.6;
    const x =
      country.city.x + 5 + width > PANEL_RIGHT - 4
        ? country.city.x - 5 - width
        : country.city.x + 5;
    smallText(ctx, name, x, country.city.y, 0.6);
  }
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = colors.accent;
  ctx.fillRect(NORAD.x - 4, NORAD.y - 4, 8, 8);
}

function draw(ctx: CanvasRenderingContext2D, state: ThermonuclearWarState, aim: Point) {
  const { colors } = theme;

  ctx.fillStyle = colors.terminalBackground;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawHeader(ctx, state);
  drawConsole(ctx, state);
  drawGlobe(ctx, state);
  drawTicTacToe(ctx, state.ticTacToe);
  drawMap(ctx, state);
  drawFooter(ctx, state);

  // Warheads, with a dotted trail of their arc so far.
  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
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
  }
  ctx.setLineDash([]);
  ctx.fillStyle = colors.accent;
  for (const warhead of state.warheads) {
    const head = warheadPosition(state, warhead);
    ctx.beginPath();
    ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = colors.water;
  for (const interceptor of state.interceptors) {
    ctx.beginPath();
    ctx.moveTo(NORAD.x, NORAD.y);
    ctx.lineTo(interceptor.x, interceptor.y);
    ctx.stroke();
  }

  for (const blast of state.blasts) {
    ctx.globalAlpha = 1 - blast.age / BLAST_TIME;
    ctx.strokeStyle = blast.kind === 'intercept' ? colors.water : colors.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const radius = blast.kind === 'intercept' ? blastRadius(blast.age) : 8 + blast.age * 50;
    ctx.arc(blast.x, blast.y, Math.max(radius, 1), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Crosshair.
  ctx.strokeStyle = colors.terminal;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(aim.x - 10, aim.y);
  ctx.lineTo(aim.x + 10, aim.y);
  ctx.moveTo(aim.x, aim.y - 10);
  ctx.lineTo(aim.x, aim.y + 10);
  ctx.stroke();

  if (state.phase === 'over') {
    ctx.fillStyle = colors.terminalBackground;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.terminal;
    ctx.font = canvasFont('title', 'bold', 'mono');
    ctx.fillText(`GAME OVER. SCORE: ${state.score}`, WIDTH / 2, HEIGHT / 2 - 20);
    ctx.font = canvasFont('body', 'normal', 'mono');
    ctx.fillText('A STRANGE GAME.', WIDTH / 2, HEIGHT / 2 + 16);
    ctx.fillText('THE ONLY WINNING MOVE IS NOT TO PLAY.', WIDTH / 2, HEIGHT / 2 + 40);
    ctx.fillStyle = colors.terminalDim;
    ctx.fillText('PRESS SPACE OR CLICK TO PLAY AGAIN', WIDTH / 2, HEIGHT / 2 + 76);
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
