import React from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";

export default function ZombiesHome() {
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
    <Button href="/zombies-character-sheet" className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Character (Random)</Button>
    <Button href="/Zombie-Manual-Creation" className="p-1 m-1" size="lg"  style={{minWidth: 300}} variant="secondary">Create Character (Manual)</Button>
    <br></br>
    <br></br>
    </center>
    </body>
 );
}