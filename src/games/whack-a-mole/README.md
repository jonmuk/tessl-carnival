# Whack-a-Mole

Whack the moles as they pop up from the nine holes, before they duck back down.

## How to play

- Moles pop up from a 3 by 3 grid of holes for a short time, then drop back down.
- Click a mole while it's up to whack it.
- A round lasts 30 seconds. Moles pop up faster, and stay up for less time, as
  the round goes on: one every 1 second at the start, staying up for 1.2
  seconds, down to one every 0.4 seconds, staying up for 0.6 seconds, at the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Missing, or clicking an empty hole, costs
nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `spawnInterval`,
  `upTime`) and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
