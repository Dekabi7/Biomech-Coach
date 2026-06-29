"""
Elite baseline comparison and overall scoring.
Metric names match the Rally AI spec: elbow_angle, shoulder_rotation,
wrist_snap, weight_transfer, hip_timing, knee_bend.

Baselines are hardcoded from ITF/ATP coaching literature until USTA
performance data is released on July 11. Replace BASELINES values then.
"""
from typing import Dict

BASELINES: Dict[str, Dict[str, Dict[str, float]]] = {
    "serve": {
        "ntrp_3.0_3.5": {
            "elbow_angle":       105.0,
            "shoulder_rotation":  80.0,
            "wrist_snap":          8.5,
            "weight_transfer":    68.0,
            "hip_timing":          2.0,
            "knee_bend":         140.0,
        },
        "ntrp_4.0_plus": {
            "elbow_angle":       112.0,
            "shoulder_rotation":  85.0,
            "wrist_snap":          9.8,
            "weight_transfer":    74.0,
            "hip_timing":          3.0,
            "knee_bend":         145.0,
        },
    },
    "forehand": {
        "ntrp_3.0_3.5": {
            "elbow_angle":       130.0,
            "shoulder_rotation":  85.0,
            "wrist_snap":          7.5,
            "weight_transfer":    65.0,
            "hip_timing":          2.0,
            "knee_bend":         138.0,
        },
        "ntrp_4.0_plus": {
            "elbow_angle":       138.0,
            "shoulder_rotation":  92.0,
            "wrist_snap":          8.8,
            "weight_transfer":    72.0,
            "hip_timing":          3.0,
            "knee_bend":         143.0,
        },
    },
    "backhand": {
        "ntrp_3.0_3.5": {
            "elbow_angle":       125.0,
            "shoulder_rotation":  88.0,
            "wrist_snap":          7.0,
            "weight_transfer":    63.0,
            "hip_timing":          2.0,
            "knee_bend":         135.0,
        },
        "ntrp_4.0_plus": {
            "elbow_angle":       132.0,
            "shoulder_rotation":  95.0,
            "wrist_snap":          8.2,
            "weight_transfer":    70.0,
            "hip_timing":          3.0,
            "knee_bend":         140.0,
        },
    },
    "slice": {
        "ntrp_3.0_3.5": {
            "elbow_angle":       138.0,  # more extended, open face
            "shoulder_rotation":  72.0,  # less rotation than topspin
            "wrist_snap":          5.0,  # controlled, not snapping
            "weight_transfer":    62.0,
            "hip_timing":          1.0,  # less hip-shoulder separation
            "knee_bend":         135.0,
        },
        "ntrp_4.0_plus": {
            "elbow_angle":       145.0,
            "shoulder_rotation":  78.0,
            "wrist_snap":          5.8,
            "weight_transfer":    68.0,
            "hip_timing":          2.0,
            "knee_bend":         140.0,
        },
    },
    "volley": {
        "ntrp_3.0_3.5": {
            "elbow_angle":       110.0,
            "shoulder_rotation":  45.0,
            "wrist_snap":          5.5,
            "weight_transfer":    60.0,
            "hip_timing":          1.0,
            "knee_bend":         132.0,
        },
        "ntrp_4.0_plus": {
            "elbow_angle":       118.0,
            "shoulder_rotation":  52.0,
            "wrist_snap":          6.5,
            "weight_transfer":    68.0,
            "hip_timing":          2.0,
            "knee_bend":         138.0,
        },
    },
}

UNITS: Dict[str, str] = {
    "elbow_angle":       "°",
    "shoulder_rotation": "°",
    "wrist_snap":        "m/s",
    "weight_transfer":   "%",
    "hip_timing":        "frames",
    "knee_bend":         "°",
}

TOLERANCES: Dict[str, Dict[str, float]] = {
    "elbow_angle":       {"green": 5.0,  "amber": 12.0},
    "shoulder_rotation": {"green": 5.0,  "amber": 12.0},
    "wrist_snap":        {"green": 0.5,  "amber": 1.5},
    "weight_transfer":   {"green": 5.0,  "amber": 10.0},
    "hip_timing":        {"green": 1.0,  "amber": 2.0},
    "knee_bend":         {"green": 5.0,  "amber": 12.0},
}

WEIGHTS: Dict[str, float] = {
    "elbow_angle":       0.25,
    "shoulder_rotation": 0.20,
    "wrist_snap":        0.20,
    "weight_transfer":   0.15,
    "hip_timing":        0.10,
    "knee_bend":         0.10,
}


def _get_baseline(shot_type: str, ntrp_rating: float) -> Dict[str, float]:
    shot = BASELINES.get(shot_type, BASELINES["serve"])
    tier = "ntrp_4.0_plus" if ntrp_rating >= 4.0 else "ntrp_3.0_3.5"
    return shot[tier]


def _score_metric(player_val: float, elite_val: float, tol: Dict[str, float]) -> Dict:
    deviation = abs(player_val - elite_val)
    if deviation <= tol["green"]:
        status, score = "green", 100
    elif deviation <= tol["amber"]:
        progress = (deviation - tol["green"]) / (tol["amber"] - tol["green"])
        status, score = "amber", int(100 - progress * 40)
    else:
        progress = min(1.0, (deviation - tol["amber"]) / tol["amber"])
        status, score = "red", int(60 - progress * 60)
    return {
        "player_value": round(player_val, 1),
        "elite_value":  round(elite_val, 1),
        "deviation":    round(deviation, 1),
        "status":       status,
        "score":        max(0, score),
    }


def compare_to_baseline(metrics: Dict, shot_type: str, ntrp_rating: float) -> Dict:
    baseline = _get_baseline(shot_type, ntrp_rating)
    scored: Dict[str, Dict] = {}
    weighted_total = 0.0
    total_weight = sum(WEIGHTS.get(k, 0) for k in baseline)

    for metric, elite_val in baseline.items():
        player_val = float(metrics.get(metric, elite_val))
        result = _score_metric(player_val, elite_val, TOLERANCES[metric])
        # Attach unit and baseline for Rally AI input format
        result["unit"] = UNITS[metric]
        result["baseline"] = elite_val
        result["value"] = player_val
        scored[metric] = result
        weighted_total += result["score"] * WEIGHTS.get(metric, 0.1)

    overall_score = int(min(100, max(0, weighted_total / total_weight)))
    usta_percentile = max(1, min(99, int(overall_score * 0.9 - 10)))

    return {
        "metrics":         scored,
        "overall_score":   overall_score,
        "usta_percentile": usta_percentile,
        "baseline_tier":   "USTA 4.0+" if ntrp_rating >= 4.0 else "USTA 3.0–3.5",
    }
