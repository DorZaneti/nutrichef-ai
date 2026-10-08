import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from app import limits
from app.config import CHAT_LIMIT_PER_IP, CHAT_MODEL, FAST_MODEL
from app.services.agent import _recent_history


@pytest.fixture(autouse=True)
def fresh_counter(monkeypatch):
    monkeypatch.setattr(limits, "counter", limits.DailyCounter())


def _request(headers=None, host="10.0.0.1"):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "headers": raw, "client": (host, 1234)})


def test_counter_stops_at_limit_and_keys_are_independent():
    c = limits.DailyCounter()
    assert [c.take("a", 2) for _ in range(3)] == [True, True, False]
    assert c.take("b", 2)


def test_budget_pools_are_separate(monkeypatch):
    monkeypatch.setattr(limits, "DAILY_MAIN_CALLS", 1)
    monkeypatch.setattr(limits, "DAILY_FAST_CALLS", 2)
    limits.spend_claude_call(CHAT_MODEL)
    assert not limits.has_budget(CHAT_MODEL)
    with pytest.raises(limits.BudgetExceeded):
        limits.spend_claude_call(CHAT_MODEL)
    limits.spend_claude_call(FAST_MODEL)
    assert limits.has_budget(FAST_MODEL)


def test_client_ip_prefers_cloudflare_header_over_forgeable_forwarded_for():
    req = _request({"X-Forwarded-For": "6.6.6.6, 1.2.3.4", "CF-Connecting-IP": "1.2.3.4"})
    assert limits.client_ip(req) == "1.2.3.4"
    assert limits.client_ip(_request({"X-Forwarded-For": "5.5.5.5, 10.0.0.2"})) == "5.5.5.5"
    assert limits.client_ip(_request()) == "10.0.0.1"


def test_recent_history_keeps_last_turns_starting_with_user():
    history = []
    for i in range(8):
        history += [{"role": "user", "content": f"q{i}"}, {"role": "assistant", "content": "a" * 5000}]
    recent = _recent_history(history)
    assert len(recent) == 10
    assert recent[0] == {"role": "user", "content": "q3"}
    assert all(len(m["content"]) <= 2000 for m in recent)
    # A window that would start on an assistant turn drops it.
    assert _recent_history(history[1:])[0]["role"] == "user"


def test_chat_returns_429_after_per_ip_limit(monkeypatch):
    import main
    from app.routers import chat as chat_router

    async def fake_agent(_request):
        yield {"type": "delta", "text": "hi"}

    monkeypatch.setattr(chat_router, "run_agent", fake_agent)
    client = TestClient(main.app)
    body = {"message": "hello"}
    headers = {"CF-Connecting-IP": "9.9.9.9"}
    for _ in range(CHAT_LIMIT_PER_IP):
        assert client.post("/api/chat", json=body, headers=headers).status_code == 200
    blocked = client.post("/api/chat", json=body, headers=headers)
    assert blocked.status_code == 429
    assert blocked.json()["detail"]["code"] == "daily_limit"
    # Another visitor is unaffected.
    assert client.post("/api/chat", json=body, headers={"CF-Connecting-IP": "8.8.8.8"}).status_code == 200


def test_chat_rejects_overlong_message():
    import main

    client = TestClient(main.app)
    assert client.post("/api/chat", json={"message": "x" * 501}).status_code == 422

