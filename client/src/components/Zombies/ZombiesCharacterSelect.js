import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import { useParams } from "react-router";
 
const Record = (props) => (
 <tr>
   <td>{props.record.characterName}</td>
   <td>{props.record.level}</td>
   <td>{props.record.occupation.Occupation}</td>
   <td><Button size="sm" style={{ width: 'auto' }} className="fa-solid fa-trash" variant="danger" onClick={() => {props.deleteRecord(props.record._id);}}></Button>
     <Link className="btn btn-link" to={`/zombies-character-sheet/${props.record._id}`}><Button size="sm" style={{ width: 'auto' }} className="fa-regular fa-eye" variant="primary"></Button></Link>     
   </td>
 </tr>
);
 
export default function RecordList() {
 const params = useParams();
 const [records, setRecords] = useState([]);
 
 // This method fetches the records from the database.
 useEffect(() => {
   async function getRecords() {
     const response = await fetch(`/campaign/${params.campaign}`);
 
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
 }, [records.length, params.campaign]);
 
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
  <center className="pt-2" style={{ backgroundImage: 'url(../images/zombie.jpg)', backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "auto"}}>
   <div className="w-100">
     <h2 className="text-light">{params.campaign.toString()}</h2>
     <Table striped bordered condensed hover className="bg-light" style={{ width: 'auto', fontSize: '.73rem' }}>
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