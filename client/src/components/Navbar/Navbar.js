import React from "react";
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';

function NavbarComponent() {
    return (
        <Navbar expand="lg" className="shadow-lg mb-5 bg-image">
        <Container fluid>
        <div className="logo-image" style={{width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', marginRight: '5px'}}>
            <img src="../favicon.ico" className="img-fluid" alt="logo"></img>
        </div>
          <Navbar.Brand className="text-dark" style={{fontFamily: "Shadows Into Light, cursive"}} href="/">DnD</Navbar.Brand>
          <Navbar.Toggle aria-controls="navbarScroll" className="text-dark" />
          <Navbar.Collapse id="navbarScroll">
            <Nav className="me-auto my-2 my-lg-0" style={{ maxHeight: '100px' }} navbarScroll>
              <Button href="/zombies" className="p-4 m-1" size="lg"  style={{ backgroundImage: 'url(../images/zombie.jpg)', backgroundSize: "cover", minWidth: 300}} variant="primary">Zombies</Button>  
              <Button href="./#" className="p-4 m-1" size="lg"  style={{ backgroundImage: 'url(../images/homebackground.jpg)', backgroundSize: "cover", minWidth: 300}} variant="primary">Fantasy</Button>         
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

    );
}

export default NavbarComponent;