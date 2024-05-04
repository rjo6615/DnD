import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import { removeToken } from '../../useToken.js';

function Home() {
  return (
    <div style={{backgroundImage: 'URL("./images/Dndbg.png")', backgroundSize: "cover", height: '100vh', backgroundPosition: 'center'}}>
      <center>
        <Col>        
            <h2 className='pt-5 text-light'>Choose Game Type</h2>        
        </Col>
        <div style={{ padding: 10 }}>
        <center>
      <a className="text-light text-decoration-none" href="/logout"><Button onClick={removeToken}>Logout</Button></a>
      </center>
      </div>
        <div>
          <Button href="/zombies" className="p-4 m-1" size="lg" style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "contain", minWidth: 300 }} variant="primary">Zombies</Button>
          {/* <Button href="./#" className="p-4 m-1" size="lg" style={{ backgroundImage: 'url(./images/homebackground.jpg)', backgroundSize: "contain", minWidth: 300 }} variant="primary">Fantasy</Button> */}
        </div>
      </center>
      <center>
        <h2 className="mt-5 text-light">Mobile Download</h2>
        <Button href="../android-download/DnD.apk" download className="mx-2">Android</Button>
        {/* <Button href="/" className="mx-2" target="_blank" rel="noopener noreferrer">iOS</Button> */}
      </center>
    </div>
  );
}

export default Home;
