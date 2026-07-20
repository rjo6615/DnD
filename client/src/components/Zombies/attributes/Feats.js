import React, { useState, useEffect, useMemo, useCallback } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Col, Row, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from "react-router-dom";
import { SKILLS } from "../skillSchema";
import { calculateFeatPointsLeft } from '../../../utils/featUtils';
import DockControls from '../components/DockControls';
import { Check, Lock, Search, Shield, Sparkles, Sword, WandSparkles, X } from 'lucide-react';

// Tools and musical instruments that can be selected for proficiency.
// This list is not exhaustive to every possible item in the game but
// represents the common options a feat may allow a user to choose from.
const TOOL_OPTIONS = [
  { key: 'alchemistsSupplies', label: "Alchemist's Supplies" },
  { key: 'brewersSupplies', label: "Brewer's Supplies" },
  { key: 'calligraphersSupplies', label: "Calligrapher's Supplies" },
  { key: 'carpentersTools', label: "Carpenter's Tools" },
  { key: 'cartographersTools', label: "Cartographer's Tools" },
  { key: 'cobblersTools', label: "Cobbler's Tools" },
  { key: 'cooksUtensils', label: "Cook's Utensils" },
  { key: 'glassblowersTools', label: "Glassblower's Tools" },
  { key: 'jewelersTools', label: "Jeweler's Tools" },
  { key: 'leatherworkersTools', label: "Leatherworker's Tools" },
  { key: 'masonsTools', label: "Mason's Tools" },
  { key: 'paintersSupplies', label: "Painter's Supplies" },
  { key: 'pottersTools', label: "Potter's Tools" },
  { key: 'smithsTools', label: "Smith's Tools" },
  { key: 'tinkersTools', label: "Tinker's Tools" },
  { key: 'weaversTools', label: "Weaver's Tools" },
  { key: 'woodcarversTools', label: "Woodcarver's Tools" },
  { key: 'disguiseKit', label: 'Disguise Kit' },
  { key: 'forgeryKit', label: 'Forgery Kit' },
  { key: 'herbalismKit', label: 'Herbalism Kit' },
  { key: 'navigatorTools', label: "Navigator's Tools" },
  { key: 'poisonersKit', label: "Poisoner's Kit" },
  { key: 'thievesTools', label: "Thieves' Tools" },
  { key: 'landVehicles', label: 'Vehicles (Land)' },
  { key: 'waterVehicles', label: 'Vehicles (Water)' },
  { key: 'diceSet', label: 'Gaming Set (Dice)' },
  { key: 'dragonchessSet', label: 'Gaming Set (Dragonchess)' },
  { key: 'playingCardSet', label: 'Gaming Set (Playing Cards)' },
  { key: 'bagpipes', label: 'Bagpipes' },
  { key: 'drum', label: 'Drum' },
  { key: 'dulcimer', label: 'Dulcimer' },
  { key: 'flute', label: 'Flute' },
  { key: 'lute', label: 'Lute' },
  { key: 'lyre', label: 'Lyre' },
  { key: 'horn', label: 'Horn' },
  { key: 'panFlute', label: 'Pan Flute' },
  { key: 'shawm', label: 'Shawm' },
  { key: 'viol', label: 'Viol' },
];

// Combine skills and tools into a single list for selection components.
const ALL_SKILLS = [...SKILLS, ...TOOL_OPTIONS];

// Maximum number of selectable proficiencies a feat may grant.
const SKILL_SELECT_LIMIT = 3;
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const categoryFor = (feat) => {
  if (feat.category) return feat.category;
  const text = `${feat.featName || ''} ${feat.notes || ''}`.toLowerCase();
  if (/spell|magic|caster|ritual|arcana/.test(text)) return 'Magic';
  if (/armor|shield|tough|resilien|defen/.test(text)) return 'Defensive';
  if (/weapon|battle|fighter|attack|martial/.test(text)) return 'Combat';
  return 'General';
};
const requirementsFor = (feat) => {
  const value = feat?.prerequisites || feat?.prerequisite || feat?.requirements;
  if (Array.isArray(value)) return value.map(String);
  if (value) return [String(value)];
  if (feat?.minLevel || feat?.requiredLevel) return [`Requires level ${feat.minLevel || feat.requiredLevel}`];
  return [];
};
const bonusesFor = (feat) => ABILITIES.filter((ability) => Number(feat?.[ability])).map((ability) => ({ ability, value: Number(feat[ability]) }));
const descriptionFor = (notes) => String(notes || 'A defining talent that broadens your hero’s legend.').replace(/\s+/g, ' ').trim();

export default function Feats({
  form,
  showFeats,
  handleCloseFeats,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const params = useParams();
  const navigate = useNavigate();
  //----------------------------------------------Feats Section-----------------------------------------------------------------
  //-------------------------------------------------------------------
  const [feat, setFeat] = useState({ feat: [] });
  const [addFeat, setAddFeat] = useState(null);
  const [modalFeatData, setModalFeatData] = useState({ featName: "", notes: "" });
  const [showFeatNotes, setShowFeatNotes] = useState(false);
  const handleCloseFeatNotes = () => setShowFeatNotes(false);
  const handleShowFeatNotes = () => setShowFeatNotes(true);
  const [chosenFeat, setChosenFeat] = useState('');
  const [selectedFeatData, setSelectedFeatData] = useState(null);
  const [abilitySelections, setAbilitySelections] = useState({});
  const [skillSelections, setSkillSelections] = useState([]);
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Feats');

  const skillChoiceFields = [
    'skillChoiceCount',
    'skillChoices',
    'skillOptions',
    'skillChoice',
    'skillProficiencies',
    'toolChoiceCount',
    'toolChoices',
    'toolOptions',
    'toolChoice',
    'toolProficiencies',
  ];
  const hasSkillChoice =
    skillChoiceFields.some((field) => selectedFeatData?.[field]) ||
    selectedFeatData?.featName === 'Skilled';

  // Determine how many skills a user may select for the chosen feat.
  const skillLimit = Math.min(
    selectedFeatData?.skillChoiceCount || SKILL_SELECT_LIMIT,
    SKILL_SELECT_LIMIT
  );

  // Track the character's existing skill and tool proficiencies so feats
  // can't grant duplicates. The form.skills object stores both skills and
  // tools with a `proficient` flag.
  const existingProficiencies = new Set(
    Object.entries(form.skills || {})
      .filter(([, value]) => value?.proficient)
      .map(([key]) => key)
  );

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSelectFeat = (e) => {
    const featName = e.target.value;
    setChosenFeat(featName);
    const featObj = feat.feat.find((f) => f.featName === featName);
    setSelectedFeatData(featObj || null);
    setAbilitySelections({});
    const existingFeat = form.feat.find((f) => f.featName === featName);
    if (featObj) {
      const baseFeat = {
        featName: featObj.featName,
        notes: featObj.notes,
        initiative: featObj.initiative ?? 0,
        ac: featObj.ac ?? 0,
        speed: featObj.speed ?? 0,
        hpMaxBonus: featObj.hpMaxBonus ?? 0,
        hpMaxBonusPerLevel: featObj.hpMaxBonusPerLevel ?? 0,
      };
      SKILLS.forEach(({ key }) => {
        baseFeat[key] = featObj[key];
      });
      baseFeat.str = featObj.str ?? 0;
      baseFeat.dex = featObj.dex ?? 0;
      baseFeat.con = featObj.con ?? 0;
      baseFeat.int = featObj.int ?? 0;
      baseFeat.wis = featObj.wis ?? 0;
      baseFeat.cha = featObj.cha ?? 0;
      baseFeat.skills = {
        ...(featObj.skills || {}),
        ...(existingFeat?.skills || {}),
      };
      setSkillSelections(Object.keys(baseFeat.skills));
      setAddFeat(baseFeat);
    } else {
      setSkillSelections([]);
      setAddFeat(null);
    }
  };

  const handleAbilityChoice = (index, ability) => {
    setAbilitySelections((prev) => {
      const newSelections = { ...prev, [index]: ability };
      const abilityBonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
      Object.entries(newSelections).forEach(([i, a]) => {
        if (a) {
          const option = selectedFeatData.abilityIncreaseOptions[i];
          const amount = Array.isArray(option) ? 1 : option.amount ?? 1;
          abilityBonus[a] += amount;
        }
      });
      setAddFeat((prevFeat) => ({ ...prevFeat, ...abilityBonus }));
      return newSelections;
    });
  };

  const handleSkillChoice = (e) => {
    // Determine if the selected feat allows the user to pick proficiencies.
    let selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    if (selected.length > skillLimit) {
      selected = selected.slice(0, skillLimit);
    }
    const skillsObj = selected.reduce((acc, key) => {
      acc[key] = { proficient: true };
      return acc;
    }, {});
    setSkillSelections(selected);
    setAddFeat((prev) => {
      const prevSkills = { ...(prev.skills || {}) };
      const mergedSkills = { ...prevSkills, ...skillsObj };
      Object.keys(mergedSkills).forEach((key) => {
        if (!selected.includes(key)) {
          delete mergedSkills[key];
        }
      });
      return {
        ...prev,
        skills: mergedSkills,
      };
    });
  };

  // ---------------------------------------Feats left-----------------------------------------------------
  const featPointsLeft = calculateFeatPointsLeft(form.occupation, form.feat);
  const showFeatBtn = featPointsLeft > 0 ? "" : "none";
  const characterLevel = Math.max(0, ...(form.occupation || []).map((entry) => Number(entry.Level) || 0));
  const featStatus = useCallback((item) => {
    if (form.feat.some((owned) => owned.featName === item.featName)) return { key: 'owned', label: 'Owned', reason: 'Already part of your legend.' };
    const requiredLevel = Number(item.minLevel || item.requiredLevel || 0);
    if (requiredLevel > characterLevel) return { key: 'locked', label: 'Locked', reason: `Requires Level ${requiredLevel}` };
    if (featPointsLeft <= 0) return { key: 'unavailable', label: 'Unavailable', reason: 'No feat selections remaining.' };
    return { key: 'available', label: 'Available', reason: requirementsFor(item).join(' • ') || 'Ready to unlock.' };
  }, [characterLevel, featPointsLeft, form.feat]);
  const filteredFeats = useMemo(() => feat.feat.filter((item) => {
    const status = featStatus(item);
    const query = `${item.featName} ${item.notes || ''} ${categoryFor(item)} ${requirementsFor(item).join(' ')}`.toLowerCase();
    return query.includes(search.toLowerCase()) && (filter === 'All Feats' || filter === categoryFor(item) || (filter === 'Ability Score Increase' && (bonusesFor(item).length || item.abilityIncreaseOptions)) || (filter === 'Owned' && status.key === 'owned') || (filter === 'Available' && status.key === 'available') || (filter === 'Locked' && status.key === 'locked'));
  }).sort((a, b) => a.featName.localeCompare(b.featName)), [feat.feat, featStatus, filter, search]);

  // ----------------------------------------Fetch Feats-----------------------------------
  useEffect(() => {
    async function fetchFeats() {
      const response = await apiFetch(`/feats`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setNotification({ variant: 'danger', message });
        return;
      }

      const record = await response.json();
      if (!record) {
        setNotification({ variant: 'danger', message: 'Record not found' });
        navigate(`/`);
        return;
      }
      setFeat({ feat: record });
    }
    fetchFeats();
    return;
  }, [navigate]);

  async function addFeatToDb(e) {
    e.preventDefault();
    if (!addFeat) return;
    let updatedFeats;
    if (addFeat.featName === 'Stat Increase') {
      updatedFeats = [...form.feat, addFeat];
    } else {
      const existingIndex = form.feat.findIndex(
        (f) => f.featName === addFeat.featName
      );
      if (existingIndex >= 0) {
        updatedFeats = [...form.feat];
        updatedFeats[existingIndex] = addFeat;
      } else {
        updatedFeats = [...form.feat, addFeat];
      }
    }
    await apiFetch(`/feats/update/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feat: updatedFeats,
        skills: addFeat.skills || {},
        featName: addFeat.featName,
      }),
    }).catch((error) => {
      setNotification({ variant: 'danger', message: error.toString() });
      return;
    });
    navigate(0);
  }
  // This method will delete a feat
  function deleteFeats(index) {
    const updatedFeats = form.feat.filter((_, i) => i !== index);
    addDeleteFeatToDb(updatedFeats);
  }
  let showDeleteFeatBtn = "";
  if (form.feat.length === 0) {
    showDeleteFeatBtn = "none";
  }
  async function addDeleteFeatToDb(newFeatForm) {
    await apiFetch(`/feats/update/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feat: newFeatForm,
      }),
    })
      .catch((error) => {
        setNotification({ variant: 'danger', message: error.toString() });
        return;
      });
    setNotification({ variant: 'success', message: 'Feat Deleted' });
    setTimeout(() => navigate(0), 1000);
  }

  const abilityLabels = ['STR','DEX','CON','INT','WIS','CHA'];
  const extraAbilityLabels = [
    { label: 'Initiative', key: 'initiative' },
    { label: 'AC', key: 'ac' },
    { label: 'Speed', key: 'speed' },
    { label: 'HP Max Bonus', key: 'hpMaxBonus' },
    { label: 'HP Max Bonus/Level', key: 'hpMaxBonusPerLevel' },
  ];

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--feats');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    handleCloseFeats?.();
  }, [handleCloseFeats, isDocked, onDockClose]);

  return (
    <div>
      {notification && (
        <Alert variant={notification.variant} className="m-2">
          {notification.message}
        </Alert>
      )}
      {/* -----------------------------------------Feats Render------------------------------------------------------------------------------------------------------------------------------------ */}
      <Modal
        className={modalClassName}
        show={showFeats}
        onHide={handleModalHide}
        size="lg"
        centered={!isDocked}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
        <div className="text-center">
          <Card className="modern-card">
        <Card.Header className="modal-header">
          <DockControls
            dockedSide={dockedSide}
            onDockChange={onDockChange}
            isDocked={isDocked}
          />
          <Card.Title className="modal-title">Feats</Card.Title>
        </Card.Header>
            <Card.Body className="feats-library__body">
              <section className="feats-library__hero">
                <div><span className="feats-library__eyebrow">Heroic progression</span><h2>Feat Library</h2><p>Choose a legend-defining talent for your next milestone.</p></div>
                <div className="feats-library__points"><Sparkles size={18} /><strong id="featPointLeft">{featPointsLeft}</strong><span>{featPointsLeft === 1 ? 'selection remaining' : 'selections remaining'}</span></div>
              </section>
              <div className="feats-library__toolbar">
                <label className="feats-search"><Search size={18} /><span className="visually-hidden">Search feats</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search feats, benefits, and requirements…" /></label>
              </div>
              <div className="feats-library__layout">
                <aside className="feats-sidebar" aria-label="Feat filters"><span className="feats-sidebar__label">Browse collection</span>{['All Feats', 'Combat', 'Magic', 'Defensive', 'Ability Score Increase', 'Available', 'Locked', 'Owned'].map((item) => <button type="button" key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</aside>
                <section className="feats-grid" aria-live="polite">{filteredFeats.map((item) => { const status = featStatus(item); const category = categoryFor(item); const Icon = category === 'Combat' ? Sword : category === 'Magic' ? WandSparkles : category === 'Defensive' ? Shield : Sparkles; const selected = selectedFeatData?.featName === item.featName; return <button type="button" key={item.featName} className={`feat-library-card feat-library-card--${status.key}${selected ? ' is-selected' : ''}`} onClick={() => handleSelectFeat({ target: { value: item.featName } })} aria-pressed={selected}><span className="feat-library-card__art"><Icon size={30} /></span><span className="feat-library-card__topline"><span>{category}</span><span className={`feat-status feat-status--${status.key}`}>{status.key === 'owned' ? <Check size={13} /> : status.key !== 'available' ? <Lock size={13} /> : <Sparkles size={13} />}{status.label}</span></span><strong>{item.featName}</strong><span className="feat-library-card__description">{descriptionFor(item.notes)}</span><span className="feat-library-card__badges">{bonusesFor(item).map(({ ability, value }) => <span key={ability} className={`ability-chip ability-chip--${ability}`}>+{value} {ability.toUpperCase()}</span>)}{requirementsFor(item).slice(0, 1).map((requirement) => <span key={requirement} className="requirement-chip">{requirement}</span>)}</span></button>; })}{!filteredFeats.length && <div className="feats-empty">No feats match this search. Try a different term or filter.</div>}</section>
                <aside className="feat-inspector" aria-label="Feat inspector">{selectedFeatData ? <><button type="button" className="feat-inspector__close" onClick={() => { setSelectedFeatData(null); setChosenFeat(''); }} aria-label="Close feat inspector"><X size={18} /></button><div className="feat-inspector__art"><Sparkles size={40} /></div><span className="feats-library__eyebrow">{categoryFor(selectedFeatData)} feat</span><h3>{selectedFeatData.featName}</h3><p>{descriptionFor(selectedFeatData.notes)}</p><div className="feat-inspector__section"><b>Ability bonuses</b><div>{bonusesFor(addFeat || selectedFeatData).length ? bonusesFor(addFeat || selectedFeatData).map(({ ability, value }) => <span key={ability} className={`ability-chip ability-chip--${ability}`}>+{value} {ability.toUpperCase()}</span>) : <span className="muted">No direct ability increase.</span>}</div></div><div className="feat-inspector__section"><b>Requirements</b>{requirementsFor(selectedFeatData).length ? requirementsFor(selectedFeatData).map((requirement) => <span key={requirement} className="requirement-row"><Check size={15} /> {requirement}</span>) : <span className="requirement-row"><Check size={15} /> No prerequisites</span>}<span className={`feat-inspector__reason feat-inspector__reason--${featStatus(selectedFeatData).key}`}>{featStatus(selectedFeatData).reason}</span></div><Form onSubmit={addFeatToDb}>{featStatus(selectedFeatData).key === 'owned' && <Button type="button" className="action-btn feat-inspector__remove" onClick={() => deleteFeats(form.feat.findIndex((item) => item.featName === selectedFeatData.featName))}>Remove feat</Button>}{selectedFeatData.abilityIncreaseOptions?.map((option, idx) => { const abilities = Array.isArray(option) ? option : option.abilities || []; return <Form.Group className="feat-choice" key={idx}><Form.Label>Choose an ability increase</Form.Label><Form.Select value={abilitySelections[idx] || ''} onChange={(event) => handleAbilityChoice(idx, event.target.value)}><option value="" disabled>Select ability</option>{abilities.map((opt) => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}</Form.Select></Form.Group>; })}{hasSkillChoice && <Form.Group className="feat-choice"><Form.Label>Skill/Tool Proficiencies (choose up to {skillLimit})</Form.Label><Form.Select multiple value={skillSelections} onChange={handleSkillChoice}>{ALL_SKILLS.map(({ key, label }) => { const selected = skillSelections.includes(key); return <option key={key} value={key} disabled={!selected && (skillSelections.length >= skillLimit || existingProficiencies.has(key))}>{label}</option>; })}</Form.Select></Form.Group>}<Button disabled={featStatus(selectedFeatData).key !== 'available' || (selectedFeatData.abilityIncreaseOptions && Object.keys(abilitySelections).length !== selectedFeatData.abilityIncreaseOptions.length) || (hasSkillChoice && skillSelections.length === 0)} className="action-btn feat-inspector__action" type="submit">{featStatus(selectedFeatData).key === 'locked' ? 'Requirement not met' : featStatus(selectedFeatData).key === 'unavailable' ? 'No selections remaining' : 'Select feat'}</Button></Form></> : <div className="feat-inspector__placeholder"><Sparkles size={32} /><b>Choose a feat</b><span>Explore the library, then inspect a feat to make it part of your story.</span></div>}</aside>
              </div>
            </Card.Body>
            <Card.Footer className="modal-footer feats-library__footer">
              <Button className="action-btn close-btn" onClick={handleModalHide}>
                Close
              </Button>
            </Card.Footer>
          </Card>
          <Modal className="dnd-modal modern-modal" show={showFeatNotes} onHide={handleCloseFeatNotes} size="lg" centered>
              <Card className="modern-card text-center">
                <Card.Header className="modal-header">
                  <Card.Title className="modal-title">{modalFeatData.featName}</Card.Title>
                </Card.Header>
                <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>{modalFeatData.notes}</Card.Body>
                <Card.Footer className="modal-footer">
                  <Button className="action-btn close-btn" onClick={handleCloseFeatNotes}>
                    Close
                  </Button>
                </Card.Footer>
              </Card>
          </Modal>
        </div>
      </Modal>
    </div>
  );
}
