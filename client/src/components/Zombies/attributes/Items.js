import React, { useState, useEffect } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";
import { SKILLS } from "../skillSchema";

export default function Items({form, showItems, handleCloseItems}) {
  const params = useParams();
  const navigate = useNavigate();
  //--------------------------------------------Items-----------------------------------------------------------------------------------------------------------------------------------------------
  const currentCampaign = form.campaign.toString();
  const emptyItem = [Array(SKILLS.length + 8).fill("")];
  const [item, setItem] = useState({ 
    item: [], 
  });
  const [addItem, setAddItem] = useState({ 
    item: "",
  });
  const [modalItemData, setModalItemData] = useState({
    item: "",
  })
  const [showNotes, setShowNotes] = useState(false);
  const handleCloseNotes = () => setShowNotes(false);
  const handleShowNotes = () => setShowNotes(true);
  const [chosenItem, setChosenItem] = useState('');
  const handleChosenItemChange = (e) => {
      setChosenItem(e.target.value);
  }; 
  
  function updateItem(value) {
    return setAddItem((prev) => {
      return { ...prev, ...value };
    });
  }
  
  // Fetch Items
  useEffect(() => {
    async function fetchItems() {
      const response = await apiFetch(`/equipment/items/${currentCampaign}`);
  
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
      setItem({item: record});
    }
    fetchItems();   
    return;
    
  }, [navigate, currentCampaign]);
   // Sends item data to database for update
   const splitItemArr = (array, size) => {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
      let chunk = array.slice(i, i + size);
      result.push(chunk);
    }
    return result;
  };
   let newItem;
   if (JSON.stringify(form.item) === JSON.stringify(emptyItem)) {
    let newItemArr = addItem.item.split(',');
    const itemArrSize = SKILLS.length + 8;
    const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
    newItem = itemArrChunks;
   } else {
    let newItemArr = (form.item + "," + addItem.item).split(',');
    const itemArrSize = SKILLS.length + 8;
    const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
    newItem = itemArrChunks;
   }
   async function addItemToDb(e){
    e.preventDefault();
    await apiFetch(`/equipment/update-item/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      item: newItem,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
   navigate(0);
  }
   // This method will delete an item
   function deleteItems(el) {
    const index = form.item.indexOf(el);
    form.item.splice(index, 1);
    updateItem(form.item);
    addDeleteItemToDb();
   }
   let showDeleteItemBtn = "";
   if (JSON.stringify(form.item) === JSON.stringify(emptyItem)){
    showDeleteItemBtn = "none";
   }
  async function addDeleteItemToDb(){
    let newItemForm = form.item;
    if (JSON.stringify(form.item) === JSON.stringify([])){
      newItemForm = [Array(SKILLS.length + 8).fill("")];
      await apiFetch(`/equipment/update-item/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         item: newItemForm,
        }),
      })
      .catch(error => {
        window.alert(error);
        return;
      });
      window.alert("Item Deleted")
      navigate(0);
    } else {
    await apiFetch(`/equipment/update-item/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      item: newItemForm,
     }),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
   window.alert("Item Deleted")
   navigate(0);
  }
  }
return(
<div>
         {/* -----------------------------------------Items Render------------------------------------------------------------------------------------------------------------------------------- */}
          <Modal className="modern-modal" show={showItems} onHide={handleCloseItems} size="lg" centered>
        <div className="text-center">
         <Card className="modern-card">
         <Card.Header className="modal-header">
           <Card.Title className="modal-title">Items</Card.Title>
         </Card.Header>
         <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
         <Table striped bordered hover size="sm" className="modern-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Notes</th>
              <th>Stats</th>
              <th>Skills</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {form.item.map((el) => (  
            <tr key={el[0]}>           
              <td>{el[0]}</td>
              <td style={{ display: showDeleteItemBtn}}>
                <Button
                  size="sm"
                  className="action-btn fa-regular fa-eye"
                  onClick={() => {
                    handleShowNotes();
                    setModalItemData(el);
                  }}
                ></Button>
              </td>
              <td style={{ display: showDeleteItemBtn}}>
              {(() => {
               const attributeValues = [];

               if (el[2] !== "0") attributeValues.push("STR:" + el[2] + " ");
               if (el[3] !== "0") attributeValues.push("DEX:" + el[3] + " ");
               if (el[4] !== "0") attributeValues.push("CON:" + el[4] + " ");
               if (el[5] !== "0") attributeValues.push("INT:" + el[5] + " ");
               if (el[6] !== "0") attributeValues.push("WIS:" + el[6] + " ");
               if (el[7] !== "0") attributeValues.push("CHA:" + el[7] + " ");

               return(    <div>
                {attributeValues.map((attribute, index) => (
                  <div key={index}>{attribute}</div>
                ))}
              </div>);
              })()}
              
              </td>
              <td style={{ display: showDeleteItemBtn}}>
              {(() => {
               const skillValues = [];
               SKILLS.forEach(({label, itemIndex}) => {
                 if (el[itemIndex] !== "0") {
                   skillValues.push(`${label}: ${el[itemIndex]} `);
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
                  style={{ display: showDeleteItemBtn }}
                  className="btn-danger action-btn fa-solid fa-trash"
                  onClick={() => {
                    deleteItems(el);
                  }}
                ></Button>
              </td>
            </tr>
            ))}   
          </tbody>
        </Table>        
    <Row>
        <Col>
          <Form onSubmit={addItemToDb}>
          <Form.Group className="mb-3 mx-5">
        <Form.Label className="text-dark">Select Item</Form.Label>
        <Form.Select 
        onChange={(e) => {updateItem({ item: e.target.value }); handleChosenItemChange(e);}}
        defaultValue=""
         type="text">
          <option value="" disabled>Select your item</option>
          {item.item.map((el) => (
          <option key={el.itemName} value={[el.itemName, el.notes, el.str, el.dex, el.con, el.int, el.wis, el.cha, ...SKILLS.map(({key}) => el[key])]}>{el.itemName}</option>
          ))}
          </Form.Select>
      </Form.Group>
        <Button disabled={!chosenItem} className="action-btn" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
         </Card.Body>
         <Card.Footer className="modal-footer">
           <Button className="action-btn close-btn" onClick={handleCloseItems}>Close</Button>
         </Card.Footer>
        </Card>
        <Modal className="modern-modal" show={showNotes} onHide={handleCloseNotes} size="lg" centered>
          <Card className="modern-card text-center">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">{modalItemData[0]}</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>{modalItemData[1]}</Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseNotes}>Close</Button>
            </Card.Footer>
          </Card>
        </Modal>
</div>
</Modal>
</div>
)
}