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
  <button
      onClick={handleLogout}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 16px",
        background: "#2b2b2b",
        color: "#f5f5f5",
        border: "1px solid #3a3a3a",
        borderRadius: "10px",
        fontSize: "15px",
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        transition: "all 0.2s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "#333";
        e.currentTarget.style.border = "1px solid #555";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "#2b2b2b";
        e.currentTarget.style.border = "1px solid #3a3a3a";
      }}
    >
      {/* Minimal logout icon */}
      <span
        style={{
          position: "relative",
          width: "18px",
          height: "18px",
          display: "inline-block",
        }}
      >
        {/* Doorframe */}
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: "0",
            width: "10px",
            height: "14px",
            border: "2px solid currentColor",
            borderRadius: "2px",
          }}
        />
        {/* Arrow */}
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "12px",
            transform: "translateY(-50%)",
            width: "0",
            height: "0",
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderLeft: "7px solid currentColor",
          }}
        />
      </span>
      Logout
    </button>
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;
