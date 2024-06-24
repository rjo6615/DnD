import React from 'react';
import { Button, Col } from 'react-bootstrap';
import loginbg from "../../images/loginbg.png";
import zombiesbg from "../../images/zombiesbg.jpg";
import NavbarComponent from '../Navbar/Navbar'; // Adjust the import path as needed

export default function Home() {
  return (
    <div style={{ backgroundImage: `url(${loginbg})`, backgroundSize: 'cover', height: '100vh', backgroundPosition: 'center', fontFamily: 'Raleway, sans-serif' }}>
      <NavbarComponent />
      
      <div style={{ paddingTop: '80px' }}>
        <center>
          <Col>
            <h2 className='pt-5 text-light'>Choose Game Type</h2>
          </Col>
          <div>
            <Button href='/zombies' className='p-4 m-1' size='lg' style={{ backgroundImage: `url(${zombiesbg})`, backgroundPosition: '50% 25%', backgroundSize: 'cover', minWidth: 300 }} variant='primary'>
             <span className="px-2" style={{backgroundColor: "rgba(0, 0, 0, 0.3)"}}>Zombies</span> 
            </Button>
          </div>
        </center>
      </div>
    </div>
  );
}
