import React, { useState, useEffect, useRef } from 'react'; // Import useState and React
import { Modal, Card, Table, Button } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";
import wornpaper from "../../../images/wornpaper.jpg"; 

export default function Help({props, form, showHelpModal, handleCloseHelpModal}) {
  const params = useParams();
  const navigate = useNavigate();
  const [showDeleteCharacter, setShowDeleteCharacter] = useState(false);
  const handleCloseDeleteCharacter = () => setShowDeleteCharacter(false);
  const handleShowDeleteCharacter = () => setShowDeleteCharacter(true);
 // This method will delete a record
 async function deleteRecord() {
  await fetch(`/delete-character/${params.id}`, {
    method: "DELETE",
    credentials: 'include'
  });
  navigate(`/zombies-character-select/${form.campaign}`);
}
  //-------------------------------------------Help Module--------------------------------------------------------------------
// Color Picker
document.documentElement.style.setProperty('--dice-face-color', form.diceColor);
const colorPickerRef = useRef(null);
const [newColor, setNewColor] = useState(form.diceColor);

useEffect(() => {
  const colorPicker = colorPickerRef.current;

  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      const selectedColor = e.target.value;
      setNewColor(selectedColor); // Update the state with the new color
      document.documentElement.style.setProperty('--dice-face-color', selectedColor);
    });
  }
}, []); // Empty dependency array ensures this runs after component mounts

const handleColorChange = (e) => {
  const selectedColor = e.target.value;
  setNewColor(selectedColor); // Update the state with the new color
  document.documentElement.style.setProperty('--dice-face-color', selectedColor);
};

const opacity = 0.85;
// Calculate RGBA color with opacity
const rgbaColor = `rgba(${parseInt(form.diceColor.slice(1, 3), 16)}, ${parseInt(form.diceColor.slice(3, 5), 16)}, ${parseInt(form.diceColor.slice(5, 7), 16)}, ${opacity})`;

// Apply the calculated RGBA color to the element
document.documentElement.style.setProperty('--dice-face-color', rgbaColor);

 // Sends dice color update to database
 async function diceColorUpdate(){
    await fetch(`/update-dice-color/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     credentials: 'include',
     body: JSON.stringify({diceColor: newColor}),
   })
   .catch(error => {
    //  window.alert(error);
     return;
   });
   navigate(0);
 } 
return(
    <div>
        <Modal  {...props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        className="text-center" show={showHelpModal} onHide={handleCloseHelpModal}>
          <center>
          <Card className="" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>
          <Card.Body>
          Actions Left (from left to right)
          <br></br>
          Move, Action, Bonus Action, Reset
          <br></br>
          Reset will allow you to refresh your Actions Left
          <br></br>
          <br></br>
          If you are on a phone press a button to use that action or hold down on it to see what it does!
          <br></br>
          <br></br>
          If you are on pc click the button or hover over it to see what it does!
          <div className="table-container">
          <Table striped bordered hover size="sm" className="custom-table">
            <thead>
              <tr>
                <td className="center-td">
                  <strong>Change Dice Color:</strong>
                </td>
                <td className="center-td">
                  <input
                    type="color"
                    id="colorPicker"
                    ref={colorPickerRef}
                    value={newColor}
                    onChange={handleColorChange}
                  />
                </td>
                <td className="center-td">
                  <Button onClick={diceColorUpdate} className="bg-warning fa-solid fa-floppy-disk"></Button>
                </td>
              </tr>
            </thead>
          </Table>  
          </div>      
          </Card.Body>
          <Modal.Footer className="justify-content-between">
          <Button size="lg" className="fa-solid fa-trash delete-button" variant="danger" onClick={() => { handleShowDeleteCharacter(); }}>
          </Button>
          <Button variant="secondary" onClick={handleCloseHelpModal}>
            Close
          </Button>
          </Modal.Footer>
          </Card>
          </center>
          </Modal>
          <Modal  {...props}
                  size="lg"
                  aria-labelledby="contained-modal-title-vcenter"
                  centered
                  className="text-center" show={showDeleteCharacter} onHide={handleCloseDeleteCharacter}>
        <center>
        <Card className="" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>       
          <Card.Title>Are you sure you want to delete your character?</Card.Title>
          <Modal.Footer className="justify-content-between">
          <Button variant="danger" onClick={() => { deleteRecord(); }}>
            Im Sure
          </Button>
          <Button variant="secondary" onClick={handleCloseDeleteCharacter}>
            Close
          </Button>
          </Modal.Footer>
          </Card>
          </center>
        </Modal>
    </div>
)
}