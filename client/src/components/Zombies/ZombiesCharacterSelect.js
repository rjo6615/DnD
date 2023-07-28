import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
 
const Record = (props) => (
 <tr>
   <td>{props.record.characterName}</td>
   <td>{props.record.level}</td>
   <td>{props.record.occupation.Occupation}</td>
   <td>
     {/* <Link className="btn btn-link" to={`/edit/${props.record._id}`}>Edit</Link> | */}
     <Button className="fa-solid fa-trash" variant="danger" onClick={() => {props.deleteRecord(props.record._id);}}></Button>
     <Link className="btn btn-link" to={`/zombies-character-sheet/${props.record._id}`}><Button className="fa-regular fa-eye" variant="primary"></Button></Link>     
   </td>
 </tr>
);
 
export default function RecordList() {
 const [records, setRecords] = useState([]);
 
 // This method fetches the records from the database.
 useEffect(() => {
   async function getRecords() {
     const response = await fetch(`/character/select`);
 
     if (!response.ok) {
       const message = `An error occurred: ${response.statusText}`;
       window.alert(message);
       return;
     }
 
     const records = await response.json();
     setRecords(records);
   }
 
   getRecords();
 
   return;
 }, [records.length]);
 
 // This method will delete a record
 async function deleteRecord(id) {
   await fetch(`/delete-character/${id}`, {
     method: "DELETE"
   });
 
   const newRecords = records.filter((el) => el._id !== id);
   setRecords(newRecords);
 }
 
 // This method will map out the records on the table
 function recordList() {
   return records.map((Characters) => {
     return (
       <Record
         record={Characters}
         deleteRecord={() => deleteRecord(Characters._id)}
         key={Characters._id}
       />
     );
   });
 }
 
 // This following section will display the table with the records of individuals.
 return (
  <center style={{ backgroundImage: 'url(./images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat"}}>
   <div className="px-3 w-100">
     <h3 className="text-light">Campaign Name</h3>
     <Table striped bordered condensed hover className="bg-light">
       <thead>
         <tr>
           <th>Character</th>
           <th>Level</th>
           <th>Occupation</th>
           <th>Delete/View</th>
         </tr>
       </thead>
       <tbody>{recordList()}</tbody>
     </Table>
     <br></br>
   </div>
   </center>
 );
}