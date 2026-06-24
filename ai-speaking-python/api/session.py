"""AI Speaking Service - Session API endpoints."""

from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from core.orchestrator import SpeakingOrchestrator, SessionNotFound
from providers.stt import STTProvider
from providers.stt import TTSProvider
from infrastructure.quota import QuotaExceeded

router = APIRouter(prefix="/api/ai/speaking", tags=["speaking-session"])
orch = SpeakingOrchestrator()
stt = STTProvider()
tts = TTSProvider()


class StartSessionReq(BaseModel):
    topic: str = ""
    focus_area: str = "general"
    practice_mode: str = "mock_test"


class SubmitAnswerReq(BaseModel):
    answer_text: str
    duration_ms: int = 0


class TTSRequest(BaseModel):
    text: str
    voice: str = "troy"


@router.post("/sessions")
async def create_session(req: StartSessionReq,
                          x_user_id: str = Header(default="anonymous"),
                          x_user_name: str = Header(default=""),
                          x_user_role: str = Header(default="student")):
    try:
        s = orch.create_session(x_user_id, x_user_name, x_user_role,
                                 {"topic": req.topic, "focusArea": req.focus_area, "practiceMode": req.practice_mode})
        return {"sessionId": s.id, "status": s.status, "phase": s.current_phase, "userId": s.user_id}
    except QuotaExceeded as e:
        raise HTTPException(429, str(e))


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    try:
        s = orch.get_session(session_id)
        return {"sessionId": s.id, "userId": s.user_id, "status": s.status, "phase": s.current_phase,
                "totalTurns": s.total_turns, "turns": [{"turnNumber": t.turn_number, "question": t.question_text,
                "answer": t.answer_text, "part": t.part} for t in s.turns]}
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/question")
async def generate_question(session_id: str):
    try:
        return await orch.generate_question(session_id)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/answer")
async def submit_answer(session_id: str, req: SubmitAnswerReq):
    try:
        return await orch.submit_answer(session_id, req.answer_text, req.duration_ms)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/audio")
async def upload_audio(session_id: str, file: UploadFile = File(...)):
    try:
        audio_data = await file.read()
        result = await stt.transcribe(audio_data, file.filename or "audio.webm")
        duration = result.get("duration", 0)
        return await orch.submit_audio(session_id, audio_data, int(duration * 1000) if duration else 0, result)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")
    except Exception as e:
        raise HTTPException(400, f"Audio processing failed: {e}")


@router.post("/sessions/{session_id}/next-phase")
async def next_phase(session_id: str):
    try:
        return await orch.next_phase(session_id)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    try:
        return orch.end_session(session_id)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/evaluate")
async def evaluate_session(session_id: str, x_user_id: str = Header(default="")):
    try:
        result = await orch.evaluate(session_id, x_user_id)
        from models.scoring import SpeakingResultDTO
        return SpeakingResultDTO.from_result(result)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    try:
        audio = await tts.synthesize(req.text, req.voice)
        return StreamingResponse(io.BytesIO(audio), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(400, f"TTS failed: {e}")
