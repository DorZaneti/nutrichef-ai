import { useEffect, useRef, useState } from 'react';
import { computedTargets, DEFAULT_PROFILE } from '../hooks/useProfile';
import { useI18n } from '../i18n';
import './ProfileSheet.css';

const GOALS = ['lose', 'maintain', 'gain'];
const DIETS = ['none', 'vegetarian', 'vegan', 'pescatarian'];
const ALLERGIES = ['nuts', 'peanuts', 'dairy', 'gluten', 'eggs', 'fish', 'shellfish', 'soy', 'sesame'];
const ACTIVITIES = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

const toNumber = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Goals, diet, allergies and optional body stats. A native <dialog> gives
// focus trapping, Escape-to-close and the modal semantics for free.
function ProfileSheet({ open, profile, onSave, onClose }) {
  const { t } = useI18n();
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(profile ?? DEFAULT_PROFILE);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft({ ...DEFAULT_PROFILE, ...profile });
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, profile]);

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const toggleAllergy = (allergy) =>
    setDraft((d) => ({
      ...d,
      allergies: d.allergies.includes(allergy) ? d.allergies.filter((a) => a !== allergy) : [...d.allergies, allergy],
    }));

  const clean = {
    ...draft,
    sex: draft.sex || null,
    activity: draft.activity || null,
    age: toNumber(draft.age),
    height_cm: toNumber(draft.height_cm),
    weight_kg: toNumber(draft.weight_kg),
    daily_kcal: toNumber(draft.daily_kcal),
    daily_protein_g: toNumber(draft.daily_protein_g),
  };
  const computed = computedTargets(clean);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(clean);
  };

  return (
    <dialog ref={dialogRef} className="profile-sheet" aria-labelledby="profile-title" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="profile-head">
          <h2 id="profile-title">🎯 {t('profile.title')}</h2>
          <button type="button" className="profile-close" onClick={onClose} aria-label={t('profile.close')}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <p className="profile-intro">{t('profile.intro')}</p>

        <fieldset className="profile-field">
          <legend>{t('profile.goal')}</legend>
          <div className="segmented">
            {GOALS.map((goal) => (
              <label key={goal} className={`segment ${draft.goal === goal ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="goal"
                  value={goal}
                  checked={draft.goal === goal}
                  onChange={set('goal')}
                />
                {t(`goal.${goal}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="profile-field">
          <label htmlFor="profile-diet">{t('profile.diet')}</label>
          <select id="profile-diet" value={draft.diet} onChange={set('diet')}>
            {DIETS.map((diet) => (
              <option key={diet} value={diet}>
                {t(`diet.${diet}`)}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="profile-field">
          <legend>{t('profile.allergies')}</legend>
          <div className="allergy-grid">
            {ALLERGIES.map((allergy) => (
              <label key={allergy} className="allergy-option">
                <input
                  type="checkbox"
                  checked={draft.allergies.includes(allergy)}
                  onChange={() => toggleAllergy(allergy)}
                />
                {t(`allergy.${allergy}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="profile-field">
          <legend>{t('profile.body')}</legend>
          <div className="body-grid">
            <label>
              {t('profile.sex')}
              <select value={draft.sex ?? ''} onChange={set('sex')}>
                <option value="">{t('sex.unset')}</option>
                <option value="male">{t('sex.male')}</option>
                <option value="female">{t('sex.female')}</option>
              </select>
            </label>
            <label>
              {t('profile.age')}
              <input type="number" inputMode="numeric" min="10" max="120" value={draft.age ?? ''} onChange={set('age')} />
            </label>
            <label>
              {t('profile.height')}
              <input
                type="number"
                inputMode="decimal"
                min="100"
                max="250"
                value={draft.height_cm ?? ''}
                onChange={set('height_cm')}
              />
            </label>
            <label>
              {t('profile.weight')}
              <input
                type="number"
                inputMode="decimal"
                min="30"
                max="300"
                value={draft.weight_kg ?? ''}
                onChange={set('weight_kg')}
              />
            </label>
            <label className="span-2">
              {t('profile.activity')}
              <select value={draft.activity ?? ''} onChange={set('activity')}>
                <option value="">{t('sex.unset')}</option>
                {ACTIVITIES.map((a) => (
                  <option key={a} value={a}>
                    {t(`activity.${a}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="profile-field">
          <legend>{t('profile.targets')}</legend>
          {computed.daily_kcal && (
            <p className="profile-computed" aria-live="polite">
              {t('profile.computed', { kcal: computed.daily_kcal, protein: computed.daily_protein_g })}
            </p>
          )}
          <div className="body-grid">
            <label>
              {t('profile.kcal')}
              <input
                type="number"
                inputMode="numeric"
                min="800"
                max="6000"
                placeholder={computed.daily_kcal ?? ''}
                value={draft.daily_kcal ?? ''}
                onChange={set('daily_kcal')}
              />
            </label>
            <label>
              {t('profile.protein')}
              <input
                type="number"
                inputMode="numeric"
                min="20"
                max="400"
                placeholder={computed.daily_protein_g ?? ''}
                value={draft.daily_protein_g ?? ''}
                onChange={set('daily_protein_g')}
              />
            </label>
          </div>
        </fieldset>

        <div className="profile-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('profile.cancel')}
          </button>
          <button type="submit" className="btn-primary">
            {t('profile.save')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default ProfileSheet;
