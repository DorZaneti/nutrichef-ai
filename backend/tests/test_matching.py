from app.schemas import Profile
from app.services.mealdb import ingredient_matches, is_staple, violates_profile


def test_whole_word_matching():
    assert ingredient_matches("egg", "Eggs")
    assert not ingredient_matches("egg", "Eggplant")
    assert ingredient_matches("chicken breast", "Chicken")
    assert ingredient_matches("chicken", "Chicken Thighs")
    assert ingredient_matches("tomatoes", "Tomato")
    assert not ingredient_matches("rice", "Licorice")


def test_pantry_staples():
    assert is_staple("Salt")
    assert is_staple("olive oil")
    assert not is_staple("Chicken")


def _meal(category, *ingredients):
    meal = {"strCategory": category}
    for i, ing in enumerate(ingredients, start=1):
        meal[f"strIngredient{i}"] = ing
    return meal


def test_diet_filters():
    beef = _meal("Beef", "Beef", "Onion")
    salmon = _meal("Seafood", "Salmon", "Lemon")
    omelette = _meal("Vegetarian", "Eggs", "Cheese")
    assert violates_profile(beef, Profile(diet="vegetarian"))
    assert not violates_profile(salmon, Profile(diet="pescatarian"))
    assert violates_profile(salmon, Profile(diet="vegetarian"))
    assert not violates_profile(omelette, Profile(diet="vegetarian"))
    assert violates_profile(omelette, Profile(diet="vegan"))
    assert not violates_profile(beef, None)


def test_allergy_groups():
    satay = _meal("Chicken", "Chicken", "Peanut Butter")
    assert violates_profile(satay, Profile(allergies=["nuts"]))
    assert violates_profile(satay, Profile(allergies=["peanuts"]))
    assert not violates_profile(satay, Profile(allergies=["shellfish"]))
