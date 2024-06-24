import React from 'react';
import { Button, Col } from 'react-bootstrap';
import useToken from '../../useToken';
import loginbg from "../../images/loginbg.jpg";
import zombiesbg from "../../images/zombiesbg.jpg";

export default function Home() {
  const { removeToken } = useToken();

  return (
    <div style={{ backgroundImage: `url(${loginbg})`, backgroundSize: 'cover', height: '100vh', backgroundPosition: 'center' }}>
      <center>
        <Col>
          <h2 className='pt-5 text-light'>Choose Game Type</h2>
        </Col>
        <div>
          <Button href='/zombies' className='p-4 m-1' size='lg' style={{ backgroundImage: `url(${zombiesbg})`, backgroundSize: 'cover', minWidth: 300 }} variant='primary'>
            Zombies
          </Button>
        </div>
      </center>
      <center>
        <h2 className='mt-5 text-light'>Mobile Download</h2>
        <Button href='../android-download/DnD.apk' download className='mx-2'>
          Android
        </Button>
      </center>
      <div className='p-5'>
        <center>
          <a className='text-light' href='/logout'>
            <Button className='bg-secondary' onClick={removeToken}>
              Logout
            </Button>
          </a>
        </center>
      </div>
    </div>
  );
}