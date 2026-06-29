import numpy as np
from typing import Dict, List, Optional


def _lm(pose: Dict, name: str) -> Optional[np.ndarray]:
    if name not in pose:
        return None
    lm = pose[name]
    return np.array([lm["x"], lm["y"], lm["z"]], dtype=float)


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    cos_val = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cos_val, -1.0, 1.0))))


def elbow_angle_at_contact(poses: List[Dict], side: str = "right") -> float:
    angles = []
    for pose in poses:
        s = _lm(pose, f"{side}_shoulder")
        e = _lm(pose, f"{side}_elbow")
        w = _lm(pose, f"{side}_wrist")
        if all(v is not None for v in (s, e, w)):
            angles.append(_angle(s, e, w))
    return float(np.max(angles)) if angles else 0.0


def shoulder_rotation_degrees(poses: List[Dict]) -> float:
    rotations = []
    for pose in poses:
        ls = _lm(pose, "left_shoulder")
        rs = _lm(pose, "right_shoulder")
        lh = _lm(pose, "left_hip")
        rh = _lm(pose, "right_hip")
        if all(v is not None for v in (ls, rs, lh, rh)):
            sv = (rs - ls)[:2]
            hv = (rh - lh)[:2]
            cos_val = np.dot(sv, hv) / (np.linalg.norm(sv) * np.linalg.norm(hv) + 1e-8)
            rotations.append(float(np.degrees(np.arccos(np.clip(cos_val, -1.0, 1.0)))))
    return float(np.max(rotations)) if rotations else 0.0


def wrist_snap(poses: List[Dict], fps: int = 30) -> float:
    positions = []
    for pose in poses:
        w = _lm(pose, "right_wrist")
        if w is not None:
            positions.append(w[:2])
    if len(positions) < 2:
        return 0.0
    speeds = [np.linalg.norm(positions[i] - positions[i - 1]) * 10.0 * fps for i in range(1, len(positions))]
    return float(np.max(speeds))


def weight_transfer(poses: List[Dict]) -> float:
    com_xs = []
    for pose in poses:
        lh = _lm(pose, "left_hip")
        rh = _lm(pose, "right_hip")
        if lh is not None and rh is not None:
            com_xs.append(float((lh[0] + rh[0]) / 2))
    if len(com_xs) < 2:
        return 50.0
    shift = abs(com_xs[-1] - com_xs[0])
    return float(min(100.0, shift / 0.25 * 100.0))


def hip_timing(poses: List[Dict]) -> int:
    hip_angles, sh_angles = [], []
    for pose in poses:
        lh = _lm(pose, "left_hip")
        rh = _lm(pose, "right_hip")
        ls = _lm(pose, "left_shoulder")
        rs = _lm(pose, "right_shoulder")
        if all(v is not None for v in (lh, rh, ls, rs)):
            hip_angles.append(float(np.degrees(np.arctan2(*(rh - lh)[:2][::-1]))))
            sh_angles.append(float(np.degrees(np.arctan2(*(rs - ls)[:2][::-1]))))
    if len(hip_angles) < 2:
        return 0
    hip_vel = [abs(hip_angles[i] - hip_angles[i - 1]) for i in range(1, len(hip_angles))]
    sh_vel = [abs(sh_angles[i] - sh_angles[i - 1]) for i in range(1, len(sh_angles))]
    return abs(int(np.argmax(sh_vel)) - int(np.argmax(hip_vel)))


def knee_bend(poses: List[Dict], side: str = "right") -> float:
    angles = []
    for pose in poses:
        h = _lm(pose, f"{side}_hip")
        k = _lm(pose, f"{side}_knee")
        a = _lm(pose, f"{side}_ankle")
        if all(v is not None for v in (h, k, a)):
            angles.append(_angle(h, k, a))
    return float(np.min(angles)) if angles else 0.0


def calculate_all_metrics(poses: List[Dict], shot_type: str = "serve") -> Dict:
    return {
        "elbow_angle":      elbow_angle_at_contact(poses),
        "shoulder_rotation": shoulder_rotation_degrees(poses),
        "wrist_snap":       wrist_snap(poses),
        "weight_transfer":  weight_transfer(poses),
        "hip_timing":       hip_timing(poses),
        "knee_bend":        knee_bend(poses),
    }
