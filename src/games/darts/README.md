# Darts

Throw three darts at the board and add up where they land.

## How to play

- A crosshair sweeps across the board. Press Space to throw a dart at it.
- The dart flies in from the bottom of the screen and sticks where the crosshair was when you threw.
- One dart flies at a time. The round ends when the third dart lands.
- Press Space on the game over screen to play another round.

## Scoring

Each dart scores by the section of the board it lands in:

| Section     | Points                     |
| ----------- | -------------------------- |
| Bull        | 50                         |
| Outer bull  | 25                         |
| Treble ring | 3 times the section number |
| Double ring | 2 times the section number |
| Single      | the section number         |
| Off board   | 0                          |

The sections run 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
clockwise from the top, like a real board. The best round is 180: three treble 20s.

Your score for the three darts is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwDart`, `step`, `scoreAt`, `sectorAt`) and the
  `darts` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
