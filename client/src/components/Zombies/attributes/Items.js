import React, { useState, useEffect } from 'react'; // Import useState and React
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";
import wornpaper from "../../../images/wornpaper.jpg"; 

export default function Items({form, showItems, handleCloseItems}) {
  const params = useParams();
  const navigate = useNavigate();
  //--------------------------------------------Items-----------------------------------------------------------------------------------------------------------------------------------------------
  const currentCampaign = form.campaign.toString();
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
      const response = await fetch(`/items/${currentCampaign}`);
  
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
   if (JSON.stringify(form.item) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])) {
    let newItemArr = addItem.item.split(',');
    const itemArrSize = 38;
    const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
    newItem = itemArrChunks;
   } else {
    let newItemArr = (form.item + "," + addItem.item).split(',');
    const itemArrSize = 38;
    const itemArrChunks = splitItemArr(newItemArr, itemArrSize);
    newItem = itemArrChunks;
   }
   async function addItemToDb(e){
    e.preventDefault();
    await fetch(`/update-item/${params.id}`, {
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
   if (JSON.stringify(form.item) === JSON.stringify([["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]])){
    showDeleteItemBtn = "none";
   }
  async function addDeleteItemToDb(){
    let newItemForm = form.item;
    if (JSON.stringify(form.item) === JSON.stringify([])){
      newItemForm = [["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""]];
      await fetch(`/update-item/${params.id}`, {
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
    await fetch(`/update-item/${params.id}`, {
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
         <Modal show={showItems} onHide={handleCloseItems}
       size="sm"
      centered
       >   
       <div className="text-center">
        <Card className="zombiesItems" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover"}}>     
        <Card.Title>Items</Card.Title>
        <Table striped bordered hover size="sm">
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
              <td style={{ display: showDeleteItemBtn}}><Button size="sm" className="fa-regular fa-eye" variant="primary" onClick={() => {handleShowNotes(); setModalItemData(el);}}></Button></td>
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

                if (el[8] !== "0") skillValues.push("Appraise: " + el[8] + " ");
                if (el[9] !== "0") skillValues.push("Balance: " + el[9] + " ");
                if (el[10] !== "0") skillValues.push("Bluff: " + el[10] + " ");
                if (el[11] !== "0") skillValues.push("Climb: " + el[11] + " ");
                if (el[12] !== "0") skillValues.push("Concentration: " + el[12] + " ");
                if (el[13] !== "0") skillValues.push("Decipher Script: " + el[13] + " ");
                if (el[14] !== "0") skillValues.push("Diplomacy: " + el[14] + " ");
                if (el[15] !== "0") skillValues.push("Disable Device: " + el[15] + " ");
                if (el[16] !== "0") skillValues.push("Disguise: " + el[16] + " ");
                if (el[17] !== "0") skillValues.push("Escape Artist: " + el[17] + " ");
                if (el[18] !== "0") skillValues.push("Forgery: " + el[18] + " ");
                if (el[19] !== "0") skillValues.push("Gather Info: " + el[19] + " ");
                if (el[20] !== "0") skillValues.push("Handle Animal: " + el[20] + " ");
                if (el[21] !== "0") skillValues.push("Heal: " + el[21] + " ");
                if (el[22] !== "0") skillValues.push("Hide: " + el[22] + " ");
                if (el[23] !== "0") skillValues.push("Intimidate: " + el[23] + " ");
                if (el[24] !== "0") skillValues.push("Jump: " + el[24] + " ");
                if (el[25] !== "0") skillValues.push("Listen: " + el[25] + " ");
                if (el[26] !== "0") skillValues.push("Move Silently: " + el[26] + " ");
                if (el[27] !== "0") skillValues.push("Open Lock: " + el[27] + " ");
                if (el[28] !== "0") skillValues.push("Ride: " + el[28] + " ");
                if (el[29] !== "0") skillValues.push("Search: " + el[29] + " ");
                if (el[30] !== "0") skillValues.push("Sense Motive: " + el[30] + " ");
                if (el[31] !== "0") skillValues.push("Sleight of Hand: " + el[31] + " ");
                if (el[32] !== "0") skillValues.push("Spot: " + el[32] + " ");
                if (el[33] !== "0") skillValues.push("Survival: " + el[33] + " ");
                if (el[34] !== "0") skillValues.push("Swim: " + el[34] + " ");
                if (el[35] !== "0") skillValues.push("Tumble: " + el[35] + " ");
                if (el[36] !== "0") skillValues.push("Use Tech: " + el[36] + " ");
                if (el[37] !== "0") skillValues.push("Use Rope: " + el[37] + " ");

               return(   <div>
                {skillValues.map((skill, index) => (
                  <div key={index}>{skill}</div>
                ))}
              </div>);
              })()}
                
              </td>
              <td><Button size="sm" style={{ display: showDeleteItemBtn}} className="fa-solid fa-trash" variant="danger" onClick={() => {deleteItems(el);}}></Button></td>
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
          <option key={el.itemName} value={[el.itemName, el.notes, el.str, el.dex, el.con, el.int, el.wis, el.cha,
          el.appraise, el.balance, el.bluff, el.climb, el.concentration, el.decipherScript, el.diplomacy, el.disableDevice, 
          el.disguise, el.escapeArtist, el.forgery, el.gatherInfo, el.handleAnimal, el.heal, el.hide, el.intimidate, el.jump, 
          el.listen, el.moveSilently, el.openLock, el.ride, el.search, el.senseMotive, el.sleightOfHand, el.spot, el.survival, 
          el.swim, el.tumble, el.useTech, el.useRope]}>{el.itemName}</option>
          ))}
        </Form.Select>
      </Form.Group>
        <Button disabled={!chosenItem} className="rounded-pill" variant="outline-dark" type="submit">Add</Button>
          </Form>
        </Col>
      </Row>
      </Card> 
      <Modal show={showNotes} onHide={handleCloseNotes}>
        <Modal.Header closeButton>
          <Modal.Title>{modalItemData[0]}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalItemData[1]}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseNotes}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
</div>
</Modal>
</div>
)
}