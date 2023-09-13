import React, { useEffect, useState } from "react";
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import { useParams, useNavigate } from "react-router-dom";
import '../../App.scss';

export default function RecordList() {
  const params = useParams();
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function getRecords() {
      const response = await fetch(`/campaign/${params.campaign}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const records = await response.json();
      setRecords(records);
    }

    getRecords();

    return;
  }, [params.campaign]);

  const navigateToCharacter = (id) => {
    navigate(`/zombies-character-sheet/${id}`);
  }

  return (
    <center className="pt-2" style={{ backgroundImage: 'url(../images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div>
      <h1 style={{ fontSize: 28, backgroundPositionY: "450%", width: "300px", height: "95px", backgroundImage: 'url(../images/banner.png)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}className="text-dark">{params.campaign.toString()}</h1> 
        <Table style={{ marginTop: "-30px", width: 'auto', backgroundImage: 'url(../images/wornpaper.jpg)', backgroundSize: "cover" }} striped bordered condensed className="zombieCharacterSelectTable bg-light">
          <thead>
            <tr>
              <th>Character</th>
              <th>Level</th>
              <th>Occupation</th>
              <th>View</th> {/* Header for View button */}
            </tr>
          </thead>
          <tbody>
          {records.map((Characters) => (
              <tr key={Characters._id}>
                <td>{Characters.characterName}</td>
                <td>{Characters.level}</td>
                <td>
                  {Characters.occupation.map((el, i) => (
                    <span key={i}>{el.Occupation}</span>
                  ))}
                </td>
                <td>
                  <Button
                    className="fantasy-view-button"
                    size="sm"
                    style={{ width: 'auto' }}
                    variant="primary"
                    onClick={() => navigateToCharacter(Characters._id)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <br />
      </div>
    </center>
  );
}
