import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";
import { SKILLS } from "../skillSchema";
 
 export default function Feats({form, showFeats, handleCloseFeats, totalLevel}) {
  const params = useParams();
  const navigate = useNavigate();
  const emptyFeat = [Array(SKILLS.length + 2).fill("")];
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
  const activeFeats = form.feat.filter((feat) => feat[0] !== "").length;
  const featPointsLeft = Math.floor(totalLevel / 3) + 1 - activeFeats;

  const showFeatBtn = featPointsLeft > 0 ? "" : "none";
  
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
   if (JSON.stringify(form.feat) === JSON.stringify(emptyFeat)) {
    let newFeatArr = addFeat.feat.split(',');
    const featArrSize = SKILLS.length + 2;
    const featArrChunks = splitFeatArr(newFeatArr, featArrSize);
    newFeat = featArrChunks;
   } else {
    let newFeatArr = (form.feat + "," + addFeat.feat).split(',');
    const featArrSize = SKILLS.length + 2;
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
   if (JSON.stringify(form.feat) === JSON.stringify(emptyFeat)){
    showDeleteFeatBtn = "none";
   }
  async function addDeleteFeatToDb(){
    let newFeatForm = form.feat;
    if (JSON.stringify(form.feat) === JSON.stringify([])){
      newFeatForm = [Array(SKILLS.length + 2).fill("")];
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
               SKILLS.forEach(({label, featIndex}) => {
                 if (el[featIndex] !== "0") {
                   skillValues.push(`${label}: ${el[featIndex]} `);
                 }
               });
               return(
                 <div>
                   {skillValues.map((skill, index) => (
                     <div key={index}>{skill}</div>
                   ))}
                 </div>
               );
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
          <option key={el.featName} value={[el.featName, el.notes, ...SKILLS.map(({key}) => el[key])]}>{el.featName}</option>
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