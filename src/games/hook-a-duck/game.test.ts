import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DROP_TIME,
  DUCK_VALUES,
  STREAM,
  STREAM_LENGTH,
  WATER_Y,
  cast,
  createState,
  duckPosition,
  duckUnderHook,
  moveHook,
  step,
  type HookADuckState,
} from './game';

/** A state with one duck right under the hook. */
function stateWithDuckUnderHook(value = 50): HookADuckState {
  const state = createState();
  state.ducks = [{ along: state.hook.x - STREAM.left, value }];
  return state;
}

/** Freezes the ducks in place while the hook drops and rises. */
function finishCast(state: HookADuckState): void {
  const ducks = state.ducks.map((d) => ({ ...d }));
  for (let i = 0; i < 10 && state.hook.mode !== 'up'; i++) {
    step(state, DROP_TIME / 2);
    if (state.hook.mode === 'down') state.ducks = ducks.map((d) => ({ ...d }));
  }
}

describe('hook a duck', () => {
  it('starts with every cast, no score and a duck for each number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual([...DUCK_VALUES]);
    expect(state.hook.mode).toBe('up');
  });

  it('floats the ducks round the stream in a loop', () => {
    const duck = { along: 0, value: 10 };
    expect(duckPosition(duck)).toEqual({ x: STREAM.left, y: STREAM.bottom });
    const halfway = duckPosition({ ...duck, along: STREAM_LENGTH / 2 });
    expect(halfway.x).toBeCloseTo(STREAM.right);
    expect(halfway.y).toBeCloseTo(STREAM.top);
    const round = duckPosition({ ...duck, along: STREAM_LENGTH });
    expect(round.x).toBeCloseTo(STREAM.left);
    expect(round.y).toBeCloseTo(STREAM.bottom);
  });

  it('keeps every duck on the stream as time passes', () => {
    const state = createState();
    for (let i = 0; i < 200; i++) step(state, 0.05);
    for (const duck of state.ducks) {
      expect(duck.along).toBeGreaterThanOrEqual(0);
      expect(duck.along).toBeLessThan(STREAM_LENGTH);
    }
  });

  it('uses one cast each time the hook is lowered', () => {
    const state = createState();
    expect(cast(state)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.mode).toBe('down');
  });

  it('cannot cast again while the hook is in the water', () => {
    const state = createState();
    cast(state);
    expect(cast(state)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts run out', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state)).toBe(false);
  });

  it('only moves the hook along the stream, and not while it is down', () => {
    const state = createState();
    moveHook(state, 0);
    expect(state.hook.x).toBe(STREAM.left);
    moveHook(state, 10_000);
    expect(state.hook.x).toBe(STREAM.right);
    cast(state);
    moveHook(state, 400);
    expect(state.hook.x).toBe(STREAM.right);
  });

  it('finds the duck under the hook at the water', () => {
    const state = stateWithDuckUnderHook();
    expect(duckPosition(state.ducks[0]).y).toBe(WATER_Y);
    expect(duckUnderHook(state)).toBe(state.ducks[0]);
    state.ducks[0].along += 100;
    expect(duckUnderHook(state)).toBeUndefined();
  });

  it('scores the number on the base of a caught duck', () => {
    const state = stateWithDuckUnderHook(50);
    cast(state);
    finishCast(state);
    expect(state.score).toBe(50);
    expect(state.lastCatch?.value).toBe(50);
    expect(state.ducks).toHaveLength(1);
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    state.ducks = [];
    cast(state);
    finishCast(state);
    expect(state.score).toBe(0);
    expect(state.hook.mode).toBe('up');
  });

  it('ends the round when the last cast comes back up', () => {
    const state = createState();
    state.ducks = [];
    state.casts = 1;
    cast(state);
    step(state, DROP_TIME);
    expect(state.phase).toBe('playing');
    finishCast(state);
    expect(state.phase).toBe('over');
  });
});
