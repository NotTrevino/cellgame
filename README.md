# Cell Game

A browser-based multiplayer cell-eating game (agar.io-style), built with vanilla JavaScript.

**[Live Demo →](https://nottrevino.github.io/cellgame)**

---

## Features

### Three Game Modes

| Mode | Description |
|------|-------------|
| **0 — Spectator** | AI vs AI. Watch two independent AI agents compete automatically; games auto-restart and stats accumulate across runs. |
| **1 — Single Player** | Human (red) vs AI (blue). Move with WASD or arrow keys. Timer starts on your first move. |
| **2 — Local Multiplayer** | Human vs human on one keyboard. Player 1 uses WASD, Player 2 uses arrow keys. |

Switch modes anytime from the dropdown in the title bar — the board resets automatically.

### Core Gameplay

- **Grow by eating**: eat green food pellets to grow. Once you're bigger than the other ball, you can eat it too.
- **Win conditions**: reach maximum size first, or eat the opposing ball.
- **Growth-directional expansion**: your cell grows toward whatever it just ate, rather than uniformly in all directions.
- **Adjustable game speed**: `+`/`-` keys scale simulation speed from 1x–10x on the fly.
- **Reset anytime**: press `R` to restart the current match.

### AI Opponents

- **P1 (red) planner**: plans a full route through visible food using a nearest-neighbor route seed, then continuously refines it in the background for a smoother, more efficient path. It also predicts where the blue AI is headed and avoids racing it for the same food, switching to direct pursuit instead when it can safely catch and eat blue before blue outgrows it.
- **P2 (blue) planner**: independently plans its own route to the nearest available food, and will break off to chase the player directly if that's the faster route to a win.
- **Path visualization** (Mode 0 only): dashed lines overlay each ball's current planned route, so you can watch the AI's decision-making live.

### Scoring & Leaderboard

- **Personal best tracking** (Single Player mode): current run time and personal best are shown live during a match.
- **Google login**: sign in with Google to save scores under your name.
- **Global leaderboard**: top 10 fastest win times, with your own entry highlighted if you're on the board.
- **Custom display name**: choose and change the name shown on the leaderboard independently of your Google account name.
- **Anti-cheat submission**: scores are validated server-side before being accepted — see architecture notes for details.

### Spectator Stats (Mode 0)

- Running win totals for red and blue.
- Min / median / max game duration across completed runs.
- Red win percentage.

---

## Controls

| Key | Action |
|-----|--------|
| `W A S D` | Move (Player 1 / Single Player) |
| `Arrow Keys` | Move (Player 2 in Local Multiplayer, or Player 1 in other modes) |
| `+` / `-` | Increase / decrease game speed |
| `R` | Reset current match |

---

## Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML5 / CSS
- Canvas API (AI path visualization)
- Supabase (auth + leaderboard backend)
- Google OAuth (login)

---

## Local Setup

```bash
git clone https://github.com/nottrevino/cellgame.git
cd cellgame
# open index.html in a browser, or serve locally:
python3 -m http.server 8000
```

No build step or dependencies required.
