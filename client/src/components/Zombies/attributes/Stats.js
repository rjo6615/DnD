import { React } from "react";
import { Card, Table, Modal, Button } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import wornpaper from "../../../images/wornpaper.jpg";

export default function Stats({ form, showStats, handleCloseStats, totalLevel }) {
  const params = useParams();
  const navigate = useNavigate();

  // Ensure form.startStatTotal is defined and is a number
  const startStatTotal = form.startStatTotal;

  // Item Stats
  const totalItemStr = form.item.reduce((sum, el) => sum + Number(el[2]), 0);
  const totalItemDex = form.item.reduce((sum, el) => sum + Number(el[3]), 0);
  const totalItemCon = form.item.reduce((sum, el) => sum + Number(el[4]), 0);
  const totalItemInt = form.item.reduce((sum, el) => sum + Number(el[5]), 0);
  const totalItemWis = form.item.reduce((sum, el) => sum + Number(el[6]), 0);
  const totalItemCha = form.item.reduce((sum, el) => sum + Number(el[7]), 0);

  const statForm = {
    str: form.str,
    dex: form.dex,
    con: form.con,
    int: form.int,
    wis: form.wis,
    cha: form.cha,
  };

  const statItemForm = {
    str: statForm.str + totalItemStr,
    dex: statForm.dex + totalItemDex,
    con: statForm.con + totalItemCon,
    int: statForm.int + totalItemInt,
    wis: statForm.wis + totalItemWis,
    cha: statForm.cha + totalItemCha,
  };

  // Sends statForm data to the database for update
  async function statsUpdate() {
    const updatedStats = { ...statForm };
    await fetch(`/update-stats/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedStats),
    }).catch((error) => {
      window.alert(error);
      return;
    });
    navigate(0);
  }

  // Stat Mods
  const strMod = Math.floor((statItemForm.str - 10) / 2);
  const dexMod = Math.floor((statItemForm.dex - 10) / 2);
  const conMod = Math.floor((statItemForm.con - 10) / 2);
  const intMod = Math.floor((statItemForm.int - 10) / 2);
  const wisMod = Math.floor((statItemForm.wis - 10) / 2);
  const chaMod = Math.floor((statItemForm.cha - 10) / 2);

  const statTotal = form.str + form.dex + form.con + form.int + form.wis + form.cha;
  const statPointsLeft = Math.floor(totalLevel / 4) - (statTotal - startStatTotal);

  let showBtn = "";

  if (statPointsLeft === 0) {
    showBtn = "none";
  }

  function addStat(stat, statMod) {
    if (statPointsLeft === 0) {
      return;
    }
    statForm[stat]++;
    statItemForm[stat]++;
    document.getElementById(stat).innerHTML = statItemForm[stat];
    document.getElementById("statPointLeft").innerHTML = statPointsLeft - 1;
    document.getElementById(statMod).innerHTML = Math.floor((statItemForm[stat] - 10) / 2);
  }

  function removeStat(stat, statMod) {
    if (statForm[stat] === form[stat]) {
      return;
    }
    statForm[stat]--;
    statItemForm[stat]--;
    document.getElementById(stat).innerHTML = statItemForm[stat];
    document.getElementById("statPointLeft").innerHTML = statPointsLeft + 1;
    document.getElementById(statMod).innerHTML = Math.floor((statItemForm[stat] - 10) / 2);
  }

  return (
    <div>
      <Modal show={showStats} onHide={handleCloseStats} size="sm" centered>
        <center>
          <Card style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover" }}>
            <Card.Title>Stats</Card.Title>
            <Card.Title style={{ display: showBtn }}>Points Left:<span className="mx-1" id="statPointLeft">{statPointsLeft}</span></Card.Title>
            <Table striped bordered hover size="sm">
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
                <tr>
                  <td><Button style={{ display: showBtn }} onClick={() => removeStat('str', 'strMod')} className="bg-danger fa-solid fa-minus"></Button></td>
                  <td>STR</td>
                  <td><span id="str">{statItemForm.str}</span></td>
                  <td><span id="strMod">{strMod}</span></td>
                  <td><Button style={{ display: showBtn }} onClick={() => addStat('str', 'strMod')} className="fa-solid fa-plus"></Button></td>
                </tr>
                <tr>
                  <td><Button style={{ display: showBtn }} onClick={() => removeStat('dex', 'dexMod')} className="bg-danger fa-solid fa-minus"></Button></td>
                  <td>DEX</td>
                  <td><span id="dex">{statItemForm.dex}</span></td>
                  <td><span id="dexMod">{dexMod}</span></td>
                  <td><Button style={{ display: showBtn }} onClick={() => addStat('dex', 'dexMod')} className="fa-solid fa-plus"></Button></td>
                </tr>
                <tr>
                  <td><Button style={{ display: showBtn }} onClick={() => removeStat('con', 'conMod')} className="bg-danger fa-solid fa-minus"></Button></td>
                  <td>CON</td>
                  <td><span id="con">{statItemForm.con}</span></td>
                  <td><span id="conMod">{conMod}</span></td>
                  <td><Button style={{ display: showBtn }} onClick={() => addStat('con', 'conMod')} className="fa-solid fa-plus"></Button></td>
                </tr>
                <tr>
                  <td><Button style={{ display: showBtn }} onClick={() => removeStat('int', 'intMod')} className="bg-danger fa-solid fa-minus"></Button></td>
                  <td>INT</td>
                  <td><span id="int">{statItemForm.int}</span></td>
                  <td><span id="intMod">{intMod}</span></td>
                  <td><Button style={{ display: showBtn }} onClick={() => addStat('int', 'intMod')} className="fa-solid fa-plus"></Button></td>
                </tr>
                <tr>
                  <td><Button style={{ display: showBtn }} onClick={() => removeStat('wis', 'wisMod')} className="bg-danger fa-solid fa-minus"></Button></td>
                  <td>WIS</td>
                  <td><span id="wis">{statItemForm.wis}</span></td>
                  <td><span id="wisMod">{wisMod}</span></td>
                  <td><Button style={{ display: showBtn }} onClick={() => addStat('wis', 'wisMod')} className="fa-solid fa-plus"></Button></td>
                </tr>
                <tr>
                  <td><Button style={{ display: showBtn }} onClick={() => removeStat('cha', 'chaMod')} className="bg-danger fa-solid fa-minus"></Button></td>
                  <td>CHA</td>
                  <td><span id="cha">{statItemForm.cha}</span></td>
                  <td><span id="chaMod">{chaMod}</span></td>
                  <td><Button style={{ display: showBtn }} onClick={() => addStat('cha', 'chaMod')} className="fa-solid fa-plus"></Button></td>
                </tr>
              </tbody>
            </Table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0px' }}>
              <Button
                style={{ display: showBtn, width: '100%' }}
                onClick={() => statsUpdate()}
                className="bg-warning fa-solid fa-floppy-disk"
              ></Button>
              <Button
                style={{ width: '100%' }}
                onClick={() => handleCloseStats()}
                className="bg-secondary fa-solid fa-xmark"
              ></Button>
            </div>
          </Card>
        </center>
      </Modal>
    </div>
  );
}
