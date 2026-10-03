# G 450 d lighting callouts (Remotion)

Brutalist spec overlays for `../APR0001B_SPEED(2).mp4`.

- `renders/G450d-lighting-showcase.mp4` – the finished edit (source video + animated cards, original audio)
- `frames/` – the approved design stills
- `src/content.ts` – every piece of on-screen copy
- `src/series.ts` – per-card layout (panel position, target boxes) in design-frame pixels
- `src/Showcase.tsx` – the timeline: which card shows on which frames of which shot
- `public/tracks.json` – per-frame camera/car tracking used to keep target boxes locked on
- `src/wire/` – the tail-light sequence: a G-Class wireframe built from primitives (`model.ts`, real
  W465 length/wheelbase/width), its camera move (`camera.ts`) and the photo -> line art -> 3D hand-off (`WireTail.tsx`)

## Setup

```sh
npm install
cp '../APR0001B_SPEED(2).mp4' public/source.mp4
npx remotion studio            # live preview of every composition
```

If Remotion can't download Chrome, point it at a local headless shell with `REMOTION_BROWSER=/path/to/headless_shell`.

## Render

```sh
# full edit
npx remotion render src/index.ts Showcase out/showcase.mp4 --codec=h264 --crf=17
# one design still
npx remotion still src/index.ts Detail-01-Headlamps out/headlamps.png
```

## Wireframe hand-off assets

The side shot freezes on frame 628. Its photo and traced line art are generated, and the 3D start pose
is solved from points picked on that photo:

```sh
python3 tools/edges.py public/source.mp4 628 public/side_freeze.jpg public/side_edges.png
python3 tools/solve_pose.py   # prints P0 for src/wire/camera.ts
```

## Re-tracking

Only needed if the source edit changes (shot boundaries live in `tools/track.py`):

```sh
pip install opencv-python-headless numpy
python3 tools/track.py public/source.mp4 public/tracks.json
python3 tools/check_track.py public/tracks.json public/source.mp4 out/trackcheck.jpg  # visual check
```
