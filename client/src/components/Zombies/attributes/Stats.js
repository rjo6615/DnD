import React, { useMemo, useState } from "react";
import { Card, Modal, Button } from "react-bootstrap";
import STATS from "../statSchema";
import StatBreakdownModal from "./StatBreakdownModal";
import { normalizeEquipmentMap } from './equipmentNormalization';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const createEmptyStatMap = () => ({
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
});

export default function Stats({ form, showStats, handleCloseStats }) {
  const [stats] = useState({
    str: form.str || 0,
    dex: form.dex || 0,
    con: form.con || 0,
    int: form.int || 0,
    wis: form.wis || 0,
    cha: form.cha || 0,
  });

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

  return (
    <>
      <Modal
        show={showStats}
        onHide={handleCloseStats}
        size="lg"
        scrollable
        centered
        className="dnd-modal modern-modal"
      >
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Stats</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="stat-card-grid">
                {STATS.map(({ key, label }) => (
                  <div className="stat-card" key={key}>
                    <div className="stat-card-header">
                      <div className="stat-card-title">
                        <span className="stat-card-key">{key.toUpperCase()}</span>
                        {label && <span className="stat-card-label">{label}</span>}
                      </div>
                      <Button
                        onClick={() => handleView(key)}
                        variant="link"
                        aria-label={`View ${label || key} details`}
                        className="stat-card-view"
                      >
                        <i className="fa-solid fa-eye"></i>
                      </Button>
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
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseStats}>Close</Button>
            </Card.Footer>
          </Card>
        </div>
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
