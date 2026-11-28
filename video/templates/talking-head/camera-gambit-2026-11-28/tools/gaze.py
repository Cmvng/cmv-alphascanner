"""Head pitch and eye direction for every 3rd frame of the owner's recording (MediaPipe face landmarker).
  python3.13 gaze.py <video> <model> <out.json>"""
import sys, json, math
import cv2, numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
vid, model, out = sys.argv[1:4]
opts = vision.FaceLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.VIDEO,
                                    output_face_blendshapes=True, output_facial_transformation_matrixes=True, num_faces=1)
lm = vision.FaceLandmarker.create_from_options(opts)
cap = cv2.VideoCapture(vid); fps = cap.get(cv2.CAP_PROP_FPS); i = 0; rows = []
while True:
    ok, f = cap.read()
    if not ok: break
    if i % 3 == 0:
        t = i / fps
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cv2.resize(f, (540, 960)), cv2.COLOR_BGR2RGB))
        r = lm.detect_for_video(img, int(t * 1000))
        if r.face_blendshapes:
            bs = {c.category_name: c.score for c in r.face_blendshapes[0]}; M = np.array(r.facial_transformation_matrixes[0])
            pitch = math.degrees(math.atan2(-M[1, 2], M[2, 2])); yaw = math.degrees(math.asin(max(-1, min(1, M[0, 2]))))
            rows.append({'t': round(t, 2), 'pitch': round(pitch, 1), 'yaw': round(yaw, 1),
                         'down': round((bs['eyeLookDownLeft'] + bs['eyeLookDownRight']) / 2, 3),
                         'up': round((bs['eyeLookUpLeft'] + bs['eyeLookUpRight']) / 2, 3),
                         'blink': round((bs['eyeBlinkLeft'] + bs['eyeBlinkRight']) / 2, 3)})
    i += 1
json.dump(rows, open(out, 'w')); print(len(rows), 'rows')
