from fastapi import APIRouter, HTTPException

from ..db.client import supabase

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/{session_id}/status")
async def get_status(session_id: str):
    result = supabase.table("sessions").select("id, status, error_message").eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data[0]


@router.get("/{session_id}")
async def get_analysis(session_id: str):
    result = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = result.data[0]

    if session["status"] == "processing":
        return {"status": "processing"}

    if session["status"] == "failed":
        raise HTTPException(status_code=500, detail=session.get("error_message", "Analysis failed"))

    return session
