# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook to catch one as it
passes.

## How to play

- Move the mouse left and right to slide the hook along the rod.
- Click to lower the hook. It drops to the near side of the stream and comes
  back up, with a duck if one was under it when it reached the water.
- You have 10 casts. The round ends when the last cast comes back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The ten
ducks are numbered 10, 20, 10, 50, 10, 30, 10, 20, 10 and 100. A caught duck goes
back in the stream on the far side, so you can catch it again.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `moveHook`, `cast`, `step`,
  `duckPosition`, `duckUnderHook`) and the `hookADuck` entry, the default export
  the midway finds.
- `game.test.ts`: tests for the game logic.
