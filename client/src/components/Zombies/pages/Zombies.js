import React, { useState, useEffect, } from "react";
import { Button, Col, Container, Form, Row, Table, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import { Link } from "react-router-dom";
import zombiesbg from "../../../images/zombiesbg.jpg";
import { FaDungeon, FaCrown } from 'react-icons/fa';
import useDecodedToken from '../../../hooks/useDecodedToken';


export default function ZombiesHome() {
  const navigate = useNavigate();
  const decodedToken = useDecodedToken();

//--------------------------------------------Campaign Section------------------------------

const [form1, setForm1] = useState({ 
  campaignName: "", 
  gameMode: "zombies",
  dm: "",
  players: [],
});

useEffect(() => {
  // Update form1 state once the token is decoded
  if (decodedToken) {
    setForm1(prevForm1 => ({ ...prevForm1, dm: decodedToken.username }));
  }
}, [decodedToken]);

const [campaign, setCampaign] = useState({ 
  campaign: [], 
});

const [campaignDM, setCampaignDM] = useState({ 
  campaign: [], 
});

const [show1, setShow1] = useState(false);
const handleClose1 = () => setShow1(false);
const handleShow1 = () => setShow1(true);

const [showJoinCampaignModal, setShowJoinCampaignModal] = useState(false);
const handleCloseJoinCampaign = () => setShowJoinCampaignModal(false);
const handleShowJoinCampaign = () => setShowJoinCampaignModal(true);

const [showHostCampaignModal, setShowHostCampaignModal] = useState(false);
const handleCloseHostCampaign = () => setShowHostCampaignModal(false);
const handleShowHostCampaign = () => setShowHostCampaignModal(true);

// Fetch Campaigns
  useEffect(() => {
    if (!decodedToken || !decodedToken.username) {
      return;
    }
  async function fetchData1() {
    const response = await fetch(`/campaigns/${decodedToken.username}`, { credentials: 'include' });

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
    setCampaign({campaign: record});
  }
  fetchData1();   
  return;
  
}, [navigate, decodedToken]);

// Fetch CampaignsDM
useEffect(() => {
    if (!decodedToken || !decodedToken.username) {
      return;
    }
  async function fetchCampaignsDM() {
    const response = await fetch(`/campaignsDM/${decodedToken.username}`, { credentials: 'include' });

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
    setCampaignDM({campaign: record});
  }
  fetchCampaignsDM();   
  return;
  
}, [ navigate, decodedToken ]);


function updateForm1(value) {
  return setForm1((prev) => {
    return { ...prev, ...value };
  });
}

async function onSubmit1(e) {
  e.preventDefault();   
   sendToDb1();
}
 async function sendToDb1(){
    const newCampaign = { ...form1 };
      await fetch("/campaign/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       credentials: 'include',
       body: JSON.stringify(newCampaign),
     })
     .catch(error => {
       window.alert(error);
       return;
     });

     setForm1({
      campaignName: "", 
      gameMode: "zombies",
    });
     navigate(0);
   }

// -----------------------------------Display-----------------------------------------------------------------------------
 return (
<center className="pt-2" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div style={{paddingTop: "80px"}}></div>
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
          }}>Zombies</h1>    
      <Container className="mt-3">
      <Row>
        <Col>
        <Button className="m-2 fantasy-button" style={{borderColor: "transparent"}} onClick={handleShowJoinCampaign}>
        <FaDungeon className="icon" /> {/* Add an icon */}
        Join Campaign
      </Button>

      <Modal className="dnd-modal" centered show={showJoinCampaignModal} onHide={handleCloseJoinCampaign}>
   <center>
    <Card className="dnd-background">
    <Card.Title>Join Campaign</Card.Title>

  <Card.Body>
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Campaign Name</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {campaign.campaign.map((el) => (
          <tr key={el.campaignName}>
            <td>{el.campaignName}</td>
            <td>
              <Link className="btn btn-link" to={`/zombies-character-select/${el.campaignName}`}>
              <Button style={{borderColor: "transparent"}} className="fantasy-button" type="submit">Join</Button>              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Card.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseJoinCampaign}>
      Close
    </Button>
  </Modal.Footer>
  </Card>
  </center>
</Modal>
      <Button className="m-2 hostCampaign" style={{borderColor: "transparent"}} onClick={handleShowHostCampaign}>
        <FaCrown className="icon" />
        Host Campaign
      </Button>

  <Modal className="dnd-modal" centered show={showHostCampaignModal} onHide={handleCloseHostCampaign}>
   <center>
    <Card className="dnd-background">
    <Card.Title>Host Campaign</Card.Title>

  <Card.Body>
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Campaign Name</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {campaignDM.campaign.map((el) => (
          <tr key={el.campaignName}>
            <td>{el.campaignName}</td>
            <td>
              <Link className="btn btn-link" to={`/zombies-dm/${el.campaignName}`}>
              <Button style={{borderColor: "transparent"}} className="hostCampaign" type="submit">Host</Button>              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Card.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseHostCampaign}>
      Close
    </Button>
  </Modal.Footer>
  </Card>
  </center>
</Modal>
        </Col>
      </Row>
    </Container>
    <br></br>    
    <Button onClick={() => { handleShow1(); }} className="create-button">
      <i className="fa fa-plus"></i>
    </Button>
      {/* -----------------------------------Create Campaign--------------------------------------------- */}
      <Modal centered className="dnd-modal" show={show1} onHide={handleClose1}>
        <center>
        <Card className="dnd-background">
          <Card.Title>Create Campaign</Card.Title>
        <Card.Body>   
        <center>
      <Form onSubmit={onSubmit1} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Campaign Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm1({ campaignName: e.target.value })}
        type="text" placeholder="Enter campaign name" />         
     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose1} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose1}>
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