from fastapi import APIRouter, HTTPException

from ..db.client import supabase
from ..models.schemas import PlayerCreate

router = APIRouter(prefix="/api/players", tags=["players"])


@router.post("/")
async def create_player(player: PlayerCreate):
    result = supabase.table("players").insert(
        {
            "name": player.name,
            "email": player.email,
            "role": player.role,
            "ntrp_rating": player.ntrp_rating,
            "usta_rank": player.usta_rank,
            "coach_id": player.coach_id,
        }
    ).execute()
    return result.data[0]


@router.get("/{player_id}")
async def get_player(player_id: str):
    result = supabase.table("players").select("*").eq("id", player_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Player not found")
    return result.data[0]


@router.get("/{player_id}/sessions")
async def get_player_sessions(player_id: str, limit: int = 10):
    result = (
        supabase.table("sessions")
        .select("id, shot_type, overall_score, usta_percentile, created_at, status")
        .eq("player_id", player_id)
        .eq("status", "complete")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.get("/coach/{coach_id}/roster")
async def get_coach_roster(coach_id: str):
    players_result = supabase.table("players").select("*").eq("coach_id", coach_id).execute()
    players = players_result.data

    roster = []
    for player in players:
        sessions_result = (
            supabase.table("sessions")
            .select("overall_score, created_at, shot_type")
            .eq("player_id", player["id"])
            .eq("status", "complete")
            .order("created_at", desc=True)
            .limit(6)
            .execute()
        )
        sessions = sessions_result.data

        latest_score = sessions[0]["overall_score"] if sessions else None
        prev_score = sessions[1]["overall_score"] if len(sessions) >= 2 else None
        weekly_change = (latest_score - prev_score) if (latest_score is not None and prev_score is not None) else 0
        trend = "improving" if weekly_change > 0 else ("declining" if weekly_change < 0 else "flat")

        roster.append(
            {
                **player,
                "recent_sessions": sessions,
                "latest_score": latest_score,
                "weekly_change": weekly_change,
                "trend": trend,
            }
        )

    return roster
