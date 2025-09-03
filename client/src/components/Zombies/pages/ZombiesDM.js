import React, { useState, useEffect } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Button, Col, Form, Row, Container, Table, Card, Alert } from "react-bootstrap";
import Modal from 'react-bootstrap/Modal';
import { useNavigate, useParams } from "react-router-dom";
import loginbg from "../../../images/loginbg.png";
import useUser from '../../../hooks/useUser';
import { SKILLS } from "../skillSchema";

export default function ZombiesDM() {
  const user = useUser();

    const navigate = useNavigate();
    const params = useParams();
    const [records, setRecords] = useState([]);
    const [status, setStatus] = useState(null);
    useEffect(() => {
      async function getRecords() {
        const response = await apiFetch(`/campaigns/${params.campaign}/characters`);

        if (!response.ok) {
          const message = `An error occurred: ${response.statusText}`;
          setStatus({ type: 'danger', message });
          return;
        }

        const data = await response.json();
        setRecords(data);
      }

      getRecords();

      return;
    }, [params.campaign]);
  
    const navigateToCharacter = (id) => {
      navigate(`/zombies-character-sheet/${id}`);
    }

    const [showPlayers, setShowPlayers] = useState(false);
    const handleClosePlayers = () => setShowPlayers(false);
    const handleShowPlayers = () => setShowPlayers(true);
//--------------------------------------------Campaign Section------------------------------
const [campaignDM, setCampaignDM] = useState({ players: [] });

// Fetch CampaignsDM
useEffect(() => {
  if (!user) {
    return;
  }
  async function fetchCampaignsDM() {
    const response = await apiFetch(`/campaigns/dm/${user.username}/${params.campaign}`);

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }

    const record = await response.json();
    if (!record) {
      setStatus({ type: 'danger', message: 'Record not found' });
      navigate("/");
      return;
    }
    setCampaignDM( record );
  }
  fetchCampaignsDM();   
  return;
  
}, [ navigate, user, params.campaign ]);

//---------------------------------------Add Player-------------------------------------------
const [players, setPlayers] = useState({ 
  players: [] 
});

const [playersSearch, setPlayersSearch] = useState("");

 useEffect(() => {
    if (!user) {
      return;
    }

    async function fetchUsers() {
      const response = await apiFetch(`/users`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }

      const record = await response.json();
      if (!record) {
        setStatus({ type: 'danger', message: 'Record not found' });
        navigate("/");
        return;
      }
      setPlayers({players: record});
    }

    fetchUsers();
  }, [navigate, user]);

async function newPlayerSubmit(e) {
  e.preventDefault();   
   sendNewPlayersToDb();
}

const currentCampaign = params.campaign.toString();
async function sendNewPlayersToDb() {
  const newPlayers = [playersSearch];
  await apiFetch(`/campaigns/players/add/${currentCampaign}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newPlayers),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(response.status === 400 ? "Player already exists!" : "Failed to add player");
    }
    return response.text(); // Change to text() instead of json()
  })
  .then(data => {
    setStatus({ type: 'success', message: 'Player Successfully Added!' });
    setPlayersSearch(""); // Clear input after successful submission
    navigate(0);
  })
  .catch(error => {
    console.error('Error:', error);
    setStatus({ type: 'danger', message: error.message });
  });
}

//---------------------------------------Weapons----------------------------------------------

const [form2, setForm2] = useState({ 
    campaign: currentCampaign,
    weaponName: "", 
    enhancement: "",
    damage: "",
    critical: "",
    weaponStyle: "",
    range: ""
  });
  
  const [show2, setShow2] = useState(false);
  const handleClose2 = () => setShow2(false);
  const handleShow2 = () => setShow2(true);
  
  function updateForm2(value) {
    return setForm2((prev) => {
      return { ...prev, ...value };
    });
  }
  
  async function onSubmit2(e) {
    e.preventDefault();   
     sendToDb2();
  }
  
  async function sendToDb2(){
    const newWeapon = { ...form2 };
    Object.keys(newWeapon).forEach((key) => {
      if (newWeapon[key] === "") {
        delete newWeapon[key];
      } else if (!isNaN(newWeapon[key])) {
        newWeapon[key] = Number(newWeapon[key]);
      }
    });
     await apiFetch("/equipment/weapon/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newWeapon),
     })
     .catch(error => {
       setStatus({ type: 'danger', message: error.toString() });
       return;
     });
   
     setForm2({
      campaign: currentCampaign,
      weaponName: "",
      enhancement: "",
      damage: "",
      critical: "",
      weaponStyle: "",
      range: ""
    });
     navigate(0);
   }
   //  ------------------------------------Armor-----------------------------------
  
  const [show3, setShow3] = useState(false);
  const handleClose3 = () => setShow3(false);
  const handleShow3 = () => setShow3(true);
  
   const [form3, setForm3] = useState({ 
    campaign: currentCampaign,
    armorName: "", 
    armorBonus: "",
    maxDex: "",
    armorCheckPenalty: "",
  });
  
  function updateForm3(value) {
    return setForm3((prev) => {
      return { ...prev, ...value };
    });
  }
  
  async function onSubmit3(e) {
    e.preventDefault();   
     sendToDb3();
  }
  
  async function sendToDb3(){
    const newArmor = { ...form3 };
    await apiFetch("/equipment/armor/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newArmor),
     })
   .catch(error => {
     setStatus({ type: 'danger', message: error.toString() });
     return;
   });
  
   setForm3({
    armorName: "", 
    armorBonus: "",
    maxDex: "",
    armorCheckPenalty: "",
  });
   navigate(0);
  }
  
  //------------------------------------Items-------------------------------------------------------------------------------
  const [show4, setShow4] = useState(false);
  const handleClose4 = () => setShow4(false);
  const handleShow4 = () => setShow4(true);
  
   const skillDefaults = Object.fromEntries(SKILLS.map(({ key }) => [key, "0"]));
   const [form4, setForm4] = useState({
    campaign: currentCampaign,
    itemName: "",
    notes: "",
    str: "0",
    dex: "0",
    con: "0",
    int: "0",
    wis: "0",
    cha: "0",
    ...skillDefaults,
  });
  
  function updateForm4(value) {
    return setForm4((prev) => {
      return { ...prev, ...value };
    });
  }
  
  async function onSubmit4(e) {
    e.preventDefault();   
     sendToDb4();
  }
  
  async function sendToDb4(){
    const newItem = { ...form4 };
    await apiFetch("/equipment/item/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newItem),
    })
   .catch(error => {
     setStatus({ type: 'danger', message: error.toString() });
     return;
   });
  
   const skillReset = Object.fromEntries(SKILLS.map(({ key }) => [key, ""]));
   setForm4({
    itemName: "",
    notes: "",
    str: "",
    dex: "",
    con: "",
    int: "",
    wis: "",
    cha: "",
    ...skillReset,
  });
   navigate(0);
  }
  

// -----------------------------------Display-----------------------------------------------------------------------------
 return (
    <div className="pt-2 text-center" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
          <div style={{paddingTop: '150px'}}></div>
{status && (
  <Alert variant={status.type} dismissible onClose={() => setStatus(null)}>
    {status.message}
  </Alert>
)}

<div style={{ maxHeight: '600px', overflowY: 'auto', position: 'relative', zIndex: '4'}}>
      <Table striped bordered condensed="true" className="zombieDMCharacterSelectTable dnd-background">
        <thead>
            <tr>
                <th colSpan="5" style={{fontSize: 28}}>{params.campaign}</th>
            </tr>
            <tr>
              <th>
                {/*-----------------------------------Add Player-----------------------------------------------------*/}
                <Button style={{ borderColor: 'transparent', position: "relative", zIndex: "4" }} onClick={() => { handleShowPlayers();}} className="p-1 m-2 hostCampaign" size="sm" variant="secondary">View/Add Players</Button>
              </th>
                            <th>
                {/*-----------------------------------Create Weapon-----------------------------------------------------*/}
                <Button style={{ borderColor: 'transparent', position: "relative", zIndex: "4" }} onClick={(e) => { e.preventDefault(); handleShow2(); }} className="p-1 m-2 hostCampaign" size="sm" variant="secondary">Create Weapon</Button>
              </th>
                            <th>
                {/*-----------------------------------Create Armor-----------------------------------------------------*/}
                <Button style={{ borderColor: 'transparent', position: "relative", zIndex: "4" }} onClick={(e) => { e.preventDefault(); handleShow3(); }} className="p-1 m-2 hostCampaign" size="sm" variant="secondary">Create Armor</Button>
              </th>
                            <th>
                {/*-----------------------------------Create Item-----------------------------------------------------*/}
                <Button style={{ borderColor: 'transparent', position: "relative", zIndex: "4" }} onClick={(e) => { e.preventDefault(); handleShow4(); }} className="p-1 m-2 hostCampaign" size="sm" variant="secondary">Create Item</Button>
              </th>
            </tr>
          <tr>
            <th>Player</th>
            <th>Character</th>
            <th>Level</th>
            <th>Class</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(records) && records.map((Characters) => (
            <tr key={Characters._id}>
              <td>{Characters.token}</td>
              <td>{Characters.characterName}</td>
              <td>{Characters.occupation.reduce((total, el) => total + Number(el.Level), 0)}</td>
              <td>
                {Characters.occupation.map((el, i) => (
                  <span key={i}>{el.Level + " " + el.Occupation}<br /></span>
                ))}
              </td>
              <td>
                <Button
                  className="fantasy-button"
                  size="sm"
                  style={{ width: 'auto', border: 'none' }}
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
    </div>

        <Modal className="dnd-modal" centered show={showPlayers} onHide={handleClosePlayers}>
         <div className="text-center">
          <Card className="dnd-background">
            <Card.Title>Players</Card.Title>
          <Card.Body>   
        <div className="text-center">
        <Container className="mt-3">
        <Row>
          <Col>
            <Form onSubmit={newPlayerSubmit}>
            <Form.Group className="mb-3 mx-5">
          <Form.Label className="text-light">Select New Player</Form.Label>
          <Form.Select onChange={(e) => setPlayersSearch(e.target.value)}
            defaultValue=""
            type="text">
          <option value="" disabled>
            Select Player
          </option>
            {players.players && players.players.length > 0 ? (
              players.players.map((el) => (
                <option key={el.username}>{el.username}</option>
              ))
            ) : (
              <option>No players available</option>
            )}
          </Form.Select>
        </Form.Group>
          <Button 
          disabled={!playersSearch}
          style={{ position: "relative", zIndex: "4" }} 
          className="rounded-pill" 
          variant="outline-light" 
          type="submit">Add</Button>
            </Form>
            </Col>
        </Row>
        </Container>
        <Table striped bordered condensed="true" className="zombieCharacterSelectTable mt-4">
          <tbody>
          {campaignDM.players.map((el) => (  
            <tr key={el}>
            <td>{el}</td>
            </tr>
          ))}
          </tbody>
        </Table>
            <Button className="ms-4" variant="secondary" onClick={handleClosePlayers}>
              Close
            </Button>
        </div>
       </Card.Body>     
       </Card>   
       </div>
        </Modal>
          {/* ----------------------------------Weapon Modal---------------------------------------- */}
          <Modal className="dnd-modal" centered show={show2} onHide={handleClose2}>
          <div className="text-center">
          <Card className="dnd-background">
            <Card.Title>Create Weapon</Card.Title>         
          <Card.Body>   
          <div className="text-center">
        <Form onSubmit={onSubmit2} className="px-5">
        <Form.Group className="mb-3 pt-3" >
  
         <Form.Label className="text-light">Weapon Name</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm2({ weaponName: e.target.value })}
          type="text" placeholder="Enter Weapon name" /> 
  
         <Form.Label className="text-light">Enhancement Bonus</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm2({ enhancement: e.target.value })}
          type="text" placeholder="Enter Enhancement Bonus" />
  
         <Form.Label className="text-light">Damage</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm2({ damage: e.target.value })}
          type="text" placeholder="Enter Damage" />  
  
         <Form.Label className="text-light">Critical</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm2({ critical: e.target.value })}
          type="text" placeholder="Enter Weapon Critical" />
  
         <Form.Label className="text-light">Weapon Type</Form.Label>
         <Form.Select className="mb-2" onChange={(e) => updateForm2({ weaponStyle: e.target.value })}
          type="text">
          <option></option>
          <option value= "0">One Handed</option> 
          <option value= "1">Two Handed</option> 
          <option value= "2">Ranged</option> 
          </Form.Select>
  
         <Form.Label className="text-light">Range</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm2({ range: e.target.value })}
          type="text" placeholder="Enter Range" />   
  
       </Form.Group>
       <div className="text-center">
       <Button variant="primary" onClick={handleClose2} type="submit">
              Create
            </Button>
            <Button className="ms-4" variant="secondary" onClick={handleClose2}>
              Close
            </Button>
            </div>
       </Form>
       </div>
       </Card.Body>
       </Card>  
       </div>      
        </Modal>
  {/* --------------------------------------- Armor Modal --------------------------------- */}
  <Modal className="dnd-modal" centered show={show3} onHide={handleClose3}>
  <div className="text-center">
  <Card className="dnd-background">
    <Card.Title>Create Armor</Card.Title>
  <Card.Body>   
  <div className="text-center">
  <Form onSubmit={onSubmit3} className="px-5">
  <Form.Group className="mb-3 pt-3"  >
  <Form.Label className="text-light">Armor Name</Form.Label>
  <Form.Control className="mb-2" onChange={(e) => updateForm3({ armorName: e.target.value })}
  type="text" placeholder="Enter Armor name" />   
  <Form.Label className="text-light">Armor Bonus</Form.Label>
  <Form.Control className="mb-2" onChange={(e) => updateForm3({ armorBonus: e.target.value })}
  type="text" placeholder="Enter Armor Bonus" />
  <Form.Label className="text-light">Max Dex Bonus</Form.Label>
  <Form.Control className="mb-2" onChange={(e) => updateForm3({ maxDex: e.target.value })}
  type="text" placeholder="Enter Max Dex Bonus" />     
  <Form.Label className="text-light">Armor Check Penalty</Form.Label>
  <Form.Control className="mb-2" onChange={(e) => updateForm3({ armorCheckPenalty: e.target.value })}
  type="text" placeholder="Enter Armor Check Penalty" />     
  </Form.Group>
  <div className="text-center">
  <Button variant="primary" onClick={handleClose3} type="submit">
      Create
    </Button>
    <Button className="ms-4" variant="secondary" onClick={handleClose3}>
      Close
    </Button>
    </div>
  </Form>
  </div>
  </Card.Body> 
  </Card> 
  </div>      
  </Modal>
  {/* -----------------------------------------Item Modal--------------------------------------------- */}
  <Modal className="dnd-modal" centered show={show4} onHide={handleClose4}>
       <div className="text-center">
        <Card className="dnd-background">
            <Card.Title>Create Item</Card.Title>
          <Card.Body>   
          <div className="text-center">
        <Form onSubmit={onSubmit4} className="px-5">
        <Form.Group className="mb-3 pt-3" >
  
         <Form.Label className="text-light">Item Name</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ itemName: e.target.value })}
          type="text" placeholder="Enter Item name" /> 
  
         <Form.Label className="text-light">Notes</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ notes: e.target.value })}
          type="text" placeholder="Enter Notes" />
  
         <Form.Label className="text-light">Strength</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ str: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Strength" />  
  
         <Form.Label className="text-light">Dexterity</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ dex: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Dexterity" />
  
         <Form.Label className="text-light">Constitution</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ con: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Constitution" />   
  
         <Form.Label className="text-light">Intellect</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ int: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Intellect" />  
  
         <Form.Label className="text-light">Wisdom</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ wis: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Wisdom" />  
  
         <Form.Label className="text-light">Charisma</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ cha: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Charisma" />

         {SKILLS.map(({ key, label }) => (
           <React.Fragment key={key}>
             <Form.Label className="text-light">{label}</Form.Label>
             <Form.Control
               className="mb-2"
               onChange={(e) => updateForm4({ [key]: e.target.value === "" ? 0 : e.target.value })}
               type="text"
               placeholder={`Enter ${label}`}
             />
           </React.Fragment>
         ))}
  
       </Form.Group>
       <div className="text-center">
       <Button variant="primary" onClick={handleClose4} type="submit">
              Create
            </Button>
            <Button className="ms-4" variant="secondary" onClick={handleClose4}>
              Close
            </Button>
            </div>
       </Form>
       </div>
       </Card.Body> 
       </Card>
       </div>       
        </Modal>
      </div>
    )
}
