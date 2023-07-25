import React from "react";
import Card from 'react-bootstrap/Card';
// import Row from 'react-bootstrap/Row';
import ListGroup from 'react-bootstrap/ListGroup';
import Accordion from 'react-bootstrap/Accordion';

export default function ZombiesCharacterSheet() {
 return (
<body style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}>
<center>
      <h1 className="text-light">Timmy</h1> 
      <Accordion className="mx-2 mt-4">
      <Accordion.Item eventKey="0">
        <Accordion.Header>Character Info</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '10rem' }}>      
        <Card.Title>Character Info</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>Level: 3</ListGroup.Item>
        <ListGroup.Item>Occupation: Doctor</ListGroup.Item>
        <ListGroup.Item>Age: 35</ListGroup.Item>
        <ListGroup.Item>Height: 70in</ListGroup.Item>
        <ListGroup.Item>Weight: 200lbs</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="1">
        <Accordion.Header>Health/Defense</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '10rem' }}>      
        <Card.Title>Health/Defense</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>HP: 24</ListGroup.Item>
        <ListGroup.Item>AC: 10</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="2">
        <Accordion.Header>Stats</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '10rem' }}>      
        <Card.Title>Stats</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item>STR: 10</ListGroup.Item>
        <ListGroup.Item>DEX: 10</ListGroup.Item>
        <ListGroup.Item>CON: 10</ListGroup.Item>
        <ListGroup.Item>INT: 10</ListGroup.Item>
        <ListGroup.Item>WIS: 10</ListGroup.Item>
        <ListGroup.Item>CHA: 10</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="3">
        <Accordion.Header>Skills</Accordion.Header>
        <Accordion.Body>
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
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey="4">
        <Accordion.Header>Weapons</Accordion.Header>
        <Accordion.Body>
        <Card className="mx-2 mb-4" style={{ width: '20rem' }}>      
        <Card.Title>Weapons</Card.Title>
      <ListGroup className="list-group-flush" style={{ fontSize: '.75rem' }}>
        <ListGroup.Item><ListGroup.Item>Iron Sword</ListGroup.Item>Attack Bonus: +8 | Damage: 1d8+4 | Critical: 19/20</ListGroup.Item>
        <ListGroup.Item><ListGroup.Item>Rusty Dagger</ListGroup.Item>Attack Bonus: +6 | Damage: 1d10 | Critical: 20</ListGroup.Item>
      </ListGroup>
    </Card> 
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
    <br></br>
    </center>
    </body>
 );
}