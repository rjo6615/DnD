import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import logoLight from "../../images/logo-light.png";
import apiFetch from "../../utils/apiFetch";
import './Login.css';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function loginUser(credentials) {
  credentials.username = capitalizeFirstLetter(credentials.username);
  try {
    const response = await apiFetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function createUser(newUser) {
  newUser.username = capitalizeFirstLetter(newUser.username);
  try {
    const response = await apiFetch('/users/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });
    const data = await response.json();
    if (!response.ok || data.errors) {
      const message = data.errors
        ? data.errors.map(e => e.msg).join(', ')
        : data.message || 'Failed to create user';
      throw new Error(message);
    }
    return data;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

export default function Login({ onLogin }) {
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
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');

  const updateForm = (value) => setNewUser(prev => ({ ...prev, ...value }));

  const handleLogin = async () => {
    try {
      await loginUser({ username, password });
      const res = await apiFetch('/me');
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
        setLoginError('');
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Failed to log in. Please check your credentials and try again.');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirmPassword) {
      setSignupError('Passwords do not match!');
      return;
    }
    try {
      await createUser({ username: newUser.username, password: newUser.password });
      setSignupError('');
      handleClose();
      setNewUser({ username: '', password: '', confirmPassword: '' });
    } catch (error) {
      console.error('Signup error:', error);
      setSignupError(error.message);
    }
  };
  return (
<div className="login-background d-flex justify-content-center align-items-center vh-100">
  <div className="login-overlay p-4 text-center" style={{ maxWidth: "400px", width: "100%" }}>
    <div className="text-center">
      <img src={logoLight} alt="logo" className="py-3 logo-image" />
      {/* <h1 className="mt-5 mb-5 pb-1 text-light" style={{ fontFamily: 'Raleway, sans-serif' }}>Realm Tracker</h1> */}
    </div>
    <p className="text-light">Please login to your account</p>

    <Form className="w-100 mb-3">
      <Form.Group controlId="formUsername">
        <Form.Label>Username</Form.Label>
        <Form.Control
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter username"
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formPassword">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
        />
      </Form.Group>
      {loginError && <div className="text-danger mb-3">{loginError}</div>}
      <div className="text-center pt-1 mb-5 pb-1">
        <Button className="mb-2 w-100" variant="primary" onClick={handleLogin}>
          Login
        </Button>
        <a className="text-light" href="#!">Forgot password?</a>
      </div>
    </Form>

    <div className="d-flex flex-row align-items-center justify-content-center pb-4 mb-4">
      <p className="mb-0 text-light">Don't have an account?</p>
      <Button variant="success" className="mx-2" onClick={handleShow}>Sign up</Button>
    </div>
  </div>

  {/* Signup Modal */}
  <Modal show={show} onHide={handleClose} centered>
    <Modal.Header closeButton>
      <Modal.Title>Sign up</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form onSubmit={onSubmit} className="px-5">
        <Form.Group className="mb-3 pt-3" controlId="signupUsername">
          <Form.Label className="text-dark">Username</Form.Label>
          <Form.Control
            onChange={(e) => updateForm({ username: e.target.value })}
            type="text"
            placeholder="Enter username"
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="signupPassword">
          <Form.Label className="text-dark">Password</Form.Label>
          <Form.Control
            onChange={(e) => updateForm({ password: e.target.value })}
            type="password"
            placeholder="Enter password"
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="signupConfirmPassword">
          <Form.Label className="text-dark">Confirm Password</Form.Label>
          <Form.Control
            onChange={(e) => updateForm({ confirmPassword: e.target.value })}
            type="password"
            placeholder="Confirm password"
          />
        </Form.Group>
        {signupError && <div className="text-danger mb-3">{signupError}</div>}
        <div className="text-center">
          <Button variant="primary" type="submit">Submit</Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>Close</Button>
        </div>
      </Form>
    </Modal.Body>
  </Modal>
</div>
  )
}

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};
