import React, { useEffect, useState } from "react";
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import { useParams, useNavigate } from "react-router-dom";
import '../../App.scss';
import { jwtDecode } from 'jwt-decode';
import zombiesbg from "../../images/zombiesbg.jpg";
import wornpaper from "../../images/wornpaper.jpg";
import banner from "../../images/banner.png";

export default function RecordList() {
  const params = useParams();
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();
  const [decodedToken, setDecodedToken] = useState(null);

  useEffect(() => {
    // Assuming you have the JWT stored in localStorage
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setDecodedToken(decoded);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!decodedToken) {
      return;
    }
    async function getRecords() {
      const response = await fetch(`/campaign/${params.campaign}/${decodedToken.username}`);

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
  }, [params.campaign, decodedToken]);

  const navigateToCharacter = (id) => {
    navigate(`/zombies-character-sheet/${id}`);
  }
  return (
    <center className="pt-2" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div style={{paddingTop: '80px'}}>
      <h1 style={{ fontSize: 28, backgroundPositionY: "450%", width: "300px", height: "95px", backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundRepeat: "no-repeat"}}className="text-dark">{params.campaign.toString()}</h1> 
        <Table style={{ marginTop: "-30px", width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover" }} striped bordered condensed="true" className="zombieCharacterSelectTable bg-light">
          <thead>
            <tr>
              <th>Character</th>
              <th>Level</th>
              <th>Occupation</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
          {records.map((Characters) => (
              <tr key={Characters._id}>
                <td>{Characters.characterName}</td>
                <td>{Characters.occupation.reduce((total, el) => total + Number(el.Level), 0)}</td>
                <td>
                  {Characters.occupation.map((el, i) => (
                    <span key={i}>{el.Level + " " + el.Occupation}<br></br></span>
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
