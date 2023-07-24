import React from 'react';
import { BrowserRouter as Router,  Route,  Routes,  Navigate} from "react-router-dom";
import Home from "./components/Home/Home";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Zombies from "./components/Zombies/Zombies";
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./App.css";

function App() {
  return (
    <div   className="bg-image">
    <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/zombies" element={<Zombies />} />
          <Route path="*" element={<Navigate to="/"/>} />
        </Routes>
        <Footer />
    </Router>
    </div>
  );
}

export default App;