import cv2
import mediapipe as mp
import numpy as np
from typing import List, Dict, Optional, Tuple

mp_pose = mp.solutions.pose

# Only the joints we care about for tennis biomechanics
KEY_LANDMARKS = {
    11: "left_shoulder",
    12: "right_shoulder",
    13: "left_elbow",
    14: "right_elbow",
    15: "left_wrist",
    16: "right_wrist",
    23: "left_hip",
    24: "right_hip",
    25: "left_knee",
    26: "right_knee",
    27: "left_ankle",
    28: "right_ankle",
}


def extract_frames(video_path: str, target_fps: int = 30) -> List[np.ndarray]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_step = max(1, round(video_fps / target_fps))

    frames = []
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_step == 0:
            frames.append(frame)
        frame_idx += 1

    cap.release()
    return frames


def detect_swing_window(frames: List[np.ndarray]) -> Tuple[int, int]:
    """Find peak-motion window via frame differencing."""
    if len(frames) < 3:
        return 0, len(frames) - 1

    motion_scores = []
    for i in range(1, len(frames)):
        diff = cv2.absdiff(frames[i - 1], frames[i])
        gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        motion_scores.append(float(gray.mean()))

    peak_idx = int(np.argmax(motion_scores)) + 1

    # ±15 frames (~0.5 s at 30 fps) around the peak
    half_window = 15
    start = max(0, peak_idx - half_window)
    end = min(len(frames) - 1, peak_idx + half_window)
    return start, end


def estimate_poses(frames: List[np.ndarray]) -> List[Optional[Dict]]:
    """Run MediaPipe Pose on each frame; return per-frame landmark dicts."""
    poses: List[Optional[Dict]] = []

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        for frame in frames:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)

            if results.pose_landmarks:
                landmarks = {}
                for idx, name in KEY_LANDMARKS.items():
                    lm = results.pose_landmarks.landmark[idx]
                    landmarks[name] = {
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,
                        "visibility": lm.visibility,
                    }
                poses.append(landmarks)
            else:
                poses.append(None)

    return poses


def run_pipeline(video_path: str) -> Dict:
    """Full CV pipeline: extract → detect swing → estimate poses."""
    frames = extract_frames(video_path)
    if not frames:
        raise ValueError("No frames extracted from video")

    start, end = detect_swing_window(frames)
    swing_frames = frames[start : end + 1]

    poses = estimate_poses(swing_frames)
    valid_poses = [p for p in poses if p is not None]

    if not valid_poses:
        raise ValueError("MediaPipe detected no pose landmarks in this video")

    return {
        "frames_analysed": len(swing_frames),
        "poses_detected": len(valid_poses),
        "landmarks_per_frame": valid_poses,
        "swing_window": {"start": start, "end": end},
    }
