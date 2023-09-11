import React, { useState } from 'react';
import { Button, Modal, Card, Table } from "react-bootstrap";

const PlayerTurnActions = ({ props, actions, bonusActions, onSelectAction, onSelectBonusAction }) => {
  // State to track the selected action
  const [selectedAction, setSelectedAction] = useState(null);

  // State to track the selected bonus action
  const [selectedBonusAction, setSelectedBonusAction] = useState(null);

  // State to track the timer ID
  const [timerId, setTimerId] = useState(null);

  // Function to open the modal and set the selected action with a timer delay
  const handleActionMouseDown = (action) => {
    const id = setTimeout(() => {
      setSelectedAction(action);
    }, 250); // quarter-second delay
    setTimerId(id);
  };

  // Function to open the modal and set the selected bonus action with a timer delay
  const handleBonusActionMouseDown = (bonusAction) => {
    const id = setTimeout(() => {
      setSelectedBonusAction(bonusAction);
    }, 250); // quarter-second delay
    setTimerId(id);
  };

    // // Function to open the modal and set the selected action with a timer delay
    // const handleActionMouseOver = (action) => {
    //   const id = setTimeout(() => {
    //     setSelectedAction(action);
    //   }, 700); // quarter-second delay
    //   setTimerId(id);
    // };
  
    // // Function to open the modal and set the selected bonus action with a timer delay
    // const handleBonusActionMouseOver = (bonusAction) => {
    //   const id = setTimeout(() => {
    //     setSelectedBonusAction(bonusAction);
    //   }, 700); // quarter-second delay
    //   setTimerId(id);
    // };

  // Function to clear the timer
  const clearTimer = () => {
    if (timerId) {
      clearTimeout(timerId);
      setTimerId(null);
    }
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setSelectedAction(null);
    setSelectedBonusAction(null);
  };

  // Function to select the action
  const handleActionClick = (action) => {
    clearTimer(); // Clear the timer if an action is selected
    onSelectAction(action);
  };

  // Function to select the bonus action
  const handleBonusActionClick = (bonusAction) => {
    clearTimer(); // Clear the timer if a bonus action is selected
    onSelectBonusAction(bonusAction);
  };

  return (
    <div>
      <Card style={{backgroundColor: "rgba(0, 0, 0, 0)", border: "none"}}>
      <Table>   
        <thead>
          <tr>
          <th></th>
          <th></th>
          </tr>
          <tr>
          <td>{actions.map((action) => (
          <Button
            className="bg-secondary mx-1 mt-1"
            key={action.id}
            // onMouseOver={() => handleActionMouseOver(action)}
            // onMouseOut={() => clearTimer()} // Cancels timer
            onTouchStart={() => handleActionMouseDown(action)} // Open the modal with a 2-second delay
            onTouchEnd={() => clearTimer()} // Cancels timer
            onClick={() => handleActionClick(action)} // Select the action
            style={{
              borderColor: "gray",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundImage: action.background,
              height: "40px",
              width: "40px"
            }}
          >
            {/* {action.name} */}
          </Button>
        ))}
        </td>
          <td style={{paddingLeft: "40px"}}>{bonusActions.map((bonusAction) => (
          <Button
            className="bg-secondary mx-1 mt-1"
            key={bonusAction.id}
            // onMouseOver={() => handleBonusActionMouseOver(bonusAction)}
            // onMouseOut={() => clearTimer()} // Cancels timer
            onTouchStart={() => handleBonusActionMouseDown(bonusAction)} // Open the modal with a 2-second delay
            onTouchEnd={() => clearTimer()} // Cancels timer
            onClick={() => handleBonusActionClick(bonusAction)} // Select the bonus action
            style={{
              borderColor: "gray",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundImage: bonusAction.background,
              height: "40px",
              width: "40px"
            }}
          >
            {/* {action.name} */}
          </Button>
        ))}</td>
          </tr>
        </thead> 
        </Table>
        </Card> 
      {/* Modal to display name and description */}
      <Modal {...props}
      centered 
      show={selectedAction !== null || selectedBonusAction !== null} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">Action Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAction && (
            <div>
              <h3>{selectedAction.name}</h3>
              <p>{selectedAction.description}</p>
            </div>
          )}
          {selectedBonusAction && (
            <div>
              <h3>{selectedBonusAction.name}</h3>
              <p>{selectedBonusAction.description}</p>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PlayerTurnActions;