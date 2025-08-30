import React, { useState, useEffect, } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Button, Form, Table, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Modal from 'react-bootstrap/Modal';
import { Link } from "react-router-dom";
import loginbg from "../../../images/loginbg.png";
import useUser from '../../../hooks/useUser';


export default function Zombies() {
  const navigate = useNavigate();
  const user = useUser();

//--------------------------------------------Campaign Section------------------------------

const [form1, setForm1] = useState({ 
  campaignName: "", 
  gameMode: "zombies",
  dm: "",
  players: [],
});

useEffect(() => {
  // Update form1 state once the token is decoded
    if (user) {
      setForm1(prevForm1 => ({ ...prevForm1, dm: user.username }));
    }
  }, [user]);

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

async function loadDmCampaigns() {
  if (!user || !user.username) {
    return;
  }

  const response = await apiFetch(`/campaigns/dm/${user.username}`);

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
  setCampaignDM({ campaign: record });
}

const handleShowHostCampaign = async () => {
  await loadDmCampaigns();
  setShowHostCampaignModal(true);
};

// Fetch Campaigns
  useEffect(() => {
    if (!user || !user.username) {
      return;
    }
  async function fetchData1() {
    const response = await apiFetch(`/campaigns/player/${user.username}`);

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
  
  }, [navigate, user]);



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
      await apiFetch("/campaigns/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
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
<div className="pt-2 text-center" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>

      <div className="d-flex flex-column justify-content-center align-items-center h-100">
        <Button className="mb-3 fantasy-button campaign-button" onClick={handleShowJoinCampaign}>Join Campaign</Button>
        <Button className="mb-3 hostCampaign campaign-button" onClick={handleShowHostCampaign}>Host Campaign</Button>
        <Button className="create-button campaign-button" onClick={handleShow1}>Create Campaign</Button>
      </div>

      <Modal className="dnd-modal" centered show={showJoinCampaignModal} onHide={handleCloseJoinCampaign}>
   <div className="text-center">
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
  </div>
</Modal>

  <Modal className="dnd-modal" centered show={showHostCampaignModal} onHide={handleCloseHostCampaign}>
   <div className="text-center">
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
  </div>
</Modal>

      {/* -----------------------------------Create Campaign--------------------------------------------- */}
      <Modal centered className="dnd-modal" show={show1} onHide={handleClose1}>
        <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Create Campaign</Card.Title>
        <Card.Body>   
        <div className="text-center">
      <Form onSubmit={onSubmit1} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Campaign Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm1({ campaignName: e.target.value })}
        type="text" placeholder="Enter campaign name" />         
     </Form.Group>
     <div className="text-center">
     <Button variant="primary" onClick={handleClose1} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose1}>
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
