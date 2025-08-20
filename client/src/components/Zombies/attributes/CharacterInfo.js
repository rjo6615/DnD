import React, { useState } from "react";
import { Card, Table, Modal, Button } from "react-bootstrap";
import wornpaper from "../../../images/wornpaper.jpg";
import levelup from "../../../images/levelup.png";
import LevelUp from "./LevelUp"; // Import LevelUp component

export default function CharacterInfo({ form, show, handleClose }) {
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  const handleShowLevelUpModal = () => {
    setShowLevelUpModal(true);
  };

  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
  };

  return (
    <Modal show={show} onHide={handleClose} size="sm" centered>
      <div className="text-center">
        <Card style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>
          <Card.Title>Character Info</Card.Title>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Level</th>
                <td>{totalLevel}</td>
              </tr>
            </thead>
            <thead>
              <tr>
                <th>Occupation</th>
                <td>{form.occupation.map((el, i) => (
                  <span key={i}>{el.Level} {el.Occupation}<br /></span>
                ))}</td>
              </tr>
            </thead>
            <thead>
              <tr>
                <th>Age</th>
                <td>{form.age}</td>
              </tr>
            </thead>
            <thead>
              <tr>
                <th>Sex</th>
                <td>{form.sex}</td>
              </tr>
            </thead>
            <thead>
              <tr>
                <th>Height</th>
                <td>{form.height}</td>
              </tr>
            </thead>
            <thead>
              <tr>
                <th>Weight</th>
                <td>{form.weight} lbs</td>
              </tr>
            </thead>
          </Table>
          <div className="text-center">
            <Button style={{ backgroundImage: `url(${levelup})`, backgroundSize: "cover",  backgroundRepeat: "no-repeat", height: "40px", width: "40px"}} className="mx-1 mb-3" variant="secondary" onClick={handleShowLevelUpModal}></Button>
          </div>
        </Card> 
      </div>

      {/* Render LevelUp modal when showLevelUpModal state is true */}
      <LevelUp show={showLevelUpModal} handleClose={handleCloseLevelUpModal} form={form} />
    </Modal>
  );
}
