import React from 'react';
import { Button } from 'react-bootstrap';
import loginbg from "../../images/loginbg.png";
import zombiesbg from "../../images/zombiesbg.jpg";
import NavbarComponent from '../Navbar/Navbar'; // Adjust the import path as needed

export default function Home() {
  return (
    <div style={{ backgroundImage: `url(${loginbg})`, backgroundSize: 'cover', height: '100vh', backgroundPosition: 'center', fontFamily: 'Raleway, sans-serif' }}>
      <NavbarComponent />
      <center>
      <div style={{ paddingTop: '90px' }}></div>
        
          <h2 className='text-light'
            style={{            
            fontSize: 28, 
            width: "300px", 
            height: "95px", 
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            borderRadius: "10px", // Rounded corners
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" // Light shadow for depth
          }}>Choose Game Type</h2>
          <div>
            <Button href='/zombies' className='p-4 m-1' size='lg' style={{borderColor: "transparent", backgroundImage: `url(${zombiesbg})`, backgroundPosition: '50% 25%', backgroundSize: 'cover', minWidth: 300 }} variant='primary'>
             <span className="px-2" style={{backgroundColor: "rgba(0, 0, 0, 0.3)"}}>Zombies</span> 
            </Button>
          </div>
        </center>
      </div>
  );
}
