import React from "react";
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import ListGroup from 'react-bootstrap/ListGroup';

export default function ZombiesCharacterSheet() {
 return (
<body style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}>
<center>
      <h1 className="text-light">Timmy</h1>  
      <Row className="g-4 mt-2 justify-content-center"> 
      <Card className="mx-2 mb-4" style={{ width: '10rem' }}>      
        <Card.Title>Stats</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>Level: 3</ListGroup.Item>
        <ListGroup.Item>Occupation: Doctor</ListGroup.Item>
        <ListGroup.Item>Age: 35</ListGroup.Item>
        <ListGroup.Item>Height: 70in</ListGroup.Item>
        <ListGroup.Item>Weight: 200lbs</ListGroup.Item>
        <ListGroup.Item>HP: 24</ListGroup.Item>
        <ListGroup.Item>AC: 10</ListGroup.Item>
        <ListGroup.Item>STR: 10 <br></br> DEX: 10 <br></br> CON: 10 <br></br> INT: 10 <br></br> WIS: 10 <br></br> CHA: 10</ListGroup.Item>
      </ListGroup>
    </Card>  
    <Card className="mx-2 mb-4" style={{ width: '10rem' }}>
        <Card.Title>Skills</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>Appraise: 4</ListGroup.Item>
        <ListGroup.Item>Balance: 4</ListGroup.Item>
        <ListGroup.Item>Bluff: 4</ListGroup.Item>
        <ListGroup.Item>Climb: 4</ListGroup.Item>
        <ListGroup.Item>Concentration: 4</ListGroup.Item>
        <ListGroup.Item>Decipher Script: 4</ListGroup.Item>
        <ListGroup.Item>Diplomacy: 4</ListGroup.Item>
        <ListGroup.Item>Disable Device: 4</ListGroup.Item>
        <ListGroup.Item>Disguise: 4</ListGroup.Item>
        <ListGroup.Item>Escape Artist: 4</ListGroup.Item>
        <ListGroup.Item>Forgery: 4</ListGroup.Item>
        <ListGroup.Item>Gather Info: 4</ListGroup.Item>
        <ListGroup.Item>Handle Animal: 4</ListGroup.Item>
        <ListGroup.Item>Heal: 4</ListGroup.Item>
        <ListGroup.Item>Intimidate: 4</ListGroup.Item>
        <ListGroup.Item>Jump: 4</ListGroup.Item>
        <ListGroup.Item>Listen: 4</ListGroup.Item>
        <ListGroup.Item>Move Silently: 4</ListGroup.Item>
        <ListGroup.Item>Open Lock: 4</ListGroup.Item>
        <ListGroup.Item>Ride: 4</ListGroup.Item>
        <ListGroup.Item>Search: 4</ListGroup.Item>
        <ListGroup.Item>Sense Motive: 4</ListGroup.Item>
        <ListGroup.Item>Sleight of Hand: 4</ListGroup.Item>
        <ListGroup.Item>Spellcraft: 4</ListGroup.Item>
        <ListGroup.Item>Spot: 4</ListGroup.Item>
        <ListGroup.Item>Survival: 4</ListGroup.Item>
        <ListGroup.Item>Swim: 4</ListGroup.Item>
        <ListGroup.Item>Tumble: 4</ListGroup.Item>
        <ListGroup.Item>Use Rope: 4</ListGroup.Item>
      </ListGroup>
    </Card> 
    </Row>
    </center>
    </body>
 );
}