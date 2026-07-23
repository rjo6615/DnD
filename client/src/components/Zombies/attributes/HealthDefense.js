import React, { useEffect, useMemo, useState } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Button } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useParams } from "react-router-dom";
import { calculateCharacterHitPoints } from '../utils/characterMetrics';

export default function HealthDefense({
  form,
  conMod,
  dexMod,
  wisMod = 0,
  totalLevel,
  hpMaxBonus = 0,
  hpMaxBonusPerLevel = 0,
  onTempHealthChange,
}) {
  const params = useParams();
  const isLargeScreen =
    typeof window !== 'undefined' && window.innerWidth >= 768;
  const wrapperGap = isLargeScreen ? '32px' : 'clamp(16px, 4vh, 24px)';
  const wrapperMarginBottom = isLargeScreen ? '64px' : '0.5rem';
//-----------------------Health/Defense------------------------------
  const derivedTotalLevel = useMemo(() => {
    if (Number.isFinite(totalLevel)) {
      return totalLevel;
    }
    if (!Array.isArray(form?.occupation)) {
      return 0;
    }
    return form.occupation.reduce((total, o) => total + Number(o?.Level || 0), 0);
  }, [form?.occupation, totalLevel]);

  const { currentHp: computedCurrentHp, maxHp } = useMemo(() => {
    const overrides = {
      conMod,
      totalLevel: derivedTotalLevel,
    };

    const numericHpMaxBonus = Number(hpMaxBonus);
    if (Number.isFinite(numericHpMaxBonus) && numericHpMaxBonus !== 0) {
      overrides.hpMaxBonus = numericHpMaxBonus;
    }

    const numericHpMaxBonusPerLevel = Number(hpMaxBonusPerLevel);
    if (
      Number.isFinite(numericHpMaxBonusPerLevel) &&
      numericHpMaxBonusPerLevel !== 0
    ) {
      overrides.hpMaxBonusPerLevel = numericHpMaxBonusPerLevel;
    }

    return calculateCharacterHitPoints(form, overrides);
  }, [form, conMod, derivedTotalLevel, hpMaxBonus, hpMaxBonusPerLevel]);

  const safeInitialHealth = Number.isFinite(computedCurrentHp) ? computedCurrentHp : 0;
  const [health, setHealth] = useState(safeInitialHealth);
  const [error, setError] = useState(null); // Error message state
  const [deathSaveFailures, setDeathSaveFailures] = useState([false, false, false]);
  const [deathSaveSuccesses, setDeathSaveSuccesses] = useState([false, false, false]);

  useEffect(() => {
    setHealth(Number.isFinite(computedCurrentHp) ? computedCurrentHp : 0);
  }, [computedCurrentHp]);

  // Sends tempHealth data to database for update
  async function tempHealthUpdate(offset) {
    const updatedHealthValue = (Number.isFinite(health) ? health : 0) + offset;
    try {
      const response = await apiFetch(`/characters/update-temphealth/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          delta: offset,
        }),
      });
      if (!response.ok) throw new Error('The HP update could not be saved. No combat state was changed.');
      const payload = await response.json();
      const savedHealth = Number(payload.currentHp);
      setHealth(savedHealth);
      setError(null);
      if (typeof onTempHealthChange === 'function') {
        onTempHealthChange(savedHealth);
      }
    } catch (error) {
      console.error(error);
      setHealth(Number.isFinite(computedCurrentHp) ? computedCurrentHp : 0);
      setError("The HP update could not be saved. No combat state was changed.");
    }
  }

  const safeMaxHealth = Number.isFinite(maxHp) ? maxHp : 0;

  const increaseHealth = () => {
    if (maxHp !== null && Number.isFinite(maxHp) && Number.isFinite(health) && health >= maxHp) {
      return;
    }
    const current = Number.isFinite(health) ? health : 0;
    const next = current + 1;
    setHealth(next);
    tempHealthUpdate(1);
  };

  const decreaseHealth = () => {
    if (Number.isFinite(health) && health <= 0) {
      return;
    }
    const current = Number.isFinite(health) ? health : 0;
    const next = current - 1;
    setHealth(next);
    tempHealthUpdate(-1);
  };

  const handleBarChange = (e) => {
    const newHealth = Number(e.target.value);
    if (Number.isNaN(newHealth)) {
      return;
    }
    const offset = newHealth - (Number.isFinite(health) ? health : 0);
    setHealth(newHealth);
    if (!Number.isNaN(offset)) {
      tempHealthUpdate(offset);
    }
  };

  const healthValue = Number.isFinite(health) ? health : 0;
  const sliderMax = safeMaxHealth > 0 ? safeMaxHealth : Math.max(healthValue, 0);
  const healthRatio = sliderMax > 0 ? Math.min(Math.max((healthValue / sliderMax) * 100, 0), 100) : 0;
  const displayCurrent =
    Number.isFinite(health) && (computedCurrentHp !== null || healthValue !== 0)
      ? healthValue
      : '—';
  const displayMax = maxHp !== null ? maxHp : '—';
  const fillThreshold = (safeMaxHealth > 0 ? safeMaxHealth : sliderMax) * 0.5;
  const barColor =
    sliderMax > 0
      ? healthValue > fillThreshold
        ? "#2ecc71"
        : "#c0392b"
      : healthValue >= 0
        ? "#2ecc71"
        : "#c0392b";
  const showDeathSaveTrackers = Number.isFinite(healthValue) && healthValue <= 0;

  useEffect(() => {
    if (!showDeathSaveTrackers) {
      setDeathSaveFailures([false, false, false]);
      setDeathSaveSuccesses([false, false, false]);
    }
  }, [showDeathSaveTrackers]);

  const toggleDeathSaveFailure = (index) => {
    setDeathSaveFailures((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const toggleDeathSaveSuccess = (index) => {
    setDeathSaveSuccesses((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };
  return (
    <div
  style={{
    display: "flex",
    flexDirection: "column", // <-- vertical stacking
    alignItems: "center",
    gap: wrapperGap,
    marginBottom: wrapperMarginBottom,
    padding: "0 16px",
    maxWidth: "100%",
  }}
>
  {/* Health Section */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flexWrap: "nowrap",
      flexShrink: 1,
      minWidth: "320px",
    }}
  >
    {/* Decrease Button */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <Button
        style={{
          color: "#e74c3c",
          backgroundColor: 'transparent',
          border: "none",
          fontSize: "20px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          transition: "transform 0.2s ease",
          flexShrink: 0
        }}
        className="fa-solid fa-minus"
        onClick={decreaseHealth}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
      />
      {showDeathSaveTrackers && (
        <div className="death-save-circles" aria-label="Death save failures">
          {deathSaveFailures.map((active, index) => (
            <button
              key={`death-fail-${index}`}
              type="button"
              className={`death-save-circle ${
                active ? 'death-save-circle--fail-active' : 'death-save-circle--inactive'
              }`}
              onClick={() => toggleDeathSaveFailure(index)}
              aria-pressed={active}
              aria-label={`Mark death save failure ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>

    {/* Health Bar */}
    <div
      style={{
        position: "relative",
        width: "240px",
        height: "24px",
        backgroundColor: "#e0e0e0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.25)",
        flexShrink: 0
      }}
    >
      <input
        type="range"
        min="0"
        max={sliderMax}
        value={healthValue}
        onChange={handleBarChange}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          zIndex: 1,
        }}
      />
      <div
        style={{
          width: `${healthRatio}%`,
          height: "100%",
          background: barColor,
          transition: "width 0.3s ease-in-out",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          width: "100%",
          top: "0",
          left: "0",
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 600,
          color: "#222",
          lineHeight: "24px",
          pointerEvents: "none",
        }}
      >
        {`${displayCurrent}/${displayMax}`}
      </span>
    </div>

    {/* Increase Button */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <Button
        style={{
          color: "#27ae60",
          backgroundColor: "transparent",
          border: "none",
          fontSize: "20px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          transition: "transform 0.2s ease",
          flexShrink: 0
        }}
        className="fa-solid fa-plus"
        onClick={increaseHealth}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
      />
      {showDeathSaveTrackers && (
        <div className="death-save-circles" aria-label="Death save successes">
          {deathSaveSuccesses.map((active, index) => (
            <button
              key={`death-success-${index}`}
              type="button"
              className={`death-save-circle ${
                active ? 'death-save-circle--success-active' : 'death-save-circle--inactive'
              }`}
              onClick={() => toggleDeathSaveSuccess(index)}
              aria-pressed={active}
              aria-label={`Mark death save success ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  </div>
  {error && (
    <div className="text-danger" style={{ marginTop: "8px" }}>
      {error}
    </div>
  )}

    </div>
  );
}
