import React, { useState, useEffect } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { useNavigate } from "react-router";
import Modal from 'react-bootstrap/Modal';

export default function ZombiesHome() {
  // Global Variables
 const navigate = useNavigate();
 const [form, setForm] = useState({ 
  characterName: "Timmy", 
  level: "",
  occupation: "", 
  age: "",
  sex: "",
  height: "",
  weight: "",
});

const [occupation, setOccupation] = useState({ 
  occupation: [], 
});
const [show, setShow] = useState(false);
const handleClose = () => setShow(false);
const handleShow = () => setShow(true);

useEffect(() => {
  async function fetchData() {
    const response = await fetch(`/occupations`);    

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

    setOccupation(record);
  }
  fetchData();   
  return;
  
}, [navigate]);


//  Update the state properties.
  function updateForm(value) {
    return setForm((prev) => {
      return { ...prev, ...value };
    });
  }

 // Function to handle submission.
 async function onSubmit(e) {
  e.preventDefault();   
   sendToDb();
}
// Big Maffs

// Occupation Randomizer
let occupationLength = occupation.length;
let randomOccupation = Math.round(Math.random() * (occupationLength - 1));
let newOccupation = occupation[randomOccupation];

// Age Randomizer
let newAge = Math.round(Math.random() * (50 - 19)) + 19;

// Sex Randomizer
let sexArr = ["Male", "Female"];
let randomSex = Math.round(Math.random() * 1);
let newSex = sexArr[randomSex];

// Height Randomizer
let randomHeight = Math.round(Math.random() * (76 - 60)) + 60;
let feet = Math.floor(randomHeight / 12);
let inches = randomHeight %= 12;
let newHeight = ( feet + "ft " + inches + 'in');

// Weight Randomizer
let randomWeight = Math.round(Math.random() * (220 - 120)) + 120;
let newWeight= randomWeight;


useEffect(() => {
  updateForm({ occupation: newOccupation }); 
  updateForm({ age: newAge }); 
  updateForm({ sex: newSex }); 
  updateForm({ height: newHeight }); 
  updateForm({ weight: newWeight }); 
}, [newOccupation, newAge, newSex, newHeight, newWeight]);

 // Sends form data to database
 async function sendToDb(){
  console.log(occupation);
  const newCharacter = { ...form };
    await fetch("/character/add", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(newCharacter),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
 
   setForm({
    characterName: "", 
    level: "",
    occupation: "",
    age: "",
    sex: "",
    height: "",
    weight: "",});
   navigate(`/zombies-character-sheet`);
 }
 return (
<body style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}>
<center>
      <h1 className="text-light">Zombies</h1>    
      <Container className="mt-5">
      <Row>
        <Col sm={12}>
          <Form className="d-flex">
            <Form.Control
              type="search"
              placeholder="Search Character"
              className="me-2 rounded-pill"
              aria-label="Search"
            />
            <Button className="rounded-pill" variant="outline-primary">
              Search
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
    <br></br>
    <Button onClick={() => {handleShow();}} className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Character (Random)</Button>
    <Button href="/Zombie-Manual-Creation" className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Character (Manual)</Button>
    <br></br>
    <br></br>
    <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create Random</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
      <Form onSubmit={onSubmit} className="px-5">
     
     <Form.Group className="mb-3 pt-3" controlId="formExerciseName">
       <Form.Label className="text-dark">Starting Level</Form.Label>
       <Form.Control onChange={(e) => updateForm({ level: e.target.value })}
        type="text" placeholder="Enter starting level" />     
     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose} type="submit">
            Save
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          </center>
     </Form>
     </Modal.Body>        
      </Modal>
    </center>
    </body>
 );
}