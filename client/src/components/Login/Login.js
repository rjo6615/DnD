import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import { MDBContainer, MDBRow, MDBCol } from 'mdb-react-ui-kit';
import loginbg from "../../images/loginbg.png";
import logoLight from "../../images/logo-light.png";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function loginUser(credentials) {
  credentials.username = capitalizeFirstLetter(credentials.username);
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function fetchUserByUsername(username) {
  username = capitalizeFirstLetter(username);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/users/${username}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const user = await response.json();
      return user;
    }
    return null;
  } catch (error) {
    console.error('Fetch user error:', error);
    return null;
  }
}

async function createUser(newUser) {
  newUser.username = capitalizeFirstLetter(newUser.username);
  try {
    const response = await fetch('/users/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return await response.json();
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export default function Login({ setToken }) {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const updateForm = (value) => setNewUser(prev => ({ ...prev, ...value }));

  const handleLogin = async () => {
    try {
      const token = await loginUser({ username, password });
      setToken(token);
    } catch (error) {
      alert('Failed to log in. Please check your credentials and try again.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const existingUser = await fetchUserByUsername(newUser.username);
    if (existingUser) {
      alert('Username already in use!');
    } else if (newUser.password === newUser.confirmPassword) {
      try {
        await createUser({ username: newUser.username, password: newUser.password });
        alert('Account created!');
        handleClose();
        setNewUser({ username: '', password: '', confirmPassword: '' });
      } catch (error) {
        console.error('Signup error:', error);
        alert('Failed to create account. Please try again later.');
      }
    } else {
      alert('Passwords do not match!');
    }
  };

  return (
    <div style={{ backgroundImage: `url(${loginbg})`, backgroundSize: 'cover', height: '100vh', backgroundPosition: 'center' }}>
      <center>
        <MDBContainer style={{ fontFamily: 'Raleway, sans-serif' }}>
          <MDBRow>
            <MDBCol col='6' className="my-5">
              <div className="d-flex flex-column" style={{backgroundColor: "rgba(0, 0, 0, 0.7)"}}>
                <div className="text-center">
                  <img src={logoLight} alt="logo" className="py-3" style={{maxHeight: "200px", maxWidth: "200px"}} />
                  {/* <h1 className="mt-5 mb-5 pb-1 text-light" style={{ fontFamily: 'Raleway, sans-serif' }}>Realm Tracker</h1> */}
                </div>
                <p className='text-light'>Please login to your account</p>
                <center>
                  <Form className="w-100 mb-3" style={{ maxWidth: '200px' }}>
                    <Form.Group className="" controlId="formUsername">
                      <Form.Label>Username</Form.Label>
                      <Form.Control type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formPassword">
                      <Form.Label>Password</Form.Label>
                      <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                    </Form.Group>
                    <div className="text-center pt-1 mb-5 pb-1">
                      <Button className="mb-2 w-100" variant="primary" onClick={handleLogin}>
                        Login
                      </Button>
                      <a className="text-light" href="#!">Forgot password?</a>
                    </div>
                  </Form>
                </center>
                <div className="d-flex flex-row align-items-center justify-content-center pb-4 mb-4">
                  <p className="mb-0 text-light">Don't have an account?</p>
                  <Button variant="success" className="mx-2" onClick={handleShow}>Sign up</Button>
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
                <Form.Control
                  onChange={(e) => { updateForm({ username: e.target.value }); }}
                  type="text" placeholder="Enter username"
                />
                <Form.Label className="text-dark">Password</Form.Label>
                <Form.Control
                  onChange={(e) => updateForm({ password: e.target.value })}
                  type="password" placeholder="Enter password"
                />
                <Form.Label className="text-dark">Confirm Password</Form.Label>
                <Form.Control
                  onChange={(e) => updateForm({ confirmPassword: e.target.value })}
                  type="password" placeholder="Confirm password"
                />
              </Form.Group>
              <center>
                <Button variant="primary" type="submit">Submit</Button>
                <Button className="ms-4" variant="secondary" onClick={handleClose}>Close</Button>
              </center>
            </Form>
          </Modal.Body>
        </Modal>
      </center>
    </div>
  );
}

Login.propTypes = {
  setToken: PropTypes.func.isRequired,
};