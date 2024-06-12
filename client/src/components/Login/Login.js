import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { MDBContainer, MDBRow, MDBCol } from 'mdb-react-ui-kit';

async function loginUser(credentials) {
 return fetch('/login', {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json'
   },
   body: JSON.stringify(credentials)
 })
   .then(data => data.json())
}

export default function Login({ setToken }) {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [username, setUserName] = useState();
  const [password, setPassword] = useState();
  const [usernameCheck, setUsernameCheck] = useState();
  const [user, setUser] = useState({
    username: "", 
    password: "",
  });
  const [newUser, setNewUser] = useState({
    username: "", 
    password: "",
    confirmPassword: "",
   });

  // Update the state properties.
  function updateForm(value) {
    return setNewUser((prev) => {
      return { ...prev, ...value };    
    });  
  }

  // Function to handle submission.
 async function onSubmit(e) {
  e.preventDefault();
  if (user.username === usernameCheck) {
    alert("Username already in use!");
  } else if (newUser.password === newUser.confirmPassword) {
    sendToDb();
    alert("Account created!")
  } else {
    alert("Passwords do not match!");
  }
   
}

 // Sends form data to database
 async function sendToDb(){
  const newUserInfo = { ...newUser };
    await fetch("/users/add", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify(newUserInfo),
   })
   .catch(error => {
     window.alert(error);
     return;
   });
 
   setNewUser({
   username: "", 
   password: "",
   confirmPassword: "",});
 }
  const handleSubmit = async e => {
    e.preventDefault();
    checkUser();
}

async function checkUser() {
if (username === user.username && password === user.password) {
  const token = await loginUser({
    username,
    password
  });
  setToken(token);
} else {
alert('Failed to log in');
}
}

useEffect(() => {
async function fetchData() {
  const response = await fetch(`/users/${username}/${password}`);

  if (!response.ok) {
    const message = `An error has occurred: ${response.statusText}`;
    console.log(message);
    return;
  }

  const record = await response.json();
  if (!record) {
    return;
  }
  setUser(record);
}
fetchData();
return;
}, [username, password]); 

useEffect(() => {
  async function fetchDataUser() {
    const response = await fetch(`/users/${usernameCheck}`);
  
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      console.log(message);
      return;
    }
  
    const record = await response.json();
    if (!record) {
      return;
    }
    setUser(record);
  }
  fetchDataUser();
  return;
  }, [usernameCheck]); 
 
console.log(user);
console.log(usernameCheck);
  return(
    <div style={{backgroundImage: 'URL("../images/Dndbg.png")', backgroundSize: "cover", height: '100vh', backgroundPosition: 'center'}}>
    <center>
<MDBContainer>
<MDBRow>
  <MDBCol col='6' className="mb-5">
    <div className="d-flex flex-column">
      <div className="text-center">
        <h2 className="mt-5 mb-5 pb-1 text-light" style={{fontFamily: "Shadows Into Light, cursive"}}><strong>DnD Helper App</strong></h2>
      </div>
      <p className='text-light'>Please login to your account</p>
      <center>
      <Form  className="w-100 mb-3" style={{maxWidth: '200px'}} onSubmit={handleSubmit}>
     <Form.Group className="" controlId="formUsername">
       <Form.Label>Username</Form.Label>
       <Form.Control type="text"  onChange={e => setUserName(e.target.value)} placeholder="Enter username" />
     </Form.Group>
     <Form.Group className="mb-3" controlId="formPassword">
       <Form.Label>Password</Form.Label>
       <Form.Control type="password" onChange={e => setPassword(e.target.value)} placeholder="Password" />
     </Form.Group>     
      <div className="text-center pt-1 mb-5 pb-1">
      <Button className="mb-2 w-100" variant="primary" type="submit">
       Login
     </Button>
        <a className="text-light" href="#!">Forgot password?</a>
      </div>
      </Form>
      </center>
      <div className="d-flex flex-row align-items-center justify-content-center pb-4 mb-4">
        <p className="mb-0 text-light">Don't have an account?</p>
        <Button variant="success" className="mx-2" onClick={() => {handleShow();}}>Sign up</Button>
      </div>
    </div>
  </MDBCol>
</MDBRow>
</MDBContainer>
    <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Sign up</Modal.Title>
        </Modal.Header>
        <Modal.Body>   
      <Form onSubmit={onSubmit} className="px-5">
     
     <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-dark">Username</Form.Label>
       <Form.Control onChange={(e) => { updateForm({ username: e.target.value }); setUsernameCheck( e.target.value)}}
        type="text" placeholder="Enter username" />  
      
       <Form.Label className="text-dark">Password</Form.Label>
       <Form.Control onChange={(e) => updateForm({ password: e.target.value })} 
       type="password" placeholder="Enter password" />  

       <Form.Label className="text-dark">Confirm Password</Form.Label>
       <Form.Control onChange={(e) => updateForm({ confirmPassword: e.target.value })} 
       type="password" placeholder="Confirm password" />  
     </Form.Group>
     <center>
     <Button variant="primary" onClick={handleClose} type="submit">
            Submit
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          </center>
     </Form>
     </Modal.Body>        
      </Modal> 
   </center>
   </div>
      
  )
}

Login.propTypes = {
  setToken: PropTypes.func.isRequired
};