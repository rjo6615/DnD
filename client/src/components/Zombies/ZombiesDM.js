import React, { useState, useEffect } from "react";
import { Button, Col, Form, Row, Container, Table, Card } from "react-bootstrap";
import { useNavigate } from "react-router";
import Modal from 'react-bootstrap/Modal';
import { jwtDecode } from 'jwt-decode';
import { useParams } from "react-router";
import zombiesbg from "../../images/zombiesbg.jpg";

export default function ZombiesDM() {
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
  
    const navigate = useNavigate();
    const params = useParams();
    const [records, setRecords] = useState([]);
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

    const [showPlayers, setShowPlayers] = useState(false);
    const handleClosePlayers = () => setShowPlayers(false);
    const handleShowPlayers = () => setShowPlayers(true);
//--------------------------------------------Campaign Section------------------------------
const [campaignDM, setCampaignDM] = useState({ players: [] });

// Fetch CampaignsDM
useEffect(() => {
  if (!decodedToken) {
    return;
  }
  async function fetchCampaignsDM() {
    const response = await fetch(`/campaignsDM/${decodedToken.username}/${params.campaign}`);    

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      window.alert(message);
      return;
    }

    const record = await response.json();
    if (!record) {
      window.alert(`Record not found`);
      navigate("/");
      return;
    }
    setCampaignDM( record );
  }
  fetchCampaignsDM();   
  return;
  
}, [ navigate, decodedToken, params.campaign ]);

//---------------------------------------Add Player-------------------------------------------
const [players, setPlayers] = useState({ 
  players: [] 
});

const [playersSearch, setPlayersSearch] = useState("");

 useEffect(() => {
    if (!decodedToken) {
      return;
    }

    async function fetchUsers() {
      const token = localStorage.getItem('token');
      const response = await fetch(`/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const record = await response.json();
      if (!record) {
        window.alert(`Record not found`);
        navigate("/");
        return;
      }
      setPlayers({players: record});
    }

    fetchUsers();
  }, [navigate, decodedToken]);

async function newPlayerSubmit(e) {
  e.preventDefault();   
   sendNewPlayersToDb();
}

const currentCampaign = params.campaign.toString();
async function sendNewPlayersToDb() {
  const newPlayers = [playersSearch];
  const token = localStorage.getItem('token');

  await fetch(`/players/add/${currentCampaign}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // Include the token in the request headers
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
    alert("Player Successfully Added!");
    setPlayersSearch(""); // Clear input after successful submission
    navigate(0);
  })
  .catch(error => {
    console.error('Error:', error);
    window.alert(error.message);
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
      await fetch("/weapon/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newWeapon),
     })
     .catch(error => {
       window.alert(error);
       return;
     });
   
     setForm2({
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
    await fetch("/armor/add", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(newArmor),
   })
   .catch(error => {
     window.alert(error);
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
    appraise: "0",
    balance: "0",
    bluff: "0",
    climb: "0",
    concentration: "0",
    decipherScript: "0",
    diplomacy: "0",
    disableDevice: "0",
    disguise: "0",
    escapeArtist: "0",
    forgery: "0",
    gatherInfo: "0",
    handleAnimal: "0",
    heal: "0",
    hide: "0",
    intimidate: "0",
    jump: "0",
    listen: "0",
    moveSilently: "0",
    openLock: "0",
    ride: "0",
    search: "0",
    senseMotive: "0",
    sleightOfHand: "0",
    spot: "0",
    survival: "0",
    swim: "0",
    tumble: "0",
    useTech: "0",
    useRope: "0",
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
    await fetch("/item/add", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(newItem),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
  
   setForm4({
    itemName: "", 
    notes: "",
    str: "",
    dex: "",
    con: "",
    int: "",
    wis: "",
    cha: "",
    appraise: "",
    balance: "",
    bluff: "",
    climb: "",
    concentration: "",
    decipherScript: "",
    diplomacy: "",
    disableDevice: "",
    disguise: "",
    escapeArtist: "",
    forgery: "",
    gatherInfo: "",
    handleAnimal: "",
    heal: "",
    hide: "",
    intimidate: "",
    jump: "",
    listen: "",
    moveSilently: "",
    openLock: "",
    ride: "",
    search: "",
    senseMotive: "",
    sleightOfHand: "",
    spot: "",
    survival: "",
    swim: "",
    tumble: "",
    useTech: "",
    useRope: "",
  });
   navigate(0);
  }
  

  // -----------------------------------Display-----------------------------------------------------------------------------
 return (
    <center className="pt-2" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
          <div style={{paddingTop: '80px'}}></div>
          <h1 className="text-light" 
           style={{            
            fontSize: 28, 
            width: "300px", 
            height: "95px", 
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            borderRadius: "10px", // Rounded corners
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" // Light shadow for depth
          }}>{params.campaign}</h1>  
{/*-----------------------------------Add Player-----------------------------------------------------*/}
<Button style={{ position: "relative", zIndex: "4" }} onClick={() => { handleShowPlayers();}} className="p-1 m-2 hostCampaign" size="sm" variant="secondary">View/Add Players</Button>
<div style={{ maxHeight: '300px', overflowY: 'auto', position: 'relative', zIndex: '4' }}>
      <Table striped bordered condensed="true" className="zombieDMCharacterSelectTable dnd-background">
        <thead>
          <tr>
            <th>Player</th>
            <th>Character</th>
            <th>Level</th>
            <th>Occupation</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {records.map((Characters) => (
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
         <center>
          <Card className="dnd-background">
            <Card.Title>Players</Card.Title>
          <Card.Body>   
        <center>
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
        </center>
       </Card.Body>     
       </Card>   
       </center>
        </Modal>
{/* -------------------------------------Add Weapon/Armor/Item--------------------------------------- */}
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" />

<nav className="menuDM">
  <input type="checkbox" href="#" className="menuDM-open" name="menuDM-open" id="menuDM-open"/>
  <label className="menuDM-open-button" htmlFor="menuDM-open">
    <span className="hamburger hamburger-1"></span>
    <span className="hamburger hamburger-2"></span>
    <span className="hamburger hamburger-3"></span>
  </label>
  
  <a onClick={(e) => { e.preventDefault(); handleShow2(); }} href="#/" className="menuDM-item"> 
  <i className="fa-solid fa-wand-sparkles"></i> 
</a>
  <a onClick={(e) => { e.preventDefault(); handleShow3(); }} href="#/" className="menuDM-item">
  <i className="fa-solid fa-shield"></i>
</a>
<a onClick={(e) => { e.preventDefault(); handleShow4(); }} href="#/" className="menuDM-item">
  <i className="fa-solid fa-briefcase"></i>
</a>
</nav>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
    <defs>
      <filter id="shadowed-goo">          
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feGaussianBlur in="goo" stdDeviation="3" result="shadow" />
          <feColorMatrix in="shadow" mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 -0.2" result="shadow" />
          <feOffset in="shadow" dx="1" dy="1" result="shadow" />
          <feBlend in2="shadow" in="goo" result="goo" />
          <feBlend in2="goo" in="SourceGraphic" result="mix" />
      </filter>
      <filter id="goo">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feBlend in2="goo" in="SourceGraphic" result="mix" />
      </filter>
    </defs>
</svg>
          {/* ----------------------------------Weapon Modal---------------------------------------- */}
          <Modal className="dnd-modal" centered show={show2} onHide={handleClose2}>
          <center>
          <Card className="dnd-background">
            <Card.Title>Create Weapon</Card.Title>         
          <Card.Body>   
          <center>
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
       <center>
       <Button variant="primary" onClick={handleClose2} type="submit">
              Create
            </Button>
            <Button className="ms-4" variant="secondary" onClick={handleClose2}>
              Close
            </Button>
            </center>
       </Form>
       </center>
       </Card.Body>
       </Card>  
       </center>      
        </Modal>
  {/* --------------------------------------- Armor Modal --------------------------------- */}
  <Modal className="dnd-modal" centered show={show3} onHide={handleClose3}>
  <center>
  <Card className="dnd-background">
    <Card.Title>Create Armor</Card.Title>
  <Card.Body>   
  <center>
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
  <center>
  <Button variant="primary" onClick={handleClose3} type="submit">
      Create
    </Button>
    <Button className="ms-4" variant="secondary" onClick={handleClose3}>
      Close
    </Button>
    </center>
  </Form>
  </center>
  </Card.Body> 
  </Card> 
  </center>      
  </Modal>
  {/* -----------------------------------------Item Modal--------------------------------------------- */}
  <Modal className="dnd-modal" centered show={show4} onHide={handleClose4}>
       <center>
        <Card className="dnd-background">
            <Card.Title>Create Item</Card.Title>
          <Card.Body>   
          <center>
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
  
         <Form.Label className="text-light">Appraise</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ appraise: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Appraise" />
  
         <Form.Label className="text-light">Balance</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ balance: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Balance" />
  
         <Form.Label className="text-light">Bluff</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ bluff: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Bluff" />
  
         <Form.Label className="text-light">Climb</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ climb: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Climb" /> 
  
         <Form.Label className="text-light">Concentration</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ concentration: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Concentration" />
  
         <Form.Label className="text-light">Decipher Script</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ decipherScript: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Decipher Script" />
  
         <Form.Label className="text-light">Diplomacy</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ diplomacy: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Diplomacy" />
  
         <Form.Label className="text-light">Disable Device</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ disableDevice: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Disable Device" />
  
         <Form.Label className="text-light">Disguise</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ disguise: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Disguise" />
  
         <Form.Label className="text-light">Escape Artist</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ escapeArtist: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Escape Artist" />
  
         <Form.Label className="text-light">Forgery</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ forgery: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Forgery" />
  
         <Form.Label className="text-light">Gather Info</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ gatherInfo: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Gather Info" />
  
         <Form.Label className="text-light">Handle Animal</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ handleAnimal: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Handle Animal" />
  
         <Form.Label className="text-light">Heal</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ heal: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Heal" />
  
         <Form.Label className="text-light">Hide</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ hide: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Hide" />
  
         <Form.Label className="text-light">Intimidate</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ intimidate: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Intimidate" />
  
         <Form.Label className="text-light">Jump</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ jump: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Jump" /> 
  
         <Form.Label className="text-light">Listen</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ listen: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Listen" />
  
         <Form.Label className="text-light">Move Silently</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ moveSilently: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Move Silently" />
  
         <Form.Label className="text-light">Open Lock</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ openLock: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Open Lock" />
  
         <Form.Label className="text-light">Ride</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ ride: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Ride" />
  
         <Form.Label className="text-light">Search</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ search: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Search" />
  
         <Form.Label className="text-light">Sense Motive</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ senseMotive: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Sense Motive" />
  
         <Form.Label className="text-light">Sleight of Hand</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ sleightOfHand: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Sleight of Hand" />
  
         <Form.Label className="text-light">Spot</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ spot: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Spot" />
  
         <Form.Label className="text-light">Survival</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ survival: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Survival" />
  
         <Form.Label className="text-light">Swim</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ swim: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Swim" />
  
         <Form.Label className="text-light">Tumble</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ tumble: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Tumble" />
  
         <Form.Label className="text-light">Use Tech</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ useTech: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Use Tech" />
  
         <Form.Label className="text-light">Use Rope</Form.Label>
         <Form.Control className="mb-2" onChange={(e) => updateForm4({ useRope: e.target.value === "" ? 0 : e.target.value, })}
          type="text" placeholder="Enter Use Rope" />
  
       </Form.Group>
       <center>
       <Button variant="primary" onClick={handleClose4} type="submit">
              Create
            </Button>
            <Button className="ms-4" variant="secondary" onClick={handleClose4}>
              Close
            </Button>
            </center>
       </Form>
       </center>
       </Card.Body> 
       </Card>
       </center>       
        </Modal>
      </center>
    )
}