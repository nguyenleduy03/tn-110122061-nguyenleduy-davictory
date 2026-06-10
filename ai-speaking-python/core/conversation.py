"""Conversation manager for AI-driven IELTS speaking sessions."""

import random
from loguru import logger
from infrastructure.llm_client import GroqClient
from models.session import SpeakingSession

FALLBACK = {
    "PART1": ["Where are you from?", "Do you work or study?", "What do you do in your free time?", "Tell me about your hometown.", "What kind of music do you enjoy?"],
    "PART2": ["Describe a place you would like to visit. You should say: where it is, what you can see there, why you want to go, and how you would feel.",
              "Describe a memorable event. You should say: when it happened, what happened, who was involved, and why it was memorable.",
              "Describe someone who influenced you. You should say: who they are, how you know them, what they are like, and why they influenced you."],
    "PART3": ["Why do people enjoy traveling?", "How has technology changed work?", "What are advantages of living in a big city?", "Do children face more pressure today?", "How can governments encourage healthier lifestyles?"],
}


class ConversationManager:
    def __init__(self):
        self.llm = GroqClient()

    async def generate_question(self, session: SpeakingSession) -> str:
        phase = session.current_phase
        history = "\n".join(f"Q: {t.question_text}\nA: {t.answer_text}" for t in session.turns[-3:])
        role = {"PART1": "simple personal questions about familiar topics",
                "PART2": "present a cue card for 1-2 minute talk",
                "PART3": "abstract analytical questions related to the topic"}.get(phase, "appropriate questions")
        try:
            resp = await self.llm.chat(
                f"You are an IELTS Speaking examiner. Ask {role}. Be natural.",
                f"Phase: {phase}\nHistory:\n{history}\n\nGenerate ONE {phase} question:",
                temperature=0.3, max_tokens=150)
            q = resp.content.strip()
            if q and len(q) >= 10:
                return q
        except Exception as e:
            logger.warning(f"Question generation failed: {e}")
        used = {t.question_text for t in session.turns}
        avail = [q for q in FALLBACK.get(phase, FALLBACK["PART1"]) if q not in used]
        return random.choice(avail if avail else FALLBACK["PART1"])
