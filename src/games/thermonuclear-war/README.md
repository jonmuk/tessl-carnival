# Thermonuclear War

Shall we play a game? Warheads arc across a glowing green world map, like the
WOPR's screen in _WarGames_. Shoot them down before they hit five countries.

## The screen

- A header with the round's clock.
- The WOPR console on the left. It logs every launch (source, target and ETA),
  every warhead you destroy and every city hit, with alerts in red. The launch
  code being cracked sits at its prompt.
- A wireframe globe at the top right, turning slowly with satellites in orbit,
  and the WOPR's tic-tac-toe in its corner.
- The world map below it, with every country marked and named.
- A NORAD footer with the launches so far, warheads destroyed, your score and
  the countries hit.

## How to play

- Move the mouse to aim the crosshair.
- Press Space to fire an interceptor from NORAD, the gold square in Colorado. It
  flies to the crosshair and bursts there. Any warhead inside the burst is
  destroyed.
- You can fire again 0.4 seconds after each interceptor.
- Warheads launch from one country at another that hasn't been hit yet, and they
  launch faster the more you destroy.
- The round ends when 5 countries have been hit.
- While you play, the WOPR plays tic-tac-toe against itself in the corner of
  the globe, trying to crack the 8 character launch code shown at the bottom of
  the console. The characters it hasn't found keep flipping.
- Every game of tic-tac-toe ends in a stalemate, and each stalemate finds one
  character of the code, which turns bright green and stops flipping.
- When all 8 characters are found, the WOPR launches every weapon at once: one
  warhead at every country that hasn't been hit yet.
- Press Space or click on the game over screen to play another round.

## Scoring

Each warhead you destroy scores 100 points. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `launch`, `launchAll`, `fire`, `step`,
  and `log` for the console),
  the WOPR's tic-tac-toe and launch code (`bestMove`, `crackCharacter`,
  `stepWopr`), and the
  `thermonuclearWar` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
