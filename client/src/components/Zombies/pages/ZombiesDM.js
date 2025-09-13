import React, { useState, useEffect, useCallback } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Button, Col, Form, Row, Container, Table, Card, Alert, Spinner } from "react-bootstrap";
import Modal from 'react-bootstrap/Modal';
import { useNavigate, useParams } from "react-router-dom";
import loginbg from "../../../images/loginbg.png";
import useUser from '../../../hooks/useUser';
import { STATS } from '../statSchema';
import { SKILLS } from '../skillSchema';

const STAT_LOOKUP = STATS.reduce((acc, { key, label }) => {
  acc[label.toLowerCase()] = key;
  acc[key.toLowerCase()] = key;
  return acc;
}, {});

const STAT_LABELS = STATS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const SKILL_LOOKUP = SKILLS.reduce((acc, { key, label }) => {
  acc[label.toLowerCase()] = key;
  acc[key.toLowerCase()] = key;
  return acc;
}, {});

const SKILL_LABELS = SKILLS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

export default function ZombiesDM() {
  const user = useUser();

    const navigate = useNavigate();
    const params = useParams();
    const [records, setRecords] = useState([]);
    const [status, setStatus] = useState(null);
    useEffect(() => {
      async function getRecords() {
        const response = await apiFetch(`/campaigns/${params.campaign}/characters`);

        if (!response.ok) {
          const message = `An error occurred: ${response.statusText}`;
          setStatus({ type: 'danger', message });
          return;
        }

        const data = await response.json();
        setRecords(data);
      }

      getRecords();

      return;
    }, [params.campaign]);
  
    const navigateToCharacter = (id) => {
      navigate(`/zombies-character-sheet/${id}`);
    }

    const [showPlayers, setShowPlayers] = useState(false);
    const handleClosePlayers = () => setShowPlayers(false);
    const handleShowPlayers = () => setShowPlayers(true);
//--------------------------------------------Campaign Section------------------------------
const [campaignDM, setCampaignDM] = useState({ players: [] });

// Fetch CampaignsDM
useEffect(() => {
  if (!user) {
    return;
  }
  async function fetchCampaignsDM() {
    const response = await apiFetch(`/campaigns/dm/${user.username}/${params.campaign}`);

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }

    const record = await response.json();
    if (!record) {
      setStatus({ type: 'danger', message: 'Record not found' });
      navigate("/");
      return;
    }
    setCampaignDM( record );
  }
  fetchCampaignsDM();   
  return;
  
}, [ navigate, user, params.campaign ]);

//---------------------------------------Add Player-------------------------------------------
const [players, setPlayers] = useState({ 
  players: [] 
});

const [playersSearch, setPlayersSearch] = useState("");

 useEffect(() => {
    if (!user) {
      return;
    }

    async function fetchUsers() {
      const response = await apiFetch(`/users`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }

      const record = await response.json();
      if (!record) {
        setStatus({ type: 'danger', message: 'Record not found' });
        navigate("/");
        return;
      }
      setPlayers({players: record});
    }

    fetchUsers();
  }, [navigate, user]);

async function newPlayerSubmit(e) {
  e.preventDefault();   
   sendNewPlayersToDb();
}

const currentCampaign = params.campaign.toString();
async function sendNewPlayersToDb() {
  const newPlayers = [playersSearch];
  await apiFetch(`/campaigns/players/add/${currentCampaign}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newPlayers),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(response.status === 400 ? "Player already exists!" : "Failed to add player");
    }
    return response.text(); // Change to text() instead of json()
  })
  .then(data => {
    setStatus({ type: 'success', message: 'Player Successfully Added!' });
    setPlayersSearch(""); // Clear input after successful submission
    navigate(0);
  })
  .catch(error => {
    console.error('Error:', error);
    setStatus({ type: 'danger', message: error.message });
  });
}

//---------------------------------------Weapons----------------------------------------------

const [form2, setForm2] = useState({
    campaign: currentCampaign,
    name: "",
    type: "",
    category: "",
    damage: "",
    properties: [],
    weight: "",
    cost: "",
  });

  const [weaponPrompt, setWeaponPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const [armorPrompt, setArmorPrompt] = useState("");
  const [armorLoading, setArmorLoading] = useState(false);

  const [show2, setShow2] = useState(false);
  const [isCreatingWeapon, setIsCreatingWeapon] = useState(false);
  const handleClose2 = () => {
    setShow2(false);
    setIsCreatingWeapon(false);
  };
  const handleShow2 = () => setShow2(true);

  const [weapons, setWeapons] = useState([]);
  const [weaponOptions, setWeaponOptions] = useState({
    types: [],
    categories: [],
    properties: [],
  });

    const fetchWeapons = useCallback(async () => {
      const response = await apiFetch(`/equipment/weapons/${currentCampaign}`);
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      const data = await response.json();
      setWeapons(data);
    }, [currentCampaign]);

    const fetchWeaponOptions = useCallback(async () => {
      const response = await apiFetch('/weapons/options');
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      const data = await response.json();
      setWeaponOptions(data);
    }, []);

    useEffect(() => {
      if (show2) {
        fetchWeapons();
        fetchWeaponOptions();
      }
    }, [show2, currentCampaign, fetchWeapons, fetchWeaponOptions]);
  
  function updateForm2(value) {
    return setForm2((prev) => {
      return { ...prev, ...value };
    });
  }

  async function generateWeapon() {
    setLoading(true);
    try {
      if (!weaponOptions.types.length || !weaponOptions.categories.length) {
        setStatus({ type: 'danger', message: 'Weapon options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/weapon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: weaponPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const weapon = await response.json();
      updateForm2({
        name: weapon.name || '',
        type: weapon.type || '',
        category: weapon.category || '',
        damage: weapon.damage || '',
        properties: weapon.properties || [],
        weight: weapon.weight ?? '',
        cost: weapon.cost ?? '',
      });
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate weapon' });
    } finally {
      setLoading(false);
    }
  }
  
  async function onSubmit2(e) {
    e.preventDefault();   
     sendToDb2();
  }
  
  async function sendToDb2(){
    const weightNumber = form2.weight === "" ? undefined : Number(form2.weight);
    const costNumber = form2.cost === "" ? undefined : Number(form2.cost);
    const newWeapon = {
      campaign: currentCampaign,
      name: form2.name,
      type: form2.type,
      category: form2.category,
      damage: form2.damage,
      properties: form2.properties,
      weight: weightNumber,
      cost: costNumber,
    };
    Object.keys(newWeapon).forEach((key) => {
      if (newWeapon[key] === "" || newWeapon[key] === undefined) {
        delete newWeapon[key];
      }
    });
    try {
      const response = await apiFetch("/equipment/weapon/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newWeapon),
      });

      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || errorData?.error || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }

      setForm2({
        campaign: currentCampaign,
        name: "",
        type: "",
        category: "",
        damage: "",
        properties: [],
        weight: "",
        cost: "",
      });
      handleClose2();
      fetchWeapons();
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  async function deleteWeapon(id) {
    try {
      const response = await apiFetch(`/equipment/weapon/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      setWeapons((prev) => prev.filter((w) => w._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }
   //  ------------------------------------Armor-----------------------------------
  
  const [show3, setShow3] = useState(false);
  const [isCreatingArmor, setIsCreatingArmor] = useState(false);
  const handleClose3 = () => {
    setShow3(false);
    setIsCreatingArmor(false);
  };
  const handleShow3 = () => setShow3(true);

  const [armor, setArmor] = useState([]);
  const [armorOptions, setArmorOptions] = useState({
    types: [],
    categories: [],
  });

  const [form3, setForm3] = useState({
    campaign: currentCampaign,
    armorName: "",
    type: "",
    category: "",
    armorBonus: "",
    maxDex: "",
    strength: "",
    stealth: "",
    weight: "",
    cost: "",
  });
  
  function updateForm3(value) {
    return setForm3((prev) => {
      return { ...prev, ...value };
    });
  }

  const fetchArmor = useCallback(async () => {
    const response = await apiFetch(`/equipment/armor/${currentCampaign}`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setArmor(data);
  }, [currentCampaign]);

  const fetchArmorOptions = useCallback(async () => {
    const response = await apiFetch('/armor/options');
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setArmorOptions(data);
  }, []);

  useEffect(() => {
    if (show3) {
      fetchArmor();
      fetchArmorOptions();
    }
  }, [show3, currentCampaign, fetchArmor, fetchArmorOptions]);

  async function generateArmor() {
    setArmorLoading(true);
    try {
      if (!armorOptions.types.length || !armorOptions.categories.length) {
        setStatus({ type: 'danger', message: 'Armor options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/armor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: armorPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const armor = await response.json();
      updateForm3({
        armorName: armor.name || '',
        type: armor.type || '',
        category: armor.category || '',
        armorBonus: armor.armorBonus ?? armor.acBonus ?? '',
        maxDex: armor.maxDex !== undefined ? String(armor.maxDex) : '',
        strength: armor.strength ?? '',
        stealth: armor.stealth !== undefined ? String(armor.stealth) : '',
        weight: armor.weight ?? '',
        cost: armor.cost !== undefined ? String(armor.cost) : '',
      });
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate armor' });
    } finally {
      setArmorLoading(false);
    }
  }
  
  async function onSubmit3(e) {
    e.preventDefault();   
     sendToDb3();
  }
  
  async function sendToDb3(){
    const numericFields = ['armorBonus', 'maxDex', 'strength', 'weight'];
    const newArmor = Object.fromEntries(
      Object.entries(form3)
        .filter(([_, v]) => v !== "")
        .map(([key, value]) => [
          key,
          numericFields.includes(key) ? Number(value) : key === "cost" ? String(value) : value,
        ])
    );
    await apiFetch("/equipment/armor/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newArmor),
     })
   .catch(error => {
     setStatus({ type: 'danger', message: error.toString() });
     return;
   });

   setForm3({
    campaign: currentCampaign,
    armorName: "",
    type: "",
    category: "",
    armorBonus: "",
    maxDex: "",
    strength: "",
    stealth: "",
    weight: "",
    cost: "",
  });
   fetchArmor();
   setIsCreatingArmor(false);
  }

  async function deleteArmor(id) {
    try {
      const response = await apiFetch(`/equipment/armor/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      await response.json();
      setArmor((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }
  
//------------------------------------Items------------------------------------------------------------
  const [show4, setShow4] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const handleClose4 = () => {
    setShow4(false);
    setIsCreatingItem(false);
  };
  const handleShow4 = () => setShow4(true);

  const [items, setItems] = useState([]);
  const [itemOptions, setItemOptions] = useState({
    categories: [],
  });

  const [form4, setForm4] = useState({
    campaign: currentCampaign,
    name: "",
    category: "",
    weight: "",
    cost: "",
    notes: "",
    statBonuses: {},
    skillBonuses: {},
  });

  const [itemPrompt, setItemPrompt] = useState("");
  const [itemLoading, setItemLoading] = useState(false);
  const [showItemNotes, setShowItemNotes] = useState(false);
  const [currentItemNote, setCurrentItemNote] = useState('');

  const openItemNote = (note) => {
    setCurrentItemNote(note);
    setShowItemNotes(true);
  };

  const closeItemNote = () => setShowItemNotes(false);

  function updateForm4(value) {
    return setForm4((prev) => {
      return { ...prev, ...value };
    });
  }

  const fetchItems = useCallback(async () => {
    const response = await apiFetch(`/equipment/items/${currentCampaign}`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setItems(data);
  }, [currentCampaign]);

  const fetchItemOptions = useCallback(async () => {
    const response = await apiFetch('/items/options');
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setItemOptions(data);
  }, []);

  useEffect(() => {
    if (show4) {
      fetchItems();
      fetchItemOptions();
    }
  }, [show4, currentCampaign, fetchItems, fetchItemOptions]);

  async function generateItem() {
    setItemLoading(true);
    try {
      if (!itemOptions.categories.length) {
        setStatus({ type: 'danger', message: 'Item options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: itemPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const item = await response.json();
      const normalizeBonuses = (bonuses, lookup) => {
        const result = {};
        for (const [k, v] of Object.entries(bonuses || {})) {
          const key = lookup[k.toLowerCase()] || k;
          result[key] = v;
        }
        return result;
      };
      const updates = {
        name: item.name || '',
        category: item.category || '',
        weight: item.weight ?? '',
        cost: item.cost ?? '',
      };
      if (item.statBonuses) {
        updates.statBonuses = normalizeBonuses(item.statBonuses, STAT_LOOKUP);
      }
      if (item.skillBonuses) {
        updates.skillBonuses = normalizeBonuses(item.skillBonuses, SKILL_LOOKUP);
      }
      updateForm4(updates);
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate item' });
    } finally {
      setItemLoading(false);
    }
  }

  async function onSubmit4(e) {
    e.preventDefault();
    sendToDb4();
  }

  async function sendToDb4() {
    const weightNumber = form4.weight === "" ? undefined : Number(form4.weight);
    const normalizeBonuses = (obj) => {
      const entries = Object.entries(obj || {}).filter(([, v]) => v !== '' && v !== undefined);
      if (!entries.length) return undefined;
      return Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
    };
    const statBonuses = normalizeBonuses(form4.statBonuses);
    const skillBonuses = normalizeBonuses(form4.skillBonuses);
    const newItem = {
      campaign: currentCampaign,
      name: form4.name,
      category: form4.category,
      weight: weightNumber,
      cost: form4.cost,
      ...(form4.notes && { notes: form4.notes }),
      ...(statBonuses && { statBonuses }),
      ...(skillBonuses && { skillBonuses }),
    };
    try {
      const response = await apiFetch('/equipment/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || errorData?.error || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      setForm4({
        campaign: currentCampaign,
        name: "",
        category: "",
        weight: "",
        cost: "",
        notes: "",
        statBonuses: {},
        skillBonuses: {},
      });
      handleClose4();
      fetchItems();
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  async function deleteItem(id) {
    try {
      const response = await apiFetch(`/equipment/items/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  const renderBonuses = (bonuses, labels) =>
    Object.entries(bonuses || {})
      .map(([k, v]) => `${labels[k] || k}: ${v}`)
      .join(', ');
  

// -----------------------------------Display-----------------------------------------------------------------------------
 return (
    <div className="pt-2 text-center" style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", height: "100vh"}}>
          <div style={{paddingTop: '150px'}}></div>
{status && (
  <Alert variant={status.type} dismissible onClose={() => setStatus(null)}>
    {status.message}
  </Alert>
)}

<div className="d-flex justify-content-center flex-wrap gap-2 mb-3" style={{ position: 'relative', zIndex: '4' }}>
  {/*-----------------------------------Add Player-----------------------------------------------------*/}
  <Button style={{ borderColor: 'transparent' }} onClick={() => { handleShowPlayers(); }} className="p-1 hostCampaign" size="sm" variant="secondary">View/Add Players</Button>
  {/*-----------------------------------Create Weapon-----------------------------------------------------*/}
  <Button style={{ borderColor: 'transparent' }} onClick={(e) => { e.preventDefault(); handleShow2(); }} className="p-1 hostCampaign" size="sm" variant="secondary">Create Weapon</Button>
  {/*-----------------------------------Create Armor-----------------------------------------------------*/}
  <Button style={{ borderColor: 'transparent' }} onClick={(e) => { e.preventDefault(); handleShow3(); }} className="p-1 hostCampaign" size="sm" variant="secondary">Create Armor</Button>
  {/*-----------------------------------Create Item-----------------------------------------------------*/}
  <Button style={{ borderColor: 'transparent' }} onClick={(e) => { e.preventDefault(); handleShow4(); }} className="p-1 hostCampaign" size="sm" variant="secondary">Create Item</Button>
</div>

<div style={{ maxHeight: '600px', overflowY: 'auto', position: 'relative', zIndex: '4'}}>
      <Table striped bordered condensed="true" className="zombieDMCharacterSelectTable dnd-background w-75 mx-auto">
        <thead>
            <tr>
                <th colSpan="5" style={{fontSize: 28}}>{params.campaign}</th>
            </tr>
          <tr>
            <th>Player</th>
            <th>Character</th>
            <th>Level</th>
            <th>Class</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(records) && records.map((Characters) => (
            <tr key={Characters._id}>
              <td>{Characters.token}</td>
              <td>{Characters.characterName}</td>
              <td>{Characters.occupation.reduce((total, el) => total + Number(el.Level), 0)}</td>
              <td>
                {Characters.occupation.map((el, i) => (
                  <span key={i}>{el.Level + " " + el.Occupation}<br /></span>
                ))}
              </td>
              <td>
                <Button
                  size="sm"
                  variant="link"
                  className="p-0"
                  style={{ border: 'none' }}
                  onClick={() => navigateToCharacter(Characters._id)}
                >
                  <i className="fa-solid fa-eye text-primary"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>

        <Modal className="dnd-modal" size="lg" centered show={showPlayers} onHide={handleClosePlayers}>
         <div className="text-center">
          <Card className="dnd-background">
            <Card.Title>Players</Card.Title>
          <Card.Body>   
        <div className="text-center">
        <Container className="mt-3">
        <Row>
          <Col>
            <Form onSubmit={newPlayerSubmit}>
            <Form.Group className="mb-3 mx-5">
          <Form.Label className="text-light">Select New Player</Form.Label>
          <Form.Select onChange={(e) => setPlayersSearch(e.target.value)}
            defaultValue=""
            type="text">
          <option value="" disabled>
            Select Player
          </option>
            {players.players && players.players.length > 0 ? (
              players.players.map((el) => (
                <option key={el.username}>{el.username}</option>
              ))
            ) : (
              <option>No players available</option>
            )}
          </Form.Select>
        </Form.Group>
          <Button 
          disabled={!playersSearch}
          style={{ position: "relative", zIndex: "4" }} 
          className="rounded-pill" 
          variant="outline-light" 
          type="submit">Add</Button>
            </Form>
            </Col>
        </Row>
        </Container>
        <Table striped bordered condensed="true" className="zombieCharacterSelectTable mt-4">
          <tbody>
          {campaignDM.players.map((el) => (  
            <tr key={el}>
            <td>{el}</td>
            </tr>
          ))}
          </tbody>
        </Table>
            <Button className="ms-4" variant="secondary" onClick={handleClosePlayers}>
              Close
            </Button>
        </div>
       </Card.Body>     
       </Card>   
       </div>
        </Modal>
          {/* ----------------------------------Weapon Modal---------------------------------------- */}
          <Modal className="dnd-modal modern-modal" size="lg" centered show={show2} onHide={handleClose2}>
          <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">{isCreatingWeapon ? "Create Weapon" : "Weapons"}</Card.Title>
            </Card.Header>
          <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          <div className="text-center">
            {isCreatingWeapon ? (
              <Form onSubmit={onSubmit2} className="px-5">
               <Form.Group className="mb-3 pt-3" >

               <Form.Label className="text-light">Weapon Prompt</Form.Label>
               <Form.Control
                className="mb-2"
                value={weaponPrompt}
                onChange={(e) => setWeaponPrompt(e.target.value)}
                type="text"
                placeholder="Describe a weapon" />
               <Button
                className="mb-3"
                variant="outline-primary"
                onClick={(e) => { e.preventDefault(); generateWeapon(); }}
                disabled={loading}
               >
                {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "Generate with AI"}
               </Button>
               <br></br>
               <Form.Label className="text-light">Name</Form.Label>
               <Form.Control className="mb-2" value={form2.name} onChange={(e) => updateForm2({ name: e.target.value })}
                type="text" placeholder="Enter weapon name" />

               <Form.Label className="text-light">Type</Form.Label>
               <Form.Select
                className="mb-2"
                value={form2.type}
                onChange={(e) => updateForm2({ type: e.target.value })}
              >
                <option value="">Select type</option>
                {weaponOptions.types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Form.Select>

               <Form.Label className="text-light">Category</Form.Label>
               <Form.Select
                className="mb-2"
                value={form2.category}
                onChange={(e) => updateForm2({ category: e.target.value })}
              >
                <option value="">Select category</option>
                {weaponOptions.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Form.Select>

               <Form.Label className="text-light">Damage</Form.Label>
               <Form.Control className="mb-2" value={form2.damage} onChange={(e) => updateForm2({ damage: e.target.value })}
                type="text" placeholder="Enter damage" />

               <Form.Label className="text-light">Properties</Form.Label>
               <Form.Select
                multiple
                className="mb-2"
                value={form2.properties}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                  updateForm2({ properties: selected });
                }}
              >
                {weaponOptions.properties.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Form.Select>

              <Form.Label className="text-light">Weight</Form.Label>
               <Form.Control
                className="mb-2"
                value={form2.weight}
                onChange={(e) =>
                  updateForm2({ weight: e.target.value === "" ? "" : Number(e.target.value) })
                }
                type="number"
                placeholder="Enter weight"
              />

               <Form.Label className="text-light">Cost</Form.Label>
               <Form.Control
                className="mb-2"
                value={form2.cost}
                onChange={(e) =>
                  updateForm2({ cost: e.target.value === "" ? "" : Number(e.target.value) })
                }
                type="number"
                placeholder="Enter cost"
              />

            </Form.Group>
             <div className="text-center">
             <Button variant="primary" type="submit">
                    Create
                  </Button>
                  <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingWeapon(false)}>
                    Cancel
                  </Button>
                  </div>
            </Form>
            ) : (
              <>
              <Table responsive striped bordered hover size="sm" className="modern-table mt-3">
                <thead>
                  <tr>
                   <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Damage</th>
                    <th>Properties</th>
                    <th>Weight</th>
                    <th>Cost</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {weapons.map((w) => (
                    <tr key={w._id}>
                      <td>{w.name}</td>
                      <td>{w.type}</td>
                      <td>{w.category}</td>
                      <td>{w.damage}</td>
                      <td>{w.properties?.join(', ')}</td>
                      <td>{w.weight}</td>
                      <td>{w.cost}</td>
                      <td>
                        <Button
                          className="btn-danger action-btn fa-solid fa-trash"
                          onClick={() => deleteWeapon(w._id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Button variant="primary" onClick={() => setIsCreatingWeapon(true)}>
                Create Weapon
              </Button>
              <Button className="ms-4" variant="secondary" onClick={handleClose2}>
                Close
              </Button>
              </>
            )}
          </div>
          </Card.Body>
          </Card>
          </div>
           </Modal>
  {/* --------------------------------------- Armor Modal --------------------------------- */}
  <Modal className="dnd-modal modern-modal" size="lg" centered show={show3} onHide={handleClose3}>
  <div className="text-center">
  <Card className="modern-card">
    <Card.Header className="modal-header">
      <Card.Title className="modal-title">{isCreatingArmor ? "Create Armor" : "Armor"}</Card.Title>
    </Card.Header>
  <Card.Body>
  <div className="text-center">
    {isCreatingArmor ? (
      <Form onSubmit={onSubmit3} className="px-5">
        <Form.Group className="mb-3 pt-3">

          <Form.Label className="text-light">Armor Prompt</Form.Label>
          <Form.Control
            className="mb-2"
            value={armorPrompt}
            onChange={(e) => setArmorPrompt(e.target.value)}
            type="text"
            placeholder="Describe armor"
          />
          <Button
            className="mb-3"
            variant="outline-primary"
            onClick={(e) => { e.preventDefault(); generateArmor(); }}
            disabled={armorLoading}
          >
            {armorLoading ? (
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              "Generate Armor"
            )}
          </Button>
          <br></br>
          <Form.Label className="text-light">Name</Form.Label>
          <Form.Control
            className="mb-2"
            value={form3.armorName}
            onChange={(e) => updateForm3({ armorName: e.target.value })}
            type="text"
            placeholder="Enter armor name"
          />

          <Form.Label className="text-light">Type</Form.Label>
          <Form.Select className="mb-2" value={form3.type} onChange={(e) => updateForm3({ type: e.target.value })}>
            <option value="">Select type</option>
            {armorOptions.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Form.Select>

          <Form.Label className="text-light">Category</Form.Label>
          <Form.Select className="mb-2" value={form3.category} onChange={(e) => updateForm3({ category: e.target.value })}>
            <option value="">Select category</option>
            {armorOptions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Form.Select>

          <Form.Label className="text-light">AC Bonus</Form.Label>
          <Form.Control
            className="mb-2"
            value={form3.armorBonus}
            onChange={(e) => updateForm3({ armorBonus: e.target.value })}
            type="text"
            placeholder="Enter AC Bonus"
          />

          <Form.Label className="text-light">Max Dex Bonus</Form.Label>
          <Form.Control
            className="mb-2"
            value={form3.maxDex}
            onChange={(e) => updateForm3({ maxDex: e.target.value })}
            type="text"
            placeholder="Enter Max Dex Bonus"
          />

          <Form.Label className="text-light">Strength Requirement</Form.Label>
          <Form.Control
            className="mb-2"
            value={form3.strength}
            onChange={(e) => updateForm3({ strength: e.target.value })}
            type="text"
            placeholder="Enter Strength Requirement"
          />

          <Form.Label className="text-light">Stealth</Form.Label>
          <Form.Select className="mb-2" value={form3.stealth} onChange={(e) => updateForm3({ stealth: e.target.value })}>
            <option value="">Select option</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Form.Select>

          <Form.Label className="text-light">Weight</Form.Label>
          <Form.Control
            className="mb-2"
            value={form3.weight}
            onChange={(e) => updateForm3({ weight: e.target.value })}
            type="text"
            placeholder="Enter Weight"
          />

          <Form.Label className="text-light">Cost</Form.Label>
          <Form.Control
            className="mb-2"
            value={form3.cost}
            onChange={(e) => updateForm3({ cost: e.target.value })}
            type="text"
            placeholder="Enter Cost"
          />
        </Form.Group>
        <div className="text-center">
          <Button variant="primary" type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingArmor(false)}>
            Cancel
          </Button>
        </div>
      </Form>
    ) : (
      <>
      <Table striped bordered hover size="sm" className="modern-table mt-3">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Category</th>
            <th>AC Bonus</th>
            <th>Max Dex</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {armor.map((a) => (
            <tr key={a._id}>
              <td>{a.armorName ?? a.name}</td>
              <td>{a.type}</td>
              <td>{a.category}</td>
              <td>{a.armorBonus ?? a.acBonus ?? a.ac}</td>
              <td>{a.maxDex}</td>
              <td>
                <Button className="btn-danger action-btn fa-solid fa-trash" onClick={() => deleteArmor(a._id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Button variant="primary" onClick={() => setIsCreatingArmor(true)}>
        Create Armor
      </Button>
      <Button className="ms-4" variant="secondary" onClick={handleClose3}>
        Close
      </Button>
      </>
    )}
  </div>
  </Card.Body>
  </Card>
  </div>
  </Modal>
  {/* -----------------------------------------Item Modal--------------------------------------------- */}
  <Modal className="dnd-modal modern-modal" size="lg" centered show={show4} onHide={handleClose4}>
    <div className="text-center">
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">{isCreatingItem ? "Create Item" : "Items"}</Card.Title>
        </Card.Header>
        <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          <div className="text-center">
            {isCreatingItem ? (
              <Form onSubmit={onSubmit4} className="px-5">
                <Form.Group className="mb-3 pt-3" >
                  <Form.Label className="text-light">Item Prompt</Form.Label>
                  <Form.Control
                    className="mb-2"
                    value={itemPrompt}
                    onChange={(e) => setItemPrompt(e.target.value)}
                    type="text"
                    placeholder="Describe an item" />
                  <Button
                    className="mb-3"
                    variant="outline-primary"
                    onClick={(e) => { e.preventDefault(); generateItem(); }}
                    disabled={itemLoading}
                  >
                    {itemLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "Generate with AI"}
                  </Button>
                  <br></br>
                  <Form.Label className="text-light">Name</Form.Label>
                  <Form.Control className="mb-2" value={form4.name} onChange={(e) => updateForm4({ name: e.target.value })}
                    type="text" placeholder="Enter item name" />

                  <Form.Label className="text-light">Category</Form.Label>
                  <Form.Select
                    className="mb-2"
                    value={form4.category}
                    onChange={(e) => updateForm4({ category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {itemOptions.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Form.Select>

                  <Form.Label className="text-light">Weight</Form.Label>
                  <Form.Control
                    className="mb-2"
                    value={form4.weight}
                    onChange={(e) =>
                      updateForm4({ weight: e.target.value === "" ? "" : Number(e.target.value) })
                    }
                    type="number"
                    placeholder="Enter weight"
                  />

                  <Form.Label className="text-light">Cost</Form.Label>
                  <Form.Control
                    className="mb-2"
                    value={form4.cost}
                    onChange={(e) => updateForm4({ cost: e.target.value })}
                    type="text"
                    placeholder="Enter cost"
                  />

                  <Form.Label className="text-light">Notes</Form.Label>
                  <Form.Control
                    className="mb-2"
                    value={form4.notes}
                    onChange={(e) => updateForm4({ notes: e.target.value })}
                    type="text"
                    placeholder="Enter notes"
                  />

                  <Form.Label className="text-light">Stat Bonuses</Form.Label>
                  {STATS.map(({ key, label }) => (
                    <Form.Control
                      key={key}
                      className="mb-2"
                      type="number"
                      placeholder={label}
                      value={form4.statBonuses[key] ?? ''}
                      onChange={(e) =>
                        updateForm4({
                          statBonuses: {
                            ...form4.statBonuses,
                            [key]: e.target.value === '' ? '' : Number(e.target.value)
                          }
                        })
                      }
                    />
                  ))}

                  <Form.Label className="text-light">Skill Bonuses</Form.Label>
                  {SKILLS.map(({ key, label }) => (
                    <Form.Control
                      key={key}
                      className="mb-2"
                      type="number"
                      placeholder={label}
                      value={form4.skillBonuses[key] ?? ''}
                      onChange={(e) =>
                        updateForm4({
                          skillBonuses: {
                            ...form4.skillBonuses,
                            [key]: e.target.value === '' ? '' : Number(e.target.value)
                          }
                        })
                      }
                    />
                  ))}

                </Form.Group>
                <div className="text-center">
                  <Button variant="primary" type="submit">
                    Create
                  </Button>
                  <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingItem(false)}>
                    Cancel
                  </Button>
                </div>
              </Form>
            ) : (
              <>
                <Table responsive striped bordered hover size="sm" className="modern-table mt-3">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Weight</th>
                      <th>Cost</th>
                      <th>Notes</th>
                      <th>Stat Bonuses</th>
                      <th>Skill Bonuses</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i._id}>
                        <td>{i.name}</td>
                        <td>{i.category}</td>
                        <td>{i.weight}</td>
                        <td>{i.cost}</td>
                        <td>
                          {i.notes && (
                            <Button variant="link" className="p-0" onClick={() => openItemNote(i.notes)}>
                              View
                            </Button>
                          )}
                        </td>
                        <td>{renderBonuses(i.statBonuses, STAT_LABELS)}</td>
                        <td>{renderBonuses(i.skillBonuses, SKILL_LABELS)}</td>
                        <td>
                          <Button
                            className="btn-danger action-btn fa-solid fa-trash"
                            onClick={() => deleteItem(i._id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <Button variant="primary" onClick={() => setIsCreatingItem(true)}>
                  Create Item
                </Button>
                <Button className="ms-4" variant="secondary" onClick={handleClose4}>
                  Close
                </Button>
              </>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  </Modal>
  <Modal className="dnd-modal" centered show={showItemNotes} onHide={closeItemNote}>
    <Card className="dnd-background">
      <Card.Header>
        <Card.Title>Notes</Card.Title>
      </Card.Header>
      <Card.Body>{currentItemNote}</Card.Body>
    </Card>
  </Modal>
      </div>
    )
}
