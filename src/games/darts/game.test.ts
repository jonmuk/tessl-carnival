import { describe, expect, it } from 'vitest';
import {
  BOARD,
  DARTS_PER_ROUND,
  FLIGHT_TIME,
  RINGS,
  THROW_FROM,
  createState,
  dartPosition,
  dartsLeft,
  scoreAt,
  sectorAt,
  step,
  throwDart,
} from './game';

/** A point `distance` pixels from the centre, straight up (in the 20). */
const up = (distance: number) => ({ x: BOARD.x, y: BOARD.y - distance });

describe('darts', () => {
  it('starts with three darts and no score', () => {
    const state = createState();
    expect(dartsLeft(state)).toBe(DARTS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('reads the board number from the angle', () => {
    expect(sectorAt(BOARD.x, BOARD.y - 50)).toBe(20);
    expect(sectorAt(BOARD.x + 50, BOARD.y)).toBe(6);
    expect(sectorAt(BOARD.x, BOARD.y + 50)).toBe(3);
    expect(sectorAt(BOARD.x - 50, BOARD.y)).toBe(11);
  });

  it('scores the bull, the outer bull, singles, trebles and doubles', () => {
    expect(scoreAt(BOARD.x, BOARD.y)).toBe(50);
    expect(scoreAt(up(RINGS.outerBull - 1).x, up(RINGS.outerBull - 1).y)).toBe(25);
    expect(scoreAt(up(60).x, up(60).y)).toBe(20);
    expect(scoreAt(up(103).x, up(103).y)).toBe(60);
    expect(scoreAt(up(130).x, up(130).y)).toBe(20);
    expect(scoreAt(up(166).x, up(166).y)).toBe(40);
  });

  it('scores nothing off the board', () => {
    expect(scoreAt(up(BOARD.radius + 5).x, up(BOARD.radius + 5).y)).toBe(0);
  });

  it('throws a dart from below the screen towards the board', () => {
    const state = createState();
    expect(throwDart(state)).toBe(true);
    expect(dartsLeft(state)).toBe(DARTS_PER_ROUND - 1);
    const dart = state.darts[0];
    expect(dartPosition(dart)).toMatchObject({ x: THROW_FROM.x, y: THROW_FROM.y, progress: 0 });
  });

  it('flies the dart in before it lands and scores', () => {
    const state = createState();
    throwDart(state);
    const dart = state.darts[0];
    step(state, FLIGHT_TIME / 2);
    expect(dart.points).toBeNull();
    expect(state.score).toBe(0);
    expect(dartPosition(dart).progress).toBeCloseTo(0.5);

    step(state, FLIGHT_TIME);
    expect(dart.points).toBe(scoreAt(dart.toX, dart.toY));
    expect(state.score).toBe(dart.points);
    expect(dartPosition(dart)).toMatchObject({ x: dart.toX, y: dart.toY });
  });

  it('throws one dart at a time', () => {
    const state = createState();
    throwDart(state);
    expect(throwDart(state)).toBe(false);
    step(state, FLIGHT_TIME);
    expect(throwDart(state)).toBe(true);
  });

  it('ends the round once the third dart lands', () => {
    const state = createState();
    for (let i = 0; i < DARTS_PER_ROUND - 1; i++) {
      throwDart(state);
      step(state, FLIGHT_TIME);
    }
    throwDart(state);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
    expect(state.score).toBe(state.darts.reduce((sum, dart) => sum + (dart.points ?? 0), 0));
    expect(throwDart(state)).toBe(false);
  });
});
