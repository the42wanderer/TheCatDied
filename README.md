# Cactus Cataclysm (Prototype)

A playful browser shooter prototype inspired by roguelike horde-survival loops:

- Play as a cactus cowboy with a gun.
- Survive increasingly chaotic waves of cats.
- Pick upgrades every 20 cat takedowns.

## Run locally

Because this is a browser game, use a static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: left click or `Space`
- Dash: `Shift`

## MVP features implemented

- Top-down movement + aiming
- Cat wave spawning with enemy variants
- Shooting, damage, and particle feedback
- Wave progression and upgrade choices
- Basic dash/invulnerability system
- Restartable run on death
