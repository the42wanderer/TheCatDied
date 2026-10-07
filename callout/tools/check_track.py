import json, sys, cv2, numpy as np
T = json.load(open(sys.argv[1]))
# key-frame points to verify: (shot, design_frame, x, y)
P = [('showroom', 90, 1187, 597), ('road', 240, 874, 600), ('road', 315, 954, 604), ('closeup', 390, 900, 270),
     ('front', 510, 330, 730), ('front', 510, 1496, 730), ('side', 660, 1400, 960)]
cap = cv2.VideoCapture(sys.argv[2]); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
def M(shot, f):
    a, b, tx, ty = T[shot]['frames'][f - T[shot]['start']]
    return np.array([[a, -b, tx], [b, a, ty], [0, 0, 1]])
tiles = []
for shot, d, x, y in P:
    s = T[shot]; n = len(s['frames'])
    for f in [s['start'] + 2, s['start'] + n // 2, s['start'] + n - 3]:
        R = M(shot, f) @ np.linalg.inv(M(shot, d))
        px, py, _ = R @ [x, y, 1]
        img = frames[f].copy()
        cv2.circle(img, (int(px), int(py)), 18, (0, 0, 255), 4)
        x0 = int(np.clip(px - 240, 0, 1920 - 480)); y0 = int(np.clip(py - 135, 0, 1080 - 270))
        tiles.append(cv2.putText(img[y0:y0 + 270, x0:x0 + 480].copy(), f'{shot} f{f}', (8, 24), 0, 0.7, (0, 255, 255), 2))
rows = [np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]
cv2.imwrite(sys.argv[3], np.vstack(rows))
