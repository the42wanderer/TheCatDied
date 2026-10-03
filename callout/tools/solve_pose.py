"""Fit the wireframe camera to the frozen photo from hand-picked correspondences."""
import math
import cv2
import numpy as np

# (model xyz in metres, photo pixel) — right-hand side of the car, frame 628.
PAIRS = [
    ((-1.49, 0.39, 0.95), (385, 860)),   # rear wheel hub
    ((1.40, 0.39, 0.95), (1460, 1048)),  # front wheel hub
    ((-2.12, 1.97, 0.80), (395, 300)),   # roof, rear corner
    ((0.80, 1.97, 0.80), (980, 90)),     # roof, top of A-pillar
    ((1.00, 1.30, 0.87), (1085, 405)),   # A-pillar base
    ((-2.20, 1.30, 0.91), (345, 515)),   # rear body corner at the belt
    ((0.98, 0.52, 0.91), (1035, 860)),   # front door, bottom front corner
    ((-0.30, 1.30, 0.91), (655, 505)),   # B-pillar seam at the belt
]
obj = np.array([p[0] for p in PAIRS], np.float64)
img = np.array([p[1] for p in PAIRS], np.float64)

best = None
for fov in np.arange(40, 125, 0.5):
    f = 540 / math.tan(math.radians(fov) / 2)
    K = np.array([[f, 0, 960], [0, f, 540], [0, 0, 1]])
    ok, rvec, tvec = cv2.solvePnP(obj, img, K, None, flags=cv2.SOLVEPNP_ITERATIVE)
    proj, _ = cv2.projectPoints(obj, rvec, tvec, K, None)
    err = np.sqrt(((proj.reshape(-1, 2) - img) ** 2).sum(1)).mean()
    if best is None or err < best[0]:
        best = (err, fov, rvec, tvec)

err, fov, rvec, tvec = best
R, _ = cv2.Rodrigues(rvec)
C = (-R.T @ tvec).ravel()
fwd = R.T @ np.array([0, 0, 1.0])
target = C + fwd * 4
print(f'mean error {err:.1f}px  fov {fov}')
print('pos', [round(v, 3) for v in C], 'target', [round(v, 3) for v in target])
