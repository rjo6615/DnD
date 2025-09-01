import React, { useState, useEffect } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Card, Table, Modal, Button } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";

export default function Stats({ form, showStats, handleCloseStats, totalLevel }) {
  const params = useParams();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    str: form.str || 0,
    dex: form.dex || 0,
    con: form.con || 0,
    int: form.int || 0,
    wis: form.wis || 0,
    cha: form.cha || 0,
  });

  const startStatTotal = form.startStatTotal || 0;

  const totalItemBonus = (form.item || []).reduce(
    (acc, el) => ({
      str: acc.str + Number(el[2] || 0),
      dex: acc.dex + Number(el[3] || 0),
      con: acc.con + Number(el[4] || 0),
      int: acc.int + Number(el[5] || 0),
      wis: acc.wis + Number(el[6] || 0),
      cha: acc.cha + Number(el[7] || 0),
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

  const computedStats = Object.keys(stats).reduce((acc, key) => {
    acc[key] = stats[key] + totalItemBonus[key] + totalFeatBonus[key];
    return acc;
  }, {});

  const statMods = Object.fromEntries(
    Object.entries(computedStats).map(([key, value]) => [key, Math.floor((value - 10) / 2)])
  );

  const [statPointsLeft, setStatPointsLeft] = useState(0);

  useEffect(() => {
    const pointsUsed = Object.values(stats).reduce((a, b) => a + b, 0) - startStatTotal;
    setStatPointsLeft(Math.floor(totalLevel / 4) - pointsUsed);
  }, [stats, totalLevel, startStatTotal]);

  async function statsUpdate() {
    await apiFetch(`/characters/update-stats/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stats),
    }).catch((error) => window.alert(error));

    navigate(0);
  }

  function addStat(stat) {
    if (statPointsLeft > 0) {
      setStats((prev) => {
        const newStats = { ...prev, [stat]: prev[stat] + 1 };
        return newStats;
      });
    }
  }

  function removeStat(stat) {
    if (stats[stat] > form[stat]) {
      setStats((prev) => {
        const newStats = { ...prev, [stat]: prev[stat] - 1 };
        return newStats;
      });
    }
  }

  return (
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
            <div className="points-container" style={{ display: statPointsLeft >= 0 ? "flex" : "none" }}>
              <span className="points-label">Points Left:</span>
              <span className="points-value">{isNaN(statPointsLeft) ? 0 : statPointsLeft}</span>
            </div>

            <Table striped bordered hover size="sm" responsive className="modern-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Stat</th>
                  <th>Level</th>
                  <th>Mod</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {["str", "dex", "con", "int", "wis", "cha"].map((stat) => (
                  <tr key={stat}>
                    <td>
                      <Button
                        className="stat-btn minus-btn"
                        style={{ visibility: stats[stat] > form[stat] ? "visible" : "hidden" }}
                        onClick={() => removeStat(stat)}
                      >-</Button>
                    </td>
                    <td>{stat.toUpperCase()}</td>
                    <td>{computedStats[stat]}</td>
                    <td>{statMods[stat]}</td>
                    <td>
                      <Button
                        className="stat-btn plus-btn"
                        style={{ visibility: statPointsLeft > 0 ? "visible" : "hidden" }}
                        onClick={() => addStat(stat)}
                      >+</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>

          <Card.Footer className="modal-footer">
            <Button className="action-btn save-btn" onClick={statsUpdate}>Save</Button>
            <Button className="action-btn close-btn" onClick={handleCloseStats}>Close</Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  );
}
