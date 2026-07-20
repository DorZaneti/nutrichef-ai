import asyncio
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas import ChatMessage
from app.services.ai import extract_ingredients_from_message, run_chat_agent, stream_chat_agent

router = APIRouter()


@router.post("/api/chat")
async def chat(chat_request: ChatMessage):
    try:
        # The reply and the ingredient extraction are independent — run them
        # concurrently so the user waits for the slower of the two, not both.
        response_text, extracted_ingredients = await asyncio.gather(
            run_chat_agent(
                chat_request.message,
                chat_request.conversation_history,
                chat_request.current_ingredients,
            ),
            extract_ingredients_from_message(chat_request.message),
        )

        new_history = chat_request.conversation_history.copy()
        new_history.append({"role": "user", "content": chat_request.message})
        new_history.append({"role": "assistant", "content": response_text})

        return {
            "response": response_text,
            "conversation_history": new_history,
            "extracted_ingredients": extracted_ingredients,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/stream")
async def chat_stream(chat_request: ChatMessage):
    async def event_stream():
        extraction_task = asyncio.create_task(
            extract_ingredients_from_message(chat_request.message)
        )
        full_response = ""
        try:
            async for delta in stream_chat_agent(
                chat_request.message,
                chat_request.conversation_history,
                chat_request.current_ingredients,
            ):
                full_response += delta
                yield f"event: delta\ndata: {json.dumps({'text': delta})}\n\n"

            extracted_ingredients = await extraction_task
            yield f"event: ingredients\ndata: {json.dumps({'extracted_ingredients': extracted_ingredients})}\n\n"
            yield f"event: done\ndata: {json.dumps({'response': full_response})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
