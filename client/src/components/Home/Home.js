import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';

function Home() {
  return (
    <div>
    <center>
    <Col>
    <div className="card mb-3"  style={{ maxWidth: 840 }}>
  <div className="row no-gutters">
    <div className="">
      <div className="card-body">
        <h4 className="card-title">Choose Game Type</h4>
      </div>
    </div>
  </div>
</div>
</Col>
    <div>
    <Button href="/zombies" className="p-4 m-1" size="lg"  style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "contain", minWidth: 300}} variant="primary">Zombies</Button>
    <Button href="./#" className="p-4 m-1" size="lg"  style={{ backgroundImage: 'url(./images/homebackground.jpg)', backgroundSize: "contain", minWidth: 300}} variant="primary">Fantasy</Button>
    </div>
    </center>
    </div>
  );
}

export default Home;