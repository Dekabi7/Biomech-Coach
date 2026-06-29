import os
import uuid
import tempfile

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..db.client import supabase
from ..models.schemas import PlayerLevel, ShotType
from ..services.ai_feedback import generate_feedback
from ..services.baseline import compare_to_baseline
from ..services.metrics import calculate_all_metrics
from ..services.pose_estimator import run_pipeline

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"}
MAX_BYTES = 200 * 1024 * 1024


async def _process_video(
    session_id: str,
    video_path: str,
    shot_type: str,
    ntrp_rating: float,
    player_level: str,
    player_id: str,
) -> None:
    try:
        pipeline = run_pipeline(video_path)
        poses = pipeline["landmarks_per_frame"]

        metrics = calculate_all_metrics(poses, shot_type)
        comparison = compare_to_baseline(metrics, shot_type, ntrp_rating)

        # AI feedback is non-blocking — metrics still save if Claude call fails
        feedback = None
        try:
            feedback = generate_feedback(comparison, shot_type, ntrp_rating)
        except Exception as ai_err:
            print(f"[Rally AI] feedback generation failed: {ai_err}")

        # Map Rally spec metric names → existing DB column names
        supabase.table("sessions").update(
            {
                "status":              "complete",
                "elbow_angle":         metrics["elbow_angle"],
                "shoulder_rotation":   metrics["shoulder_rotation"],
                "wrist_snap_speed":    metrics["wrist_snap"],
                "weight_shift":        metrics["weight_transfer"],
                "hip_shoulder_timing": metrics["hip_timing"],
                "knee_bend_depth":     metrics["knee_bend"],
                "overall_score":       comparison["overall_score"],
                "usta_percentile":     comparison["usta_percentile"],
                "ai_feedback":         feedback,
                "landmarks_data":      poses[:30],
            }
        ).eq("id", session_id).execute()

    except Exception as exc:
        supabase.table("sessions").update(
            {"status": "failed", "error_message": str(exc)}
        ).eq("id", session_id).execute()

    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)


@router.post("/")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    shot_type: ShotType = Form(...),
    player_level: PlayerLevel = Form(...),
    player_id: str = Form(...),
    ntrp_rating: float = Form(default=3.0),
):
    if video.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only MP4 and MOV files are supported")

    content = await video.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 200 MB limit")

    ext = ".mov" if video.content_type == "video/quicktime" else ".mp4"

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    session_id = str(uuid.uuid4())
    storage_path = f"videos/{player_id}/{session_id}{ext}"
    supabase.storage.from_("biomech-videos").upload(storage_path, content)
    video_url = supabase.storage.from_("biomech-videos").get_public_url(storage_path)

    supabase.table("sessions").insert(
        {
            "id":           session_id,
            "player_id":    player_id,
            "shot_type":    shot_type.value,
            "player_level": player_level.value,
            "video_url":    video_url,
            "status":       "processing",
        }
    ).execute()

    background_tasks.add_task(
        _process_video,
        session_id, tmp_path, shot_type.value, ntrp_rating, player_level.value, player_id,
    )

    return JSONResponse({"session_id": session_id, "status": "processing"}, status_code=202)
