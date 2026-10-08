import json
from typing import AsyncIterator, Dict, List, Optional

from app.config import CHAT_MODEL, REFUSAL_FALLBACK, client
from app.schemas import ChatMessage, Profile, TodayTotals
from app.services.agent_tools import TOOLS, AgentContext, ToolInputError, run_tool
from app.services.targets import daily_targets

SYSTEM_PROMPT = """You are NutriChef AI, a friendly chef and nutrition coach inside a recipe app. You help people cook with what they already have and keep an accurate food log.

How to work:
- When the user mentions ingredients they have, bought or used up, call update_ingredients right away (English names, grams).
- When they want ideas, call search_recipes. The app shows results as cards, so give a short, opinionated take (your top 2-3 picks and why) instead of repeating the whole list.
- For nutrition questions use lookup_nutrition or get_recipe_details rather than guessing numbers. If you do have to estimate, say it's an estimate.
- Recipe nutrition is per serving. Only call log_meal when the user says they ate (or are about to eat) something; if the portion size is unclear, ask.
- Respect the user's diet and allergies, and never suggest an ingredient they're allergic to.
- When daily targets are known, relate advice to what's left for today (for example "that leaves about 600 kcal for dinner").
- Reply in the language the user writes in. Tool inputs are always in English.
- Keep replies short and warm: a few sentences or a short list. Use **bold** for recipe names."""

MAX_TOOL_ROUNDS = 6
MAX_JSON_RETRIES = 2


def _context_block(ctx: AgentContext) -> str:
    """App state the model needs this turn. Sent with the user message, not persisted in history."""
    lines = []
    if ctx.ingredients:
        lines.append("Pantry: " + ", ".join(f"{i.name} ({i.weight_grams:.0f}g)" for i in ctx.ingredients))
    else:
        lines.append("Pantry: empty")

    profile: Optional[Profile] = ctx.profile
    if profile:
        lines.append(
            f"Profile: goal={profile.goal}, diet={profile.diet}, "
            f"allergies={', '.join(profile.allergies) or 'none'}"
        )
    targets = daily_targets(profile)
    eaten = ctx.today_totals
    if targets["daily_kcal"] or targets["daily_protein_g"]:
        lines.append(
            f"Daily targets: {targets['daily_kcal'] or '?'} kcal, {targets['daily_protein_g'] or '?'}g protein. "
            f"Eaten today: {eaten.calories:.0f} kcal, {eaten.protein:.0f}g protein."
        )
    else:
        lines.append(f"Eaten today: {eaten.calories:.0f} kcal, {eaten.protein:.0f}g protein (no targets set).")
    return "\n\n<app_context>\n" + "\n".join(lines) + "\n</app_context>"


async def run_agent(chat_request: ChatMessage) -> AsyncIterator[Dict]:
    """Run one chat turn. Yields events: delta (text), tool_status (tool name) and action (UI changes)."""
    ctx = AgentContext(
        ingredients=[i.model_copy() for i in chat_request.current_ingredients or []],
        profile=chat_request.profile,
        today_totals=(chat_request.today_totals or TodayTotals()).model_copy(),
    )
    messages: List[Dict] = list(chat_request.conversation_history or []) + [
        {"role": "user", "content": chat_request.message + _context_block(ctx)}
    ]
    emitted_text = False

    for _ in range(MAX_TOOL_ROUNDS):
        json_retries = 0
        while True:
            try:
                round_started = True
                async with client.messages.stream(
                    model=CHAT_MODEL,
                    max_tokens=16000,
                    system=SYSTEM_PROMPT,
                    tools=TOOLS,
                    messages=messages,
                    output_config={"effort": "medium"},
                    **REFUSAL_FALLBACK,
                ) as stream:
                    async for event in stream:
                        if event.type == "text" and event.text:
                            # Separate text from consecutive tool rounds into paragraphs.
                            if round_started and emitted_text:
                                yield {"type": "delta", "text": "\n\n"}
                            round_started = False
                            emitted_text = True
                            yield {"type": "delta", "text": event.text}
                    response = await stream.get_final_message()
                break
            except ValueError:
                # A streamed tool input the SDK couldn't parse at all — retry the round.
                json_retries += 1
                if json_retries > MAX_JSON_RETRIES:
                    raise

        if response.stop_reason == "refusal":
            yield {"type": "delta", "text": "Sorry, I can't help with that one. Ask me about recipes or nutrition!"}
            return

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if not tool_uses:
            return
        if response.stop_reason == "max_tokens":
            # A truncated tool input still parses; never run it.
            yield {"type": "delta", "text": "\n\nSorry, that got too long for me. Could you ask again more briefly?"}
            return

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in tool_uses:
            yield {"type": "tool_status", "tool": block.name}
            try:
                result = await run_tool(ctx, block.name, block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
            except ToolInputError as e:
                results.append({"type": "tool_result", "tool_use_id": block.id, "is_error": True, "content": str(e)})
            except Exception as e:
                print(f"Tool {block.name} failed: {e}")
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "is_error": True,
                    "content": "The tool failed with a temporary error. Tell the user and continue without it.",
                })
        for action in ctx.actions:
            yield {"type": "action", "action": action}
        ctx.actions.clear()
        # All results for one assistant turn go back in a single user message.
        messages.append({"role": "user", "content": results})

    yield {"type": "delta", "text": "\n\n(I stopped after several steps — ask me to continue if you need more.)"}
