import { describe, expect, it } from 'vitest';
import {
  HOLE_RADIUS,
  POINTS_PER_WHACK,
  ROUND_SECONDS,
  createState,
  spawnInterval,
  step,
  timeLeft,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with nine empty holes, no score and a full clock', () => {
    const state = createState();
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((h) => h.upFor === 0)).toBe(true);
    expect(state.score).toBe(0);
    expect(timeLeft(state)).toBe(ROUND_SECONDS);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up from an empty hole when the spawn timer runs out', () => {
    const state = createState();
    step(state, spawnInterval(0), () => 0);
    expect(state.holes[0].upFor).toBeGreaterThan(0);
    expect(state.holes.filter((h) => h.upFor > 0)).toHaveLength(1);
  });

  it('drops a mole back down once its time is up', () => {
    const state = createState();
    state.holes[4].upFor = 0.5;
    step(state, 0.6);
    expect(state.holes[4].upFor).toBe(0);
  });

  it('scores a whack on a mole that is up and knocks it down', () => {
    const state = createState();
    const hole = state.holes[2];
    hole.upFor = 1;
    expect(whack(state, hole.x + HOLE_RADIUS - 1, hole.y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(hole.upFor).toBe(0);
  });

  it('scores nothing for an empty hole or a miss', () => {
    const state = createState();
    const hole = state.holes[2];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    hole.upFor = 1;
    expect(whack(state, hole.x + HOLE_RADIUS + 1, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('cannot whack the same mole twice', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.upFor = 1;
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('pops moles up more often, and for less time, as the round goes on', () => {
    expect(spawnInterval(ROUND_SECONDS)).toBeLessThan(spawnInterval(0));
    expect(upTime(ROUND_SECONDS)).toBeLessThan(upTime(0));
    expect(spawnInterval(ROUND_SECONDS / 2)).toBeLessThan(spawnInterval(0));
  });

  it('ends the round when the clock runs out, and ignores whacks after', () => {
    const state = createState();
    for (let t = 0; t < ROUND_SECONDS + 1; t += 0.05) step(state, 0.05, () => 0.5);
    expect(state.phase).toBe('over');
    expect(timeLeft(state)).toBe(0);
    expect(state.holes.every((h) => h.upFor === 0)).toBe(true);
    const hole = state.holes[0];
    hole.upFor = 1;
    expect(whack(state, hole.x, hole.y)).toBe(false);
  });
});
