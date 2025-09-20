import React, { useMemo, useState } from "react";
import { Card, Table, Modal, Button } from "react-bootstrap";
import STATS from "../statSchema";
import StatBreakdownModal from "./StatBreakdownModal";
import { normalizeEquipmentMap } from './equipmentNormalization';

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

  const totalItemBonus = equippedItems.reduce(
    (acc, el) => ({
      str: acc.str + Number(el.statBonuses?.str || 0),
      dex: acc.dex + Number(el.statBonuses?.dex || 0),
      con: acc.con + Number(el.statBonuses?.con || 0),
      int: acc.int + Number(el.statBonuses?.int || 0),
      wis: acc.wis + Number(el.statBonuses?.wis || 0),
      cha: acc.cha + Number(el.statBonuses?.cha || 0),
    }),
    { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
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
    acc[key] = {
      base,
      class: cls,
      race,
      feat,
      item,
      total: base + cls + race + feat + item,
    };
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
              <Table striped bordered hover size="sm" responsive className="modern-table">
                <thead>
                  <tr>
                    <th>Stat</th>
                    <th>Level</th>
                    <th>Mod</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {STATS.map(({ key }) => (
                    <tr key={key}>
                      <td>{key.toUpperCase()}</td>
                      <td>{computedStats[key]}</td>
                      <td>{statMods[key]}</td>
                      <td>
                          <Button
                            onClick={() => handleView(key)}
                            variant="link"
                            aria-label="view"
                          >
                            <i className="fa-solid fa-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
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
