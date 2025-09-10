import React from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import logoLight from "../../images/logo-light.png";
import apiFetch from "../../utils/apiFetch";

function NavbarComponent() {
  const handleLogout = async () => {
    await apiFetch("/logout", { method: "POST" });
    window.location.assign("/");
  };

  const handlePass = () => {
    window.dispatchEvent(new Event('pass-turn'));
  };

  return (
    <Navbar
      fixed="top"
      style={{
        fontFamily: "Raleway, sans-serif",
        height: "80px",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <Container fluid>
        <Navbar.Brand href="/">
          <img
            src={logoLight}
            alt=""
            width="60px"
            height="60px"
            className="d-inline-block align-text-top"
          />
        </Navbar.Brand>
        <Nav className="ml-auto">
          {/* <Nav.Link as={Link} to="/spells">Spells</Nav.Link> */}
          {/* <Nav.Link as={Link} to="/weapons">Weapons</Nav.Link> */}
          <Nav.Link>
            <Button
              style={{ borderColor: "gray" }}
              className="bg-secondary me-2"
              onClick={handlePass}
            >
              Pass
            </Button>
          </Nav.Link>
          <Nav.Link>
            <Button
              style={{ borderColor: "gray" }}
              className="bg-secondary"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;
