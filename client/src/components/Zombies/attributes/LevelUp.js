import React, { useState, useEffect, useMemo } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Modal, Alert, Form } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import useUser from '../../../hooks/useUser';
import { BARBARIAN_LEVEL_1_SKILLS, BARBARIAN_SUBCLASSES } from '../utils/barbarian';
import { SKILLS } from '../skillSchema';
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ClassCard, StatCard, SearchBar, ConfirmationDialog, Button } from '../common/HudPrimitives';
import { getAvailableLevelUpClasses, getAvailableNewClasses, getCharacterTotalLevel, getMulticlassSummary, validateAddClassSelection, validateLevelUpSelection } from './characterProgression';

export default function LevelUp({ show, handleClose, form }) {
  const params = useParams();
  const navigate = useNavigate();
  const user = useUser();
  const [step, setStep] = useState('choose-progression');
  const [selectedExistingClassId, setSelectedExistingClassId] = useState('');
  const [selectedNewClassId, setSelectedNewClassId] = useState('');
  const [classRecords, setClassRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barbarianSubclass, setBarbarianSubclass] = useState('path-of-the-berserker');
  const [primalKnowledgeSkill, setPrimalKnowledgeSkill] = useState('');

  const totalLevel = getCharacterTotalLevel(form);
  const levelUpClasses = useMemo(() => getAvailableLevelUpClasses(form), [form]);
  const newClasses = useMemo(() => getAvailableNewClasses(form, classRecords), [form, classRecords]);
  const filteredNewClasses = useMemo(() => newClasses.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase())), [newClasses, search]);
  const selectedExisting = levelUpClasses.find((entry) => entry.name === selectedExistingClassId);
  const selectedNew = newClasses.find((entry) => entry.name === selectedNewClassId);

  const resetFlow = () => {
    setStep('choose-progression');
    setSelectedExistingClassId('');
    setSelectedNewClassId('');
    setSearch('');
    setNotification('');
    setError('');
    setValidationError('');
    setIsSubmitting(false);
    setPrimalKnowledgeSkill('');
  };

  useEffect(() => {
    if (!show) resetFlow();
  }, [show]);

  useEffect(() => {
    if (!user || !show) return;
    async function fetchData() {
      try {
        const response = await apiFetch('/classes');
        if (!response.ok) {
          setError(`Class catalogue failed to load: ${response.statusText}`);
          return;
        }
        const record = await response.json();
        setClassRecords(Object.values(record || {}));
      } catch (err) {
        setError('Class catalogue failed to load.');
      }
    }
    fetchData();
  }, [show, user]);

  const close = () => {
    resetFlow();
    handleClose?.();
  };

  const requiresBarbarianPrimalSkill = selectedExistingClassId === 'Barbarian' && selectedExisting?.nextLevel === 3;
  const barbarianValidation = requiresBarbarianPrimalSkill && !primalKnowledgeSkill ? 'Choose a Primal Knowledge skill before leveling Barbarian.' : '';

  const levelExisting = async () => {
    const validation = validateLevelUpSelection(form, selectedExistingClassId);
    if (!validation.valid || barbarianValidation) {
      setValidationError(barbarianValidation || validation.message);
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    const selectedOccupationObject = form.occupation.find((occupation) => occupation.Occupation === selectedExistingClassId);
    const newLevel = Number(selectedOccupationObject.Level) + 1;
    const newHealth = Math.floor(Math.random() * Number(selectedOccupationObject.Health)) + 1 + Number(form.health);
    const updatedLevelForm = { selectedOccupation: selectedExistingClassId, level: newLevel, health: newHealth };
    if (selectedExistingClassId === 'Barbarian' && newLevel >= 3) {
      updatedLevelForm.barbarianSubclass = barbarianSubclass;
      if (newLevel === 3) updatedLevelForm.primalKnowledgeSkill = primalKnowledgeSkill;
    }
    try {
      await apiFetch(`/characters/update-level/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedLevelForm) });
      setNotification(`${form.name || 'Character'} is now a Level ${newLevel} ${selectedExistingClassId}.`);
      navigate(0);
    } catch (err) {
      setError('Level up failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const addNewClass = async () => {
    const validation = validateAddClassSelection(form, classRecords, selectedNewClassId);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/characters/multiclass/${params.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOccupation: selectedNewClassId }) });
      const data = await response.json();
      if (response.ok) {
        setNotification(`${form.name || 'Character'} added ${selectedNewClassId} and is now Level ${totalLevel + 1}.`);
        navigate(0);
      } else if (response.status === 400) {
        setValidationError(data.message || 'Multiclass validation failed');
        setIsSubmitting(false);
      } else {
        setError(data.message || 'Database update failed');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('Database update failed');
      setIsSubmitting(false);
    }
  };

  const skillLabels = Object.fromEntries(SKILLS.map((skill) => [skill.key, skill.label]));
  const currentSkills = form.skills || {};
  const alreadyProficient = new Set([
    ...Object.entries(currentSkills).filter(([, info]) => info?.proficient).map(([key]) => key),
    ...Object.entries(form.race?.skills || {}).filter(([, info]) => info?.proficient).map(([key]) => key),
    ...Object.entries(form.background?.skills || {}).filter(([, info]) => info?.proficient).map(([key]) => key),
  ]);
  const availablePrimalSkills = BARBARIAN_LEVEL_1_SKILLS.filter((skill) => !alreadyProficient.has(skill));

  return (
    <Modal className="dnd-modal modern-modal progression-modal" show={show} onHide={close} centered size="lg" restoreFocus>
      <ModalShell className="progression-shell">
        <ModalHeader
          title={step === 'add-class' ? 'Add a Class' : 'Level Up'}
          subtitle={step === 'add-class' ? `Choose a new class for ${form.name || 'this character'}.` : `Choose how ${form.name || 'this character'} advances to level ${totalLevel + 1}.`}
          actions={step === 'add-class' ? <Button variant="ghost" onClick={() => { setStep('choose-progression'); setSelectedNewClassId(''); }}>← Back</Button> : null}
        />
        <ModalBody className="progression-body">
          {notification && <Alert variant="success">{notification}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {validationError && <Alert variant="warning">{validationError}</Alert>}
          <div className="levelup-summary">
            <StatCard label="Total Level" value={`${totalLevel} → ${totalLevel + 1}`} detail="Progression preview" />
            <div className="levelup-summary__classes">{getMulticlassSummary(form)}</div>
          </div>
          {step === 'choose-progression' ? (
            <div className="levelup-choice-grid" role="list" aria-label="Progression choices">
              {levelUpClasses.map((entry) => (
                <ClassCard key={entry.name} type="button" selected={selectedExistingClassId === entry.name} disabled={entry.disabled} onClick={() => { setSelectedExistingClassId(entry.name); setSelectedNewClassId(''); setValidationError(''); }}>
                  <span className="class-card__icon" aria-hidden="true">✦</span>
                  <strong>{entry.name}</strong>
                  <span>{entry.disabled ? `Level ${entry.level}` : `Level ${entry.level} → ${entry.nextLevel}`}</span>
                  {entry.subclass && <small>{entry.subclass}</small>}
                  {entry.hitDie && <small>Hit Die {entry.hitDie}</small>}
                  {entry.disabled && <em>{entry.reason}</em>}
                </ClassCard>
              ))}
              <ClassCard type="button" className="realm-class-card--add" onClick={() => { setStep('add-class'); setSelectedExistingClassId(''); setValidationError(''); }}>
                <span className="class-card__icon" aria-hidden="true">＋</span>
                <strong>Add a New Class</strong>
                <span>Begin multiclassing into another discipline.</span>
                <small>Resulting total level: {totalLevel + 1}</small>
              </ClassCard>
            </div>
          ) : (
            <div className="add-class-step">
              <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search classes" aria-label="Search classes" />
              <div className="class-browser-grid">
                {filteredNewClasses.map((entry) => (
                  <ClassCard key={entry.name} type="button" selected={selectedNewClassId === entry.name} disabled={entry.disabled} onClick={() => { setSelectedNewClassId(entry.name); setValidationError(''); }}>
                    <span className="class-card__icon" aria-hidden="true">◆</span>
                    <strong>{entry.name}</strong>
                    <span>{entry.description || 'Adventuring discipline'}</span>
                    {entry.primaryAbility && <small>Primary: {entry.primaryAbility}</small>}
                    {entry.hitDie && <small>Hit Die: {entry.hitDie}</small>}
                    {entry.disabled && <em>{entry.reason}</em>}
                  </ClassCard>
                ))}
              </div>
              <ConfirmationDialog className="selected-class-preview" aria-live="polite">
                <strong>{selectedNew ? selectedNew.name : 'Select a class to preview the result.'}</strong>
                <p>{selectedNew ? `${form.name || 'Character'} will add ${selectedNew.name} 1 and become total level ${totalLevel + 1}. Class feature and subclass choices continue in the existing character progression flow when supported.` : 'Duplicate classes are disabled and backend multiclass validation still applies on confirmation.'}</p>
              </ConfirmationDialog>
            </div>
          )}
          {selectedExistingClassId === 'Barbarian' && selectedExisting?.nextLevel >= 3 && (
            <div className="barbarian-followup">
              <Form.Group>
                <Form.Label>Barbarian Subclass</Form.Label>
                <Form.Select value={barbarianSubclass} onChange={(event) => setBarbarianSubclass(event.target.value)}>
                  {BARBARIAN_SUBCLASSES.map((subclass) => <option key={subclass.id} value={subclass.id}>{subclass.name}</option>)}
                </Form.Select>
              </Form.Group>
              {requiresBarbarianPrimalSkill && <Form.Group><Form.Label>Primal Knowledge Skill</Form.Label><Form.Select value={primalKnowledgeSkill} onChange={(event) => setPrimalKnowledgeSkill(event.target.value)}><option value="" disabled>Select one skill</option>{availablePrimalSkills.map((skill) => <option key={skill} value={skill}>{skillLabels[skill] || skill}</option>)}</Form.Select></Form.Group>}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="progression-footer">
          {step === 'add-class' ? <Button variant="ghost" onClick={() => setStep('choose-progression')}>Back</Button> : <Button variant="ghost" onClick={close}>Cancel</Button>}
          <Button variant="primary" onClick={step === 'add-class' ? addNewClass : levelExisting} disabled={isSubmitting || (step === 'add-class' ? !selectedNewClassId : !selectedExistingClassId) || Boolean(barbarianValidation)}>
            {isSubmitting ? 'Saving…' : step === 'add-class' ? 'Confirm Class' : 'Confirm Level Up'}
          </Button>
        </ModalFooter>
      </ModalShell>
    </Modal>
  );
}
