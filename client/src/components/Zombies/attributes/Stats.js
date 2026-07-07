import React, { useMemo, useState, useCallback } from "react";
import { Modal, Button } from "react-bootstrap";
import DockControls from '../components/DockControls';
import STATS from "../statSchema";
import StatBreakdownModal from "./StatBreakdownModal";
import { normalizeEquipmentMap } from './equipmentNormalization';
import { rollSkillWithDiceBox } from './Skills';
import {
  DEFAULT_DICE_COLOR,
  normalizeDiceColor,
} from '../../../utils/diceColors';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const formatAdjustmentSegment = (value, label) => {
  if (!value) return null;
  const sign = value >= 0 ? '+' : '-';
  return `${sign} ${Math.abs(value)} ${label}`;
};

const createEmptyStatMap = () => ({
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
});

export default function Stats({
  form,
  showStats,
  handleCloseStats,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const [stats] = useState({
    str: form.str || 0,
    dex: form.dex || 0,
    con: form.con || 0,
    int: form.int || 0,
    wis: form.wis || 0,
    cha: form.cha || 0,
  });

  const diceFaceColor = useMemo(
    () => normalizeDiceColor(form?.diceColor) || DEFAULT_DICE_COLOR,
    [form?.diceColor],
  );

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  const equippedItems = useMemo(() => {
    if (typeof form?.equipment === 'object' && form.equipment !== null) {
      const normalized = normalizeEquipmentMap(form.equipment);
      return Object.values(normalized).filter(Boolean);
    }
    return Array.isArray(form.item) ? form.item.filter(Boolean) : [];
  }, [form.equipment, form.item]);

  const { bonuses: totalItemBonus, overrides: itemOverrides } = equippedItems.reduce(
    (acc, el) => {
      STAT_KEYS.forEach((key) => {
        const bonusValue = Number(el.statBonuses?.[key] || 0);
        if (!Number.isNaN(bonusValue)) {
          acc.bonuses[key] += bonusValue;
        }
        const overrideRaw = el.statOverrides?.[key];
        if (overrideRaw !== undefined && overrideRaw !== null) {
          const overrideValue = Number(overrideRaw);
          if (!Number.isNaN(overrideValue)) {
            const current = acc.overrides[key];
            acc.overrides[key] =
              current === undefined ? overrideValue : Math.max(current, overrideValue);
          }
        }
      });
      return acc;
    },
    { bonuses: createEmptyStatMap(), overrides: {} }
  );

  const totalFeatBonus = (form.feat || []).reduce(
    (acc, el) => ({
      str: acc.str + Number(el.str || 0),
      dex: acc.dex + Number(el.dex || 0),
      con: acc.con + Number(el.con || 0),
      int: acc.int + Number(el.int || 0),
      wis: acc.wis + Number(el.wis || 0),
      cha: acc.cha + Number(el.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const raceBonus = form.race?.abilities || {};
  const classBonus = (form.occupation || []).reduce(
    (acc, occ) => ({
      str: acc.str + Number(occ.str || 0),
      dex: acc.dex + Number(occ.dex || 0),
      con: acc.con + Number(occ.con || 0),
      int: acc.int + Number(occ.int || 0),
      wis: acc.wis + Number(occ.wis || 0),
      cha: acc.cha + Number(occ.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  );

  const breakdowns = Object.keys(stats).reduce((acc, key) => {
    const base = stats[key] - classBonus[key];
    const race = Number(raceBonus[key] || 0);
    const feat = totalFeatBonus[key];
    const item = totalItemBonus[key];
    const cls = classBonus[key];
    const totalWithoutOverride = base + cls + race + feat + item;
    const overrideValue = itemOverrides[key];
    const breakdown = {
      base,
      class: cls,
      race,
      feat,
      item,
      total: totalWithoutOverride,
    };
    if (
      overrideValue !== undefined &&
      overrideValue !== null &&
      overrideValue > totalWithoutOverride
    ) {
      breakdown.override = overrideValue;
      breakdown.total = overrideValue;
    }
    acc[key] = breakdown;
    return acc;
  }, {});

  const computedStats = Object.fromEntries(
    Object.entries(breakdowns).map(([key, b]) => [key, b.total])
  );

  const statMods = Object.fromEntries(
    Object.entries(computedStats).map(([key, value]) => [key, Math.floor((value - 10) / 2)])
  );

  const handleView = (stat) => {
    setSelectedStat(stat);
    setShowBreakdown(true);
  };

  const handleCloseBreakdown = () => {
    setShowBreakdown(false);
  };

  const handleRoll = useCallback(
    async (statKey) => {
      const statMod = statMods[statKey] ?? 0;
      const statInfo = STATS.find((stat) => stat.key === statKey);
      const statLabel = statInfo?.label || statKey.toUpperCase();

      if (!isDocked) {
        handleCloseStats?.();
      }

      const { result, d20 } = await rollSkillWithDiceBox(statMod, {
        diceColor: diceFaceColor,
      });
      const breakdownParts = [`${d20} (d20)`];
      const modifierSegment = formatAdjustmentSegment(
        statMod,
        `${statLabel} Modifier`
      );
      if (modifierSegment) {
        breakdownParts.push(modifierSegment);
      }

      const diceRolls = [
        {
          sides: 20,
          value: d20,
          type: `${statLabel} Check`,
          category: 'base',
        },
      ];

      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: {
            value: result,
            breakdown: breakdownParts.join(' '),
            source: statLabel,
            rollLabel: 'Stat Roll',
            critical: d20 === 20,
            fumble: d20 === 1,
            diceRolls,
          },
        })
      );

    },
    [diceFaceColor, handleCloseStats, isDocked, statMods]
  );

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--stats');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    handleCloseStats?.();
  }, [handleCloseStats, isDocked, onDockClose]);

  return (
    <>
      <Modal
        show={showStats}
        onHide={handleModalHide}
        size="lg"
        scrollable
        centered={!isDocked}
        className={modalClassName}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
        <Modal.Header className="modal-header">
          <DockControls
            dockedSide={dockedSide}
            onDockChange={onDockChange}
            isDocked={isDocked}
          />
          <Modal.Title className="modal-title">Stats</Modal.Title>
        </Modal.Header>
        <Modal.Body className="stats-modal-body">
          <div className="stat-card-grid">
            {STATS.map(({ key, label }) => (
              <div className="stat-card" key={key}>
                <div className="stat-card-header">
                  <div className="stat-card-title">
                    <span className="stat-card-key">{key.toUpperCase()}</span>
                    {label && <span className="stat-card-label">{label}</span>}
                  </div>
                  <div className="stat-card-actions">
                    <Button
                      onClick={() => handleView(key)}
                      variant="link"
                      aria-label={`View ${label || key} details`}
                      className="stat-card-view"
                    >
                      <i className="fa-solid fa-eye"></i>
                    </Button>
                    <Button
                      onClick={() => handleRoll(key)}
                      variant="link"
                      aria-label={`Roll ${label || key} check`}
                      className="stat-card-roll"
                    >
                      <i className="fa-solid fa-dice-d20"></i>
                    </Button>
                  </div>
                </div>
                <div className="stat-card-body">
                  <div className="stat-card-metric">
                    <span className="stat-card-metric-label">Total</span>
                    <span className="stat-card-metric-value">{computedStats[key]}</span>
                  </div>
                  <div className="stat-card-metric">
                    <span className="stat-card-metric-label">Modifier</span>
                    <span className="stat-card-metric-value">{statMods[key]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="modal-footer">
          <Button className="action-btn close-btn" onClick={handleModalHide}>Close</Button>
        </Modal.Footer>
      </Modal>
      <StatBreakdownModal
        show={showBreakdown}
        onHide={handleCloseBreakdown}
        statKey={selectedStat}
        breakdown={selectedStat ? breakdowns[selectedStat] : null}
      />
    </>
  );
}
