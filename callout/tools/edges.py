"""Freeze a frame from the source and turn it into bone-coloured line art with alpha.

Usage: python3 tools/edges.py public/source.mp4 <frame> public/side_freeze.jpg public/side_edges.png
"""
import sys

import cv2
import numpy as np

src, frame, freeze_out, edges_out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
cap = cv2.VideoCapture(src)
cap.set(cv2.CAP_PROP_POS_FRAMES, frame)
ok, img = cap.read()
assert ok, 'could not read frame'
cv2.imwrite(freeze_out, img, [cv2.IMWRITE_JPEG_QUALITY, 95])

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
gray = cv2.bilateralFilter(gray, 9, 60, 60)
edges = cv2.Canny(gray, 40, 110)
edges = cv2.dilate(edges, np.ones((2, 2), np.uint8))

bone = (218, 227, 231)  # #e7e3da in BGR
out = np.zeros((img.shape[0], img.shape[1], 4), np.uint8)
out[..., 0], out[..., 1], out[..., 2] = bone
out[..., 3] = edges
cv2.imwrite(edges_out, out)
