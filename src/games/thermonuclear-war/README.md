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
- While you play, the WOPR plays tic-tac-toe against itself in the bottom right
  corner, trying to crack the 8 character launch code shown at the bottom of
  the screen. The characters it hasn't found keep flipping.
- Every game of tic-tac-toe ends in a stalemate, and each stalemate finds one
  character of the code, which turns gold and stops flipping.
- When all 8 characters are found, the WOPR launches every weapon at once: one
  warhead at every country that hasn't been hit yet.
- Press Space or click on the game over screen to play another round.

## Scoring

Each warhead you destroy scores 100 points. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `launch`, `launchAll`, `fire`, `step`),
  the WOPR's tic-tac-toe and launch code (`bestMove`, `crackCharacter`,
  `stepWopr`), and the
  `thermonuclearWar` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
