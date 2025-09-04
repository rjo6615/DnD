import React, { useState, useEffect } from 'react';
import apiFetch from './utils/apiFetch';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
// import Footer from "./components/Footer/Footer";
import Zombies from "./components/Zombies/pages/Zombies";
import ZombiesCharacterSheet from "./components/Zombies/pages/ZombiesCharacterSheet";
import ZombiesCharacterSelect from "./components/Zombies/pages/ZombiesCharacterSelect";
import ZombiesDM from "./components/Zombies/pages/ZombiesDM";
import Login from "./components/Login/Login";
import Notifications from "./components/Notifications";
import SpellList from "./components/Spells/SpellList";
import SpellDetail from "./components/Spells/SpellDetail";
import WeaponList from "./components/Weapons/WeaponList";
import WeaponDetail from "./components/Weapons/WeaponDetail";
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.scss";


function App() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    apiFetch('/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setUser(data))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return null;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Router>
      <AppRoutes user={user} />
    </Router>
  );
}

function AppRoutes({ user }) {
  const location = useLocation();
  const hideNavbarRoutes = []; // Add routes here to hide the navbar when needed

  return (
    <>
      <Notifications />
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<Zombies />} />
        <Route path="/spells" element={<SpellList />} />
        <Route path="/spells/:name" element={<SpellDetail />} />
        {/* Weapon routes */}
        <Route path="/weapons" element={<WeaponList characterId={user?._id} />} />
        <Route path="/weapons/:name" element={<WeaponDetail />} />
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
