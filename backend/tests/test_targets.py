from app.schemas import Profile
from app.services.targets import bmr, daily_targets


def test_mifflin_st_jeor():
    assert bmr("male", 80, 180, 30) == 1780
    assert bmr("female", 60, 165, 30) == 1320.25


def test_targets_from_body_stats():
    profile = Profile(goal="lose", sex="male", weight_kg=80, height_cm=180, age=30, activity="moderate")
    # 1780 × 1.55 × 0.8
    assert daily_targets(profile) == {"daily_kcal": 2207, "daily_protein_g": 128}


def test_explicit_targets_win():
    profile = Profile(daily_kcal=1800, daily_protein_g=140, sex="male", weight_kg=80, height_cm=180, age=30)
    assert daily_targets(profile) == {"daily_kcal": 1800, "daily_protein_g": 140}


def test_no_profile_no_targets():
    assert daily_targets(None) == {"daily_kcal": None, "daily_protein_g": None}
    assert daily_targets(Profile()) == {"daily_kcal": None, "daily_protein_g": None}
