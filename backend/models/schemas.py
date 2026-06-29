from pydantic import BaseModel
from enum import Enum
from typing import Optional


class ShotType(str, Enum):
    serve = "serve"
    forehand = "forehand"
    backhand = "backhand"
    slice = "slice"
    volley = "volley"


class PlayerLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    elite = "elite"


class PlayerCreate(BaseModel):
    name: str
    email: str
    role: str = "player"
    ntrp_rating: Optional[float] = None
    usta_rank: Optional[int] = None
    coach_id: Optional[str] = None


class MetricScore(BaseModel):
    player_value: float
    elite_value: float
    deviation: float
    status: str  # "green" | "amber" | "red"
    score: int


class AnalysisResult(BaseModel):
    session_id: str
    shot_type: str
    player_level: str
    elbow_angle: Optional[float]
    shoulder_rotation: Optional[float]
    wrist_snap_speed: Optional[float]
    weight_shift: Optional[float]
    hip_shoulder_timing: Optional[int]
    knee_bend_depth: Optional[float]
    overall_score: Optional[int]
    usta_percentile: Optional[int]
    ai_feedback: Optional[dict]
    landmarks_data: Optional[list]
    status: str
