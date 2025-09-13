import React, { useState, useEffect } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from "react-router-dom";
import { SKILLS } from "../skillSchema";

export default function Items({form, showItems, handleCloseItems}) {
  const params = useParams();
  const navigate = useNavigate();
  //--------------------------------------------Items-----------------------------------------------------------------------------------------------------------------------------------------------
  const currentCampaign = form.campaign.toString();
  const [item, setItem] = useState({ item: [] });
  const [addItem, setAddItem] = useState({ item: null });
  const [modalItemData, setModalItemData] = useState({});
  const [showNotes, setShowNotes] = useState(false);
  const handleCloseNotes = () => setShowNotes(false);
  const handleShowNotes = () => setShowNotes(true);
  const [chosenItem, setChosenItem] = useState('');
  const handleChosenItemChange = (e) => {
      setChosenItem(e.target.value);
  };
  const [notification, setNotification] = useState({ message: '', variant: '' });
  const handleCloseNotification = () => setNotification({ message: '', variant: '' });
  
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
        setNotification({ message, variant: 'danger' });
        return;
      }
  
      const record = await response.json();
      if (!record) {
        setNotification({ message: 'Record not found', variant: 'danger' });
        navigate("/");
        return;
      }
      setItem({item: record});
    }
    fetchItems();   
    return;
    
  }, [navigate, currentCampaign]);
   // Sends item data to database for update
  async function addItemToDb(e){
    e.preventDefault();
    const newItems = [...form.item, addItem.item];
    await apiFetch(`/equipment/update-item/${params.id}`, {
     method: "PUT",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
      item: newItems,
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
    const newItems = form.item.filter((item) => item !== el);
    addDeleteItemToDb(newItems);
  }

  let showDeleteItemBtn = "";
  if (form.item.length === 0){
    showDeleteItemBtn = "none";
  }

  async function addDeleteItemToDb(newItemForm){
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
      setNotification({ message: error.message || error, variant: 'danger' });
      return;
    });
    setNotification({ message: 'Item Deleted', variant: 'success' });
    setTimeout(() => navigate(0), 2000);
  }
return(
<div>
         {/* -----------------------------------------Items Render------------------------------------------------------------------------------------------------------------------------------- */}
          <Modal className="dnd-modal modern-modal" show={showItems} onHide={handleCloseItems} size="lg" centered>
        <div className="text-center">
         <Card className="modern-card">
         <Card.Header className="modal-header">
           <Card.Title className="modal-title">Items</Card.Title>
         </Card.Header>
         <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
         {notification.message && (
           <Alert variant={notification.variant} onClose={handleCloseNotification} dismissible>
             {notification.message}
           </Alert>
         )}
         <Table striped bordered hover size="sm" className="modern-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Weight</th>
              <th>Cost</th>
              <th>Notes</th>
              <th>Stats</th>
              <th>Skills</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
          {form.item.map((el) => (
            <tr key={el.name}>
              <td>{el.name}</td>
              <td>{el.category}</td>
              <td>{el.weight}</td>
              <td>{el.cost}</td>
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
              {Object.entries(el.statBonuses || {}).filter(([_, val]) => val && val !== "0").map(([stat, val]) => (
                <div key={stat}>{stat}:{val} </div>
              ))}
              </td>
              <td style={{ display: showDeleteItemBtn}}>
              {Object.entries(el.skillBonuses || {}).map(([skill, val]) => (
                <div key={skill}>{skill}: {val}</div>
              ))}
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
        <Form.Label className="text-light">Select Item</Form.Label>
        <Form.Select
        onChange={(e) => {
          const selectedName = e.target.value;
          handleChosenItemChange(e);
          const selected = item.item.find((i) => i.itemName === selectedName);
          if (selected) {
            const formatted = {
              name: selected.itemName,
              category: selected.category,
              weight: selected.weight,
              cost: selected.cost,
              notes: selected.notes,
              statBonuses: {
                STR: selected.str,
                DEX: selected.dex,
                CON: selected.con,
                INT: selected.int,
                WIS: selected.wis,
                CHA: selected.cha,
              },
              skillBonuses: SKILLS.reduce((acc, { key, label }) => {
                if (selected[key] && selected[key] !== "0") {
                  acc[label] = selected[key];
                }
                return acc;
              }, {}),
            };
            updateItem({ item: formatted });
          }
        }}
        defaultValue=""
         type="text">
          <option value="" disabled>Select your item</option>
          {item.item.map((el) => (
          <option key={el.itemName} value={el.itemName}>{el.itemName}</option>
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
        <Modal className="dnd-modal modern-modal" show={showNotes} onHide={handleCloseNotes} size="lg" centered>
          <Card className="modern-card text-center">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">{modalItemData.name}</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>{modalItemData.notes}</Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseNotes}>Close</Button>
            </Card.Footer>
          </Card>
        </Modal>
</div>
</Modal>
</div>
  );
}
