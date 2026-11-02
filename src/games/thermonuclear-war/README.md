# Thermonuclear War

Shall we play a game? Warheads arc across a glowing world map, like the WOPR's
screen in _WarGames_. Shoot them down before they hit five countries.

## How to play

- Move the mouse to aim the crosshair.
- Press Space to fire an interceptor from NORAD, the gold square in Colorado. It
  flies to the crosshair and bursts there. Any warhead inside the burst is
  destroyed.
- You can fire again 0.4 seconds after each interceptor.
- Warheads launch from one country at another that hasn't been hit yet, and they
  launch faster the more you destroy.
- The round ends when 5 countries have been hit.
- Press Space or click on the game over screen to play another round.

## Scoring

Each warhead you destroy scores 100 points. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `launch`, `fire`, `step`) and the
  `thermonuclearWar` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
