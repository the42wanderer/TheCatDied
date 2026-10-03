"""Camera/object tracking for the overlay anchors.

For each shot we track feature points inside a region of interest and chain
frame-to-frame similarity transforms (scale + rotation + translation).
Output: public/tracks.json with, per shot, a 2x3 matrix per frame that maps
coordinates in the shot's key frame to coordinates in that frame.
"""
import json
import sys

import cv2
import numpy as np

SRC = sys.argv[1]
OUT = sys.argv[2]

# start/end are frame indices (end exclusive); roi/exclude are in key-frame pixels.
SHOTS = {
    'showroom': {'start': 0, 'end': 181, 'key': 90, 'roi': (0, 0, 1920, 1080), 'exclude': [(930, 380, 1210, 900)]},
    'road': {'start': 181, 'end': 353, 'key': 240, 'roi': (780, 330, 1400, 880), 'exclude': []},
    'closeup': {'start': 353, 'end': 441, 'key': 390, 'roi': (0, 0, 1920, 1080), 'exclude': []},
    'front': {'start': 441, 'end': 609, 'key': 510, 'roi': (0, 0, 1920, 1080), 'exclude': []},
    'side': {'start': 609, 'end': 784, 'key': 660, 'roi': (200, 100, 1920, 1080), 'exclude': []},
}

cap = cv2.VideoCapture(SRC)
frames = []
while True:
    ok, f = cap.read()
    if not ok:
        break
    frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY))
print('frames', len(frames))

LK = dict(winSize=(31, 31), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))


def to3(m):
    return np.vstack([m, [0, 0, 1]])


def mask_for(shape, roi, exclude, M):
    """ROI (minus exclusions) from key-frame coords warped into the current frame."""
    key_mask = np.zeros(shape, np.uint8)
    x0, y0, x1, y1 = roi
    key_mask[y0:y1, x0:x1] = 255
    for ex in exclude:
        key_mask[ex[1]:ex[3], ex[0]:ex[2]] = 0
    return cv2.warpAffine(key_mask, M[:2], (shape[1], shape[0]))


def detect(gray, mask):
    pts = cv2.goodFeaturesToTrack(gray, maxCorners=400, qualityLevel=0.01, minDistance=12, mask=mask)
    return pts if pts is not None else np.empty((0, 1, 2), np.float32)


def run(shot, step):
    s = SHOTS[shot]
    idx = list(range(s['key'], s['end'])) if step > 0 else list(range(s['key'], s['start'] - 1, -1))
    M = np.eye(3)
    out = {idx[0]: M.copy()}
    pts = detect(frames[idx[0]], mask_for(frames[0].shape, s['roi'], s['exclude'], M))
    for a, b in zip(idx, idx[1:]):
        nxt, st, _ = cv2.calcOpticalFlowPyrLK(frames[a], frames[b], pts, None, **LK)
        back, st2, _ = cv2.calcOpticalFlowPyrLK(frames[b], frames[a], nxt, None, **LK)
        fb = np.linalg.norm(pts - back, axis=2).ravel()
        good = (st.ravel() == 1) & (st2.ravel() == 1) & (fb < 1.0)
        p0, p1 = pts[good], nxt[good]
        step_m, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.0)
        if step_m is None:
            step_m = np.array([[1, 0, 0], [0, 1, 0]], float)
            inl = np.ones((len(p1), 1), np.uint8)
        M = to3(step_m) @ M
        out[b] = M.copy()
        pts = p1[inl.ravel() == 1].reshape(-1, 1, 2)
        if len(pts) < 80:
            fresh = detect(frames[b], mask_for(frames[0].shape, s['roi'], s['exclude'], M))
            pts = np.concatenate([pts, fresh]).astype(np.float32)
    return out


result = {}
for name, s in SHOTS.items():
    fwd = run(name, 1)
    bwd = run(name, -1)
    mats = {**bwd, **fwd}
    seq = []
    for f in range(s['start'], s['end']):
        m = mats[f]
        seq.append([round(float(v), 5) for v in (m[0, 0], m[1, 0], m[0, 2], m[1, 2])])
    scales = [np.hypot(a, b) for a, b, _, _ in seq]
    print(f"{name}: scale {min(scales):.3f}-{max(scales):.3f}, "
          f"tx {min(v[2] for v in seq):.0f}..{max(v[2] for v in seq):.0f}, "
          f"ty {min(v[3] for v in seq):.0f}..{max(v[3] for v in seq):.0f}")
    result[name] = {'start': s['start'], 'key': s['key'], 'frames': seq}

json.dump(result, open(OUT, 'w'))
