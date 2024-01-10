import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';

function Home() {
  return (
    <div>
      <center>
        <Col>
          <div className="card mb-3" style={{ maxWidth: 840 }}>
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
          <Button href="/zombies" className="p-4 m-1" size="lg" style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "contain", minWidth: 300 }} variant="primary">Zombies</Button>
          <Button href="./#" className="p-4 m-1" size="lg" style={{ backgroundImage: 'url(./images/homebackground.jpg)', backgroundSize: "contain", minWidth: 300 }} variant="primary">Fantasy</Button>
        </div>
      </center>
      <center>
        <h2 className="mt-5">Mobile Download</h2>
        <Button href="android/app/build/outputs/apk/debug/app-debug.apk" download className="mx-2">Android</Button>
        <Button href="https://apps.apple.com/us/app/your-ios-app-id" className="mx-2" target="_blank" rel="noopener noreferrer">iOS</Button>
      </center>
    </div>
  );
}

export default Home;
