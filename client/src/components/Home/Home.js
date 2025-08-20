import React from 'react';
import { Button } from 'react-bootstrap';
import './Home.css';
export default function Home() {
  return (
    <div className="home-container">
      <div className="text-center">
        <div className="home-spacer"></div>

        <h2 className="text-light home-title">Choose Game Type</h2>
        <div>
          <Button
            href="/zombies"
            className="p-4 m-1 home-button"
            size="lg"
            variant="primary"
          >
            <span className="px-2 home-button-text">Zombies</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
