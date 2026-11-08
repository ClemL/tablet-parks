'use client';

import { SCALES, TEXT_SIZES, useDisplay } from '@/client/display';

/** Text size and overall scale for this device only, in the phone's menu and the tablet's. */
export function DisplaySettings() {
  const [prefs, setPrefs] = useDisplay();
  return (
    <div className="display-settings">
      <div className="display-settings__row">
        <span id="display-text">Text size</span>
        <div className="segmented" role="radiogroup" aria-labelledby="display-text">
          {TEXT_SIZES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={prefs.text === t.id}
              className={prefs.text === t.id ? 'is-on' : ''}
              onClick={() => setPrefs({ ...prefs, text: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="display-settings__row">
        <span id="display-scale">Scale</span>
        <div className="segmented" role="radiogroup" aria-labelledby="display-scale">
          {SCALES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={prefs.scale === s.id}
              className={prefs.scale === s.id ? 'is-on' : ''}
              onClick={() => setPrefs({ ...prefs, scale: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted display-settings__note">For this device only.</p>
    </div>
  );
}
