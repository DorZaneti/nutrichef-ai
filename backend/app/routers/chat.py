import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.config import CHAT_LIMIT_PER_IP, CHAT_MODEL
from app.limits import LIMIT_DETAIL, BudgetExceeded, per_ip_limit, require_budget
from app.schemas import ChatMessage
from app.services.agent import run_agent

router = APIRouter()

# Budget first, so a request turned away app-wide doesn't use up the visitor's own quota.
CHAT_LIMITS = [Depends(require_budget(CHAT_MODEL)), Depends(per_ip_limit("chat", CHAT_LIMIT_PER_IP))]


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/api/chat", dependencies=CHAT_LIMITS)
async def chat(chat_request: ChatMessage):
    """Non-streaming fallback: same agent, collected into one response."""
    try:
        response_text = ""
        actions = []
        async for event in run_agent(chat_request):
            if event["type"] == "delta":
                response_text += event["text"]
            elif event["type"] == "action":
                actions.append(event["action"])

        new_history = list(chat_request.conversation_history or [])
        new_history.append({"role": "user", "content": chat_request.message})
        new_history.append({"role": "assistant", "content": response_text})

        return {"response": response_text, "conversation_history": new_history, "actions": actions}
    except BudgetExceeded:
        raise HTTPException(status_code=429, detail=LIMIT_DETAIL)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/stream", dependencies=CHAT_LIMITS)
async def chat_stream(chat_request: ChatMessage):
    async def event_stream():
        full_response = ""
        try:
            async for event in run_agent(chat_request):
                if event["type"] == "delta":
                    full_response += event["text"]
                    yield _sse("delta", {"text": event["text"]})
                elif event["type"] == "tool_status":
                    yield _sse("tool_status", {"tool": event["tool"]})
                elif event["type"] == "action":
                    yield _sse("action", event["action"])
            yield _sse("done", {"response": full_response})
        except BudgetExceeded:
            # The budget ran out between tool rounds of this turn.
            yield _sse("error", {"detail": LIMIT_DETAIL["message"], "code": LIMIT_DETAIL["code"]})
        except Exception as e:
            print(f"Chat stream failed: {e}")
            yield _sse("error", {"detail": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
