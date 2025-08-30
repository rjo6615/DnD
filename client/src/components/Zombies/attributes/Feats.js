import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";
 
 export default function Feats({form, showFeats, handleCloseFeats, totalLevel}) {
  const params = useParams();
  const navigate = useNavigate();
  //----------------------------------------------Feats Section------------------------------------------------------------------------------------------------------------------------------------
const [feat, setFeat] = useState({ 
    feat: [], 
  });
  const [addFeat, setAddFeat] = useState({ 
    feat: "",
  });
  const [modalFeatData, setModalFeatData] = useState({
    feat: "",
  })
  const [showFeatNotes, setShowFeatNotes] = useState(false);
  const handleCloseFeatNotes = () => setShowFeatNotes(false);
  const handleShowFeatNotes = () => setShowFeatNotes(true);
  const [chosenFeat, setChosenFeat] = useState('');
  const handleChosenFeatChange = (e) => {
      setChosenFeat(e.target.value);
  };
  
  function updateFeat(value) {
    return setAddFeat((prev) => {
      return { ...prev, ...value };
    });
  }
  // ---------------------------------------Feats left-----------------------------------------------------
    let featLength;
  if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) { 
    featLength = 0; 
  } else {
     featLength = form.feat.length 
    }
  let featPointsLeft = Math.floor((totalLevel / 3) - (featLength)) + 1;
  
    let showFeatBtn = "";
    if (featPointsLeft === 0) {
      showFeatBtn = "none";
    }
  
  // ----------------------------------------Fetch Feats-----------------------------------
  useEffect(() => {
    async function fetchFeats() {
      const response = await apiFetch(`/feats`);
  
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }
  
      const record = await response.json();
      if (!record) {
        window.alert(`Record not found`);
        navigate("/");
        return;
      }
      setFeat({feat: record});
    }
    fetchFeats();   
    return;
    
  }, [navigate]);
   // Sends feat data to database for update
   const splitFeatArr = (array, size) => {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
      let chunk = array.slice(i, i + size);
      result.push(chunk);
    }
    return result;
  };
   let newFeat;
   if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) {
    let newFeatArr = addFeat.feat.split(',');
    const featArrSize = 32;
    const featArrChunks = splitFeatArr(newFeatArr, featArrSize);
    newFeat = featArrChunks;
   } else {
    let newFeatArr = (form.feat + "," + addFeat.feat).split(',');
    const featArrSize = 32;
    const featArrChunks = splitFeatArr(newFeatArr, featArrSize);
    newFeat = featArrChunks;
   }
   async function addFeatToDb(e){
    e.preventDefault();
    await apiFetch(`/feats/update/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      feat: newFeat,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
   navigate(0);
  }
   // This method will delete an feat
   function deleteFeats(el) {
    const index = form.feat.indexOf(el);
    form.feat.splice(index, 1);
    updateFeat(form.feat);
    addDeleteFeatToDb();
   }
   let showDeleteFeatBtn = "";
   if (JSON.stringify(form.feat) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])){
    showDeleteFeatBtn = "none";
   }
  async function addDeleteFeatToDb(){
    let newFeatForm = form.feat;
    if (JSON.stringify(form.feat) === JSON.stringify([])){
      newFeatForm = [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]];
      await apiFetch(`/feats/update/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         feat: newFeatForm,
        }),
      })
      .catch(error => {
        window.alert(error);
        return;
      });
      window.alert("Feat Deleted")
      navigate(0);
    } else {
    await apiFetch(`/feats/update/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      feat: newFeatForm,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
   window.alert("Feat Deleted")
   navigate(0);
  }
  }


return (
    <div>
 {/* -----------------------------------------Feats Render------------------------------------------------------------------------------------------------------------------------------------ */}
  <Modal className="modern-modal" show={showFeats} onHide={handleCloseFeats} size="lg" centered>
        <div className="text-center">
         <Card className="modern-card">
           <Card.Header className="modal-header">
             <Card.Title className="modal-title">Feats</Card.Title>
           </Card.Header>
           <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
             <div className="points-container" style={{ display: showFeatBtn }}>
               <span className="points-label">Points Left:</span>
               <span className="points-value" id="featPointLeft">{featPointsLeft}</span>
             </div>
         <Table striped bordered hover size="sm" className="modern-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Notes</th>
              <th>Skills</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {form.feat.map((el) => (  
            <tr key={el[0]}>           
              <td>{el[0]}</td>
                <td style={{ display: showDeleteFeatBtn}}>
                  <Button
                    size="sm"
                    className="action-btn fa-regular fa-eye"
                    onClick={() => {
                      handleShowFeatNotes();
                      setModalFeatData(el);
                    }}
                  ></Button>
                </td>
              <td style={{ display: showDeleteFeatBtn}}>
              {(() => {
               const skillValues = [];

                if (el[2] !== "0") skillValues.push("Appraise: " + el[2] + " ");
                if (el[3] !== "0") skillValues.push("Balance: " + el[3] + " ");
                if (el[4] !== "0") skillValues.push("Bluff: " + el[4] + " ");
                if (el[5] !== "0") skillValues.push("Climb: " + el[5] + " ");
                if (el[6] !== "0") skillValues.push("Concentration: " + el[6] + " ");
                if (el[7] !== "0") skillValues.push("Decipher Script: " + el[7] + " ");
                if (el[8] !== "0") skillValues.push("Diplomacy: " + el[8] + " ");
                if (el[9] !== "0") skillValues.push("Disable Device: " + el[9] + " ");
                if (el[10] !== "0") skillValues.push("Disguise: " + el[10] + " ");
                if (el[11] !== "0") skillValues.push("Escape Artist: " + el[11] + " ");
                if (el[12] !== "0") skillValues.push("Forgery: " + el[12] + " ");
                if (el[13] !== "0") skillValues.push("Gather Info: " + el[13] + " ");
                if (el[14] !== "0") skillValues.push("Handle Animal: " + el[14] + " ");
                if (el[15] !== "0") skillValues.push("Heal: " + el[15] + " ");
                if (el[16] !== "0") skillValues.push("Hide: " + el[16] + " ");
                if (el[17] !== "0") skillValues.push("Intimidate: " + el[17] + " ");
                if (el[18] !== "0") skillValues.push("Jump: " + el[18] + " ");
                if (el[19] !== "0") skillValues.push("Listen: " + el[19] + " ");
                if (el[20] !== "0") skillValues.push("Move Silently: " + el[20] + " ");
                if (el[21] !== "0") skillValues.push("Open Lock: " + el[21] + " ");
                if (el[22] !== "0") skillValues.push("Ride: " + el[22] + " ");
                if (el[23] !== "0") skillValues.push("Search: " + el[23] + " ");
                if (el[24] !== "0") skillValues.push("Sense Motive: " + el[24] + " ");
                if (el[25] !== "0") skillValues.push("Sleight of Hand: " + el[25] + " ");
                if (el[26] !== "0") skillValues.push("Spot: " + el[26] + " ");
                if (el[27] !== "0") skillValues.push("Survival: " + el[27] + " ");
                if (el[28] !== "0") skillValues.push("Swim: " + el[28] + " ");
                if (el[29] !== "0") skillValues.push("Tumble: " + el[29] + " ");
                if (el[30] !== "0") skillValues.push("Use Tech: " + el[30] + " ");
                if (el[31] !== "0") skillValues.push("Use Rope: " + el[31] + " ");

               return(    <div>
                {skillValues.map((skill, index) => (
                  <div key={index}>{skill}</div>
                ))}
              </div>);
              })()}
                
              </td>
                <td>
                  <Button
                    size="sm"
                    style={{ display: showDeleteFeatBtn }}
                    className="btn-danger action-btn fa-solid fa-trash"
                    onClick={() => {
                      deleteFeats(el);
                    }}
                  ></Button>
                </td>
            </tr>
            ))}   
          </tbody>
        </Table>       
    <Row>
        <Col style={{display: showFeatBtn}}>
          <Form onSubmit={addFeatToDb}>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Feat</Form.Label>
        <Form.Select 
        onChange={(e) => {updateFeat({ feat: e.target.value }); handleChosenFeatChange(e);}}
        defaultValue=""
         type="text">
          <option value="" disabled>Select your feat</option>
          {feat.feat.map((el) => (  
          <option key={el.featName} value={[el.featName, el.notes, el.appraise, el.balance, el.bluff, el.climb, 
          el.concentration, el.decipherScript, el.diplomacy, el.disableDevice, el.disguise, el.escapeArtist, 
          el.forgery, el.gatherInfo, el.handleAnimal, el.heal, el.hide, el.intimidate, el.jump, el.listen, 
          el.moveSilently, el.openLock, el.ride, el.search, el.senseMotive, el.sleightOfHand, el.spot, 
          el.survival, el.swim, el.tumble, el.useTech, el.useRope]}>{el.featName}</option>
          ))}
          </Form.Select>
        </Form.Group>
          <Button disabled={!chosenFeat} className="action-btn" type="submit">Add</Button>
            </Form>
          </Col>
        </Row>
           </Card.Body>
           <Card.Footer className="modal-footer">
             <Button className="action-btn close-btn" onClick={handleCloseFeats}>Close</Button>
           </Card.Footer>
          </Card>
        <Modal className="modern-modal" show={showFeatNotes} onHide={handleCloseFeatNotes} size="lg" centered>
          <Card className="modern-card text-center">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">{modalFeatData[0]}</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>{modalFeatData[1]}</Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseFeatNotes}>Close</Button>
            </Card.Footer>
          </Card>
        </Modal>
</div>
</Modal>
</div> 
)
}