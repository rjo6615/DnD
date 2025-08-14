import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import Home from "./components/Home/Home";
import Navbar from "./components/Navbar/Navbar";
// import Footer from "./components/Footer/Footer";
import Zombies from "./components/Zombies/pages/Zombies";
import ZombiesCharacterSheet from "./components/Zombies/pages/ZombiesCharacterSheet";
import ZombiesCharacterSelect from "./components/Zombies/pages/ZombiesCharacterSelect";
import ZombiesDM from "./components/Zombies/pages/ZombiesDM";
import Login from "./components/Login/Login";
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.scss";
import useToken from './useToken';


function App() {
  const { token, setToken } = useToken();

  if(!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

function AppRoutes() {
  const location = useLocation();
  const hideNavbarRoutes = []; // Add routes here to hide the navbar when needed

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/zombies" element={<Zombies />} />
        <Route path="/zombies-character-select/:campaign" element={<ZombiesCharacterSelect />} />
        <Route path="/zombies-character-sheet/:id" element={<ZombiesCharacterSheet />} />
        <Route path="/zombies-dm/:campaign" element={<ZombiesDM />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {/* <Footer /> */}
    </>
  );
}

export default App;
