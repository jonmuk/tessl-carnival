import { describe, expect, it } from 'vitest';
import {
  BLAST_TIME,
  COUNTRIES_TO_END,
  NORAD,
  POINTS_PER_HIT,
  RELOAD_TIME,
  countriesHit,
  createState,
  fire,
  launch,
  launchInterval,
  step,
  warheadPosition,
} from './game';

const first = () => 0;

describe('thermonuclear war', () => {
  it('starts with no score, no warheads and no country hit', () => {
    const state = createState();
    expect(state.score).toBe(0);
    expect(state.warheads).toHaveLength(0);
    expect(countriesHit(state)).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('fires an interceptor from NORAD, then has to reload', () => {
    const state = createState();
    expect(fire(state, 400, 200)).toBe(true);
    expect(state.interceptors).toEqual([{ x: NORAD.x, y: NORAD.y, tx: 400, ty: 200 }]);
    expect(fire(state, 400, 200)).toBe(false);
    step(state, RELOAD_TIME);
    expect(fire(state, 400, 200)).toBe(true);
  });

  it('launches warheads at countries that have not been hit', () => {
    const state = createState();
    state.countries[0].hit = true;
    launch(state, first);
    expect(state.warheads[0].target).toBe(1);
    expect(state.warheads[0].from).toEqual(state.countries[0].city);
  });

  it('launches faster as more warheads are destroyed', () => {
    expect(launchInterval(10)).toBeLessThan(launchInterval(0));
    expect(launchInterval(1000)).toBe(0.7);
  });

  it('scores a hit when an interceptor bursts on a warhead', () => {
    const state = createState();
    launch(state, first);
    const warhead = state.warheads[0];
    warhead.progress = 0.5;
    const position = warheadPosition(state, warhead);
    state.blasts.push({ ...position, age: BLAST_TIME / 2, kind: 'intercept' });
    step(state, 0, first);
    expect(state.warheads).toHaveLength(0);
    expect(state.score).toBe(POINTS_PER_HIT);
    expect(state.destroyed).toBe(1);
  });

  it('bursts the interceptor where it was aimed', () => {
    const state = createState();
    fire(state, NORAD.x + 10, NORAD.y);
    step(state, 0.1, first);
    expect(state.interceptors).toHaveLength(0);
    expect(state.blasts[0]).toMatchObject({ x: NORAD.x + 10, y: NORAD.y, kind: 'intercept' });
  });

  it('hits the target country when a warhead lands', () => {
    const state = createState();
    launch(state, first);
    state.warheads[0].progress = 0.999;
    step(state, 0.1, first);
    expect(state.countries[0].hit).toBe(true);
    expect(countriesHit(state)).toBe(1);
    expect(state.score).toBe(0);
  });

  it(`ends the round once ${COUNTRIES_TO_END} countries are hit`, () => {
    const state = createState();
    for (let i = 0; i < COUNTRIES_TO_END - 1; i++) state.countries[i].hit = true;
    step(state, 0, first);
    expect(state.phase).toBe('playing');
    launch(state, first);
    state.warheads[0].progress = 1;
    step(state, 0, first);
    expect(state.phase).toBe('over');
    expect(fire(state, 400, 200)).toBe(false);
  });
});
