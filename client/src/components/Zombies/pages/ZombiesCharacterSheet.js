import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
import '../../../App.scss';
import zombiesbg from "../../../images/zombiesbg.jpg";
import banner from "../../../images/banner.png";
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills"; // Import the Skills component

export default function ZombiesCharacterSheet() {
  const params = useParams();
  const characterId = params.id; 
  const [form, setForm] = useState(null);
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSkill, setShowSkill] = useState(false); // State for skills modal

  useEffect(() => {
    async function fetchCharacterData(id) {
      try {
        const response = await fetch(`/characters/${id}`);
        if (!response.ok) {
          throw new Error(`Error fetching character data: ${response.statusText}`);
        }
        const data = await response.json();
        setForm(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchCharacterData(characterId);
  }, [characterId]);

  const handleShowCharacterInfo = () => setShowCharacterInfo(true);
  const handleCloseCharacterInfo = () => setShowCharacterInfo(false);
  const handleShowStats = () => setShowStats(true);
  const handleCloseStats = () => setShowStats(false);
  const handleShowSkill = () => setShowSkill(true); // Handler to show skills modal
  const handleCloseSkill = () => setShowSkill(false); // Handler to close skills modal

  // useEffect(() => {
  //   console.log("Skills component form data:", form); // Debug log
  // }, [form]);

  if (!form) {
    return <div style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>Loading...</div>;
  }

  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const statTotal = statNames.reduce((sum, stat) => sum + form[stat], 0);
  const statPointsLeft = Math.floor((totalLevel / 4) - (statTotal - form.startStatTotal));

  return (
    <center className="pt-3" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${zombiesbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
      <div style={{paddingTop: '80px'}}>
        <h1 style={{ fontSize: 28, backgroundPositionY: "450%", width: "300px", height: "95px", backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundRepeat: "no-repeat"}} className="text-dark">{form.characterName}</h1>  
        <Navbar fixed="bottom" bg="dark" data-bs-theme="dark">
          <Container>
            <Nav className="me-auto mx-auto" style={{marginTop: "-10px"}}>
              <Button onClick={handleShowCharacterInfo} style={{color: "black", padding: "8px", marginTop: "10px"}} className="mx-1 fas fa-image-portrait" variant="secondary"></Button>
              <Button onClick={handleShowStats} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: statPointsLeft > 0 ? "gold" : "gray"}} className="mx-1 fas fa-scroll" variant="secondary"></Button>
              <Button onClick={handleShowSkill} style={{color: "black", padding: "8px", marginTop: "10px", backgroundColor: "gold"}} className="mx-1 fas fa-book-open" variant="secondary"></Button>  
            </Nav>
          </Container>
        </Navbar>
        <CharacterInfo form={form} show={showCharacterInfo} handleClose={handleCloseCharacterInfo} />
        <Skills form={form} showSkill={showSkill} handleCloseSkill={handleCloseSkill} totalLevel={totalLevel} />
        <Stats form={form} showStats={showStats} handleCloseStats={handleCloseStats} totalLevel={totalLevel} />
        </div>
    </center>  
  );
}
