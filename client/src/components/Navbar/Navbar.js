import React from "react";
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import useToken from '../../useToken';
import logoLight from "../../images/logo-light.png";

function NavbarComponent() {
  const { removeToken } = useToken();
  return (
    <Navbar fixed="top" style={{ fontFamily: 'Raleway, sans-serif', height: "80px", backgroundColor: "rgba(0, 0, 0, 0.4)" }}>
      <Container fluid>
        <Navbar.Brand href="/">
          <img src={logoLight} alt="" width="60px" height="60px" className="d-inline-block align-text-top" />
        </Navbar.Brand>
        <Nav className="ml-auto">
          <Nav.Link href='/logout'>
            <Button style={{ borderColor: "gray" }} className='bg-secondary' onClick={removeToken}>
              Logout
            </Button>
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;
