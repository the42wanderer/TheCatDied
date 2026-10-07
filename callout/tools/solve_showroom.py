"""Solve the opening-shot camera and both cars' poses from hand-picked points on frame 90.

One shared camera (focal length searched), one pose per car. Writes public/showroom_pose.json
with each car's model matrix in three.js camera space (camera at origin looking down -z).
"""
import json
import math
import cv2
import numpy as np

# (model xyz [m], pixel). Model: +x forward, +y up, +z car's right.
BLACK = [
    ((2.33, 1.06, 0.66), (1187, 602)),   # right headlamp (screen left)
    ((2.33, 1.06, -0.66), (1572, 602)),  # left headlamp
    ((2.31, 1.05, 0.0), (1357, 608)),    # star
    ((2.30, 1.20, 0.42), (1225, 560)),   # grille top, right end
    ((2.30, 0.90, -0.42), (1500, 640)),  # grille bottom, left end
    ((0.80, 1.97, 0.80), (1310, 382)),   # windscreen top corners
    ((0.80, 1.97, -0.80), (1685, 370)),
    ((1.40, 0.0, 0.81), (1190, 845)),    # front tyre contact patches
    ((1.40, 0.0, -0.81), (1665, 840)),
]
WHITE = [
    ((2.33, 1.06, -0.66), (420, 578)),   # left headlamp (screen right)
    ((2.31, 1.05, 0.0), (243, 580)),     # star
    ((2.30, 1.20, 0.42), (163, 543)),    # grille top, right end
    ((2.30, 0.90, -0.42), (345, 615)),   # grille bottom, left end
    ((1.40, 0.39, -0.95), (640, 760)),   # left front hub
    ((1.40, 0.0, 0.81), (250, 830)),     # right front tyre contact
    ((0.80, 1.97, 0.80), (495, 355)),    # windscreen top corners
    ((0.80, 1.97, -0.80), (775, 348)),
    ((-0.16, 1.20, -0.91), (895, 572)),  # front door handle
]


def solve(pairs, K):
    obj = np.array([p[0] for p in pairs], np.float64)
    img = np.array([p[1] for p in pairs], np.float64)
    ok, rvec, tvec = cv2.solvePnP(obj, img, K, None, flags=cv2.SOLVEPNP_ITERATIVE)
    proj, _ = cv2.projectPoints(obj, rvec, tvec, K, None)
    err = np.sqrt(((proj.reshape(-1, 2) - img) ** 2).sum(1)).mean()
    return err, rvec, tvec


best = None
for fov in np.arange(20, 80, 0.25):
    f = 540 / math.tan(math.radians(fov) / 2)
    K = np.array([[f, 0, 960], [0, f, 540], [0, 0, 1]])
    eb, rb, tb = solve(BLACK, K)
    ew, rw, tw = solve(WHITE, K)
    if best is None or eb + ew < best[0]:
        best = (eb + ew, fov, (eb, rb, tb), (ew, rw, tw))

_, fov, b, w = best
F = np.diag([1, -1, -1])  # OpenCV camera -> three.js camera axes


def to_three(rvec, tvec):
    R, _ = cv2.Rodrigues(rvec)
    M = np.eye(4)
    M[:3, :3] = F @ R
    M[:3, 3] = F @ tvec.ravel()
    return M


out = {'fov': float(fov), 'black': to_three(b[1], b[2]).T.ravel().tolist(), 'white': to_three(w[1], w[2]).T.ravel().tolist()}
json.dump(out, open('public/showroom_pose.json', 'w'))
print(f'fov {fov}  black err {b[0]:.1f}px  white err {w[0]:.1f}px')
for name, (_, r, t) in (('black', b), ('white', w)):
    print(name, 'distance', round(float(np.linalg.norm(t)), 2), 'm')
