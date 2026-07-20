from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set

SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}


def _today() -> str:
    return datetime.utcnow().date().isoformat()


def compute_streak(dates: Set[str]) -> int:
    """Port of computeStreak in useActivity.js — same today-or-yesterday grace."""
    streak = 0
    cursor = datetime.utcnow().date()
    if cursor.isoformat() not in dates:
        cursor -= timedelta(days=1)
    while cursor.isoformat() in dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def streak_at_risk(entries: List[Dict]) -> Optional[Dict]:
    dates = {e["date"] for e in entries}
    streak = compute_streak(dates)
    if streak >= 3 and _today() not in dates:
        return {
            "id": "streak_at_risk",
            "type": "streak_at_risk",
            "severity": "high",
            "title": f"{streak}-day streak at risk",
            "message": f"No activity logged today yet — cook or explore a recipe to keep your {streak}-day streak alive.",
            "cta": "Find a quick recipe",
        }
    return None


def protein_low(entries: List[Dict]) -> Optional[Dict]:
    cutoff = (datetime.utcnow().date() - timedelta(days=7)).isoformat()
    cooked = [e for e in entries if e["action"] == "cooked" and e["date"] >= cutoff and e.get("calories") is not None]

    totals: Dict[str, Dict[str, float]] = {}
    for e in cooked:
        day = totals.setdefault(e["date"], {"calories": 0.0, "protein": 0.0})
        day["calories"] += e.get("calories") or 0
        day["protein"] += e.get("protein") or 0

    if len(totals) < 3:
        return None

    avg_protein = sum(d["protein"] for d in totals.values()) / len(totals)
    avg_calories = sum(d["calories"] for d in totals.values()) / len(totals)
    protein_share = (avg_protein * 4 / avg_calories) if avg_calories else 0  # protein: ~4 kcal/g

    if avg_protein < 50 or protein_share < 0.15:
        return {
            "id": "protein_low",
            "type": "protein_low",
            "severity": "medium",
            "title": "Protein's been light this week",
            "message": f"You're averaging about {avg_protein:.0f}g of protein per cooking day over the last {len(totals)} days.",
            "cta": "Find a high-protein recipe",
        }
    return None


def exploration_plateau(entries: List[Dict]) -> Optional[Dict]:
    now = datetime.utcnow().date()
    recent_cutoff = (now - timedelta(days=14)).isoformat()
    prior_cutoff = (now - timedelta(days=28)).isoformat()

    recent = {e["recipe_name"] for e in entries if e["date"] >= recent_cutoff}
    prior = {e["recipe_name"] for e in entries if prior_cutoff <= e["date"] < recent_cutoff}

    if len(prior) >= 4 and len(recent) <= len(prior) / 2:
        return {
            "id": "exploration_plateau",
            "type": "exploration_plateau",
            "severity": "low",
            "title": "Trying fewer new recipes lately",
            "message": f"You explored {len(recent)} recipes in the last 2 weeks, down from {len(prior)} the 2 weeks before that.",
            "cta": "Discover something new",
        }
    return None


def viewing_not_cooking(entries: List[Dict]) -> Optional[Dict]:
    cutoff = (datetime.utcnow().date() - timedelta(days=7)).isoformat()
    recent = [e for e in entries if e["date"] >= cutoff]
    viewed = sum(1 for e in recent if e["action"] == "viewed")
    cooked = sum(1 for e in recent if e["action"] == "cooked")

    if viewed >= 5 and cooked == 0:
        return {
            "id": "viewing_not_cooking",
            "type": "viewing_not_cooking",
            "severity": "medium",
            "title": "Lots of browsing, no cooking",
            "message": f"You've viewed {viewed} recipes this week but haven't logged a single cook yet.",
            "cta": "Pick one and cook it",
        }
    return None


DETECTORS = [streak_at_risk, protein_low, exploration_plateau, viewing_not_cooking]


def detect_patterns(entries: List[Dict]) -> List[Dict]:
    suggestions = [s for s in (detector(entries) for detector in DETECTORS) if s is not None]
    suggestions.sort(key=lambda s: SEVERITY_RANK.get(s["severity"], 99))
    return suggestions
