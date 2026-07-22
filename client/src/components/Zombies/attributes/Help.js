import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Alert, Form } from 'react-bootstrap';
import { useNavigate, useParams } from "react-router-dom";
import CampaignModals from "../components/CampaignModals";
import useCampaignActions from "../hooks/useCampaignActions";
import DockControls from '../components/DockControls';
import {
  applyDiceFaceColor,
  DEFAULT_DICE_COLOR,
  normalizeDiceColor,
} from '../../../utils/diceColors';
import { setDiceBoxTheme, setDiceBoxThemeColor } from '../../../utils/diceBoxManager';

const DICE_THEME_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Classic RealmTracker dice with crisp arcane faces.' },
  { value: 'rust', label: 'Rust', description: 'Weathered metal and ember-worn edges.' },
  { value: 'diceOfRolling', label: 'Dice of Rolling', description: 'A magical premium dice set for dramatic rolls.' },
  { value: 'gemstone', label: 'Gemstone', description: 'Polished jewel tones with high contrast facets.' },
  { value: 'wooden', label: 'Wooden', description: 'Warm carved wood for grounded tabletop sessions.' },
  { value: 'smooth', label: 'Smooth', description: 'Clean, minimal faces for fast readability.' },
  { value: 'rock', label: 'Rock', description: 'Rough-hewn stone for dungeon delves.' },
  { value: 'blueGreenMetal', label: 'Blue Green Metal', description: 'Cool metallic teal with bright magical highlights.' },
];

const DEFAULT_DICE_THEME = DICE_THEME_OPTIONS[0].value;
const DICE_PRESETS = ['#4ea1ff', '#7c5cff', '#d8b76a', '#23d18b', '#ff6b6b', '#f59e0b', '#f8fafc', '#111827'];

const SETTINGS_SECTIONS = [
  { id: 'appearance', label: 'Appearance', eyebrow: 'Interface', icon: '✦' },
  { id: 'dice', label: 'Dice', eyebrow: 'Roller', icon: '⚂' },
  { id: 'help', label: 'Help', eyebrow: 'Guides', icon: '?' },
  { id: 'campaign', label: 'Campaign', eyebrow: 'Adventures', icon: '⌁' },
  { id: 'account', label: 'Account', eyebrow: 'Session', icon: '◎' },
  { id: 'character', label: 'Character', eyebrow: 'Danger zone', icon: '!' },
];

const HELP_TOPICS = [
  { title: 'Getting started', body: 'Use the character bar to move between sheet areas, roll from abilities and attacks, and keep campaign tools docked when you need them.' },
  { title: 'Dice roller guide', body: 'Choose a dice theme and face color here. The preview updates immediately, then Save dice appearance persists it to this character.' },
  { title: 'Combat controls', body: 'The combat HUD keeps quick actions, dice, health, and active combat information close to the bottom edge of the sheet.' },
  { title: 'Death saves', body: 'When your character reaches 0 HP, track death save successes and failures from the health and combat areas until stabilized or healed.' },
  { title: 'Inventory & equipment', body: 'Manage carried items separately from equipped weapons, armor, and accessories so combat values stay readable.' },
  { title: 'Campaign joining', body: 'Use Join Campaign to enter an existing adventure, Host Campaign to launch a DM session, or Create Campaign to build a new one.' },
  { title: 'How do I change my figurine?', body: 'Open Character Info and look for figurine or token artwork controls. Those changes are separate from dice appearance.' },
];

const normalizeDiceTheme = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_DICE_THEME;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_DICE_THEME;
  }

  const lower = trimmed.toLowerCase();
  const match = DICE_THEME_OPTIONS.find((option) => option.value.toLowerCase() === lower);
  return match ? match.value : DEFAULT_DICE_THEME;
};

function SettingsCard({ icon, title, description, children, className = '' }) {
  return (
    <section className={`settings-help-card ${className}`.trim()}>
      <div className="settings-help-card__copy">
        <span className="settings-help-card__icon" aria-hidden="true">{icon}</span>
        <div>
          <h4>{title}</h4>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children && <div className="settings-help-card__control">{children}</div>}
    </section>
  );
}

export default function Help({
  form,
  showHelpModal,
  handleCloseHelpModal,
  onDiceColorChange,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const params = useParams();
  const navigate = useNavigate();
  const {
    notification: campaignNotification,
    clearNotification,
    playerCampaigns,
    dmCampaigns,
    showJoinCampaignModal,
    showHostCampaignModal,
    showCreateCampaignModal,
    openJoinCampaignModal,
    closeJoinCampaignModal,
    openHostCampaignModal,
    closeHostCampaignModal,
    openCreateCampaignModal,
    closeCreateCampaignModal,
    createCampaignForm,
    updateCreateCampaignForm,
    submitCreateCampaign,
  } = useCampaignActions();

  const characterName = form?.characterName || form?.name || 'this character';
  const initialColor = normalizeDiceColor(form?.diceColor) || DEFAULT_DICE_COLOR;
  const [activeSection, setActiveSection] = useState('appearance');
  const [newColor, setNewColor] = useState(initialColor);
  const [newTheme, setNewTheme] = useState(() => normalizeDiceTheme(form?.diceTheme));
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDeleteCharacter, setShowDeleteCharacter] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const themeOptions = useMemo(() => DICE_THEME_OPTIONS, []);

  const persistedColor = normalizeDiceColor(form?.diceColor) || DEFAULT_DICE_COLOR;
  const persistedTheme = normalizeDiceTheme(form?.diceTheme);
  const hasDiceChanges = newColor !== persistedColor || newTheme !== persistedTheme;

  useEffect(() => {
    applyDiceFaceColor(newColor);
    setDiceBoxThemeColor(newColor);
  }, [newColor]);

  useEffect(() => {
    setDiceBoxTheme(newTheme);
  }, [newTheme]);

  useEffect(() => {
    const normalized = normalizeDiceColor(form?.diceColor);
    setNewColor(normalized || DEFAULT_DICE_COLOR);
  }, [form?.diceColor]);

  useEffect(() => {
    setNewTheme(normalizeDiceTheme(form?.diceTheme));
  }, [form?.diceTheme]);

  const handleColorChange = (event) => {
    const selectedColor = event?.target?.value;
    if (typeof selectedColor === 'string') {
      setNewColor(selectedColor);
      setSaveStatus('unsaved');
    }
  };

  const handleThemeChange = (selectedTheme) => {
    setNewTheme(normalizeDiceTheme(selectedTheme));
    setSaveStatus('unsaved');
  };

  async function diceColorUpdate() {
    const normalizedColor = normalizeDiceColor(newColor);
    if (!normalizedColor) {
      setSaveStatus('error');
      return;
    }

    const normalizedTheme = normalizeDiceTheme(newTheme);
    setSaveStatus('saving');

    try {
      const response = await apiFetch(`/characters/update-dice-color/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diceColor: normalizedColor, diceTheme: normalizedTheme }),
      });

      if (!response.ok) {
        setSaveStatus('error');
        return;
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      const nextColor = normalizeDiceColor(payload?.diceColor) || normalizedColor;
      let nextTheme = normalizedTheme;
      if (payload && Object.prototype.hasOwnProperty.call(payload, 'diceTheme')) {
        nextTheme = normalizeDiceTheme(payload?.diceTheme);
      }
      setNewColor(nextColor);
      setNewTheme(nextTheme);
      setSaveStatus('saved');

      if (typeof onDiceColorChange === 'function') {
        onDiceColorChange(nextColor, nextTheme);
      }
    } catch (error) {
      setSaveStatus('error');
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await apiFetch('/logout', { method: 'POST' });
    window.location.assign('/');
  }

  async function deleteRecord() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await apiFetch(`/characters/delete-character/${params.id}`, { method: 'DELETE' });
      if (!response.ok) {
        setDeleteError('Unable to delete character. Please try again.');
        setIsDeleting(false);
        return;
      }
      navigate(`/zombies-character-select/${form.campaign}`);
    } catch (error) {
      setDeleteError('Unable to delete character. Please try again.');
      setIsDeleting(false);
    }
  }

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return 'settings-help-dialog';
    }

    const classes = ['docked-modal', 'settings-help-dialog'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--help');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal', 'settings-help-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      onDockClose?.();
      return;
    }
    handleCloseHelpModal?.();
  }, [handleCloseHelpModal, isDocked, onDockClose]);

  const saveText = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Dice appearance saved' : saveStatus === 'error' ? 'Unable to save settings' : hasDiceChanges ? 'Unsaved dice changes' : 'Settings up to date';
  const canDelete = deleteConfirmName.trim() === characterName.trim();

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'appearance':
        return (
          <div className="settings-help-section">
            <p className="settings-help-section__lead">Choose the visual style used by the 3D dice roller. Theme changes preview immediately and are saved with your dice appearance.</p>
            <div className="theme-preview-grid" role="radiogroup" aria-label="Dice theme">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`theme-preview-card ${newTheme === option.value ? 'theme-preview-card--selected' : ''}`}
                  onClick={() => handleThemeChange(option.value)}
                  role="radio"
                  aria-checked={newTheme === option.value}
                >
                  <span className={`theme-preview-card__swatch theme-preview-card__swatch--${option.value}`} aria-hidden="true" />
                  <span className="theme-preview-card__name">{option.label}</span>
                  <span className="theme-preview-card__description">{option.description}</span>
                  {newTheme === option.value && <span className="theme-preview-card__selected">Selected</span>}
                </button>
              ))}
            </div>
          </div>
        );
      case 'dice':
        return (
          <div className="settings-help-section">
            <p className="settings-help-section__lead">Customize the dice face color with a live d20 preview, then save the appearance to this character.</p>
            <SettingsCard icon="⚂" title="Dice appearance" description="Color and theme update the roller immediately for previewing.">
              <div className="dice-appearance-panel">
                <div className="dice-preview" style={{ '--dice-preview-color': newColor }} aria-label={`Dice preview using ${newColor}`}>
                  <span className="dice-preview__shape">20</span>
                  <span className="dice-preview__label">Live d20 preview</span>
                </div>
                <div className="dice-controls">
                  <Form.Label htmlFor="diceColorPicker">Custom color</Form.Label>
                  <input id="diceColorPicker" className="dice-color-input" type="color" value={newColor} onChange={handleColorChange} />
                  <div className="dice-preset-grid" aria-label="Preset dice colors">
                    {DICE_PRESETS.map((color) => (
                      <button key={color} type="button" className="dice-preset" style={{ '--preset-color': color }} onClick={() => handleColorChange({ target: { value: color } })} aria-label={`Use ${color}`} aria-pressed={newColor === color} />
                    ))}
                  </div>
                  <div className="settings-help-actions">
                    <Button variant="outline-light" onClick={() => handleColorChange({ target: { value: DEFAULT_DICE_COLOR } })}>Reset color</Button>
                    <Button onClick={diceColorUpdate} disabled={!hasDiceChanges || saveStatus === 'saving'}>{saveStatus === 'saving' ? 'Saving…' : 'Save dice appearance'}</Button>
                  </div>
                  <p className={`settings-save-status settings-save-status--${saveStatus}`} role="status">{saveText}</p>
                </div>
              </div>
            </SettingsCard>
          </div>
        );
      case 'help':
        return (
          <div className="settings-help-section">
            <p className="settings-help-section__lead">Quick answers for common character sheet and campaign questions.</p>
            <div className="help-topic-list">
              {HELP_TOPICS.map((topic) => (
                <details className="help-topic-card" key={topic.title}>
                  <summary>{topic.title}</summary>
                  <p>{topic.body}</p>
                </details>
              ))}
            </div>
          </div>
        );
      case 'campaign':
        return (
          <div className="settings-help-section">
            <p className="settings-help-section__lead">Move between player and Dungeon Master campaign workflows.</p>
            <div className="campaign-action-grid">
              <SettingsCard icon="➹" title="Join Campaign" description="Find and enter an existing adventure."><Button onClick={openJoinCampaignModal}>Join</Button></SettingsCard>
              <SettingsCard icon="♜" title="Host Campaign" description="Launch one of your campaigns as Dungeon Master."><Button onClick={openHostCampaignModal}>Host</Button></SettingsCard>
              <SettingsCard icon="✧" title="Create Campaign" description="Build a new campaign for your party."><Button onClick={openCreateCampaignModal}>Create</Button></SettingsCard>
            </div>
          </div>
        );
      case 'account':
        return (
          <div className="settings-help-section">
            <SettingsCard icon="◎" title="Signed-in session" description="Log out of RealmTracker on this device. Unsaved character edits elsewhere should be saved first.">
              <Button variant="outline-warning" onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? 'Logging out…' : 'Logout'}</Button>
            </SettingsCard>
          </div>
        );
      case 'character':
        return (
          <div className="settings-help-section">
            <SettingsCard icon="!" title="Danger Zone" description={`Delete ${characterName} permanently. This action cannot be undone.`} className="settings-help-card--danger">
              <Button variant="danger" onClick={() => setShowDeleteCharacter(true)}>Delete Character</Button>
            </SettingsCard>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Modal className={modalClassName} size="xl" aria-labelledby="settings-help-title" centered={!isDocked} show={showHelpModal} onHide={handleModalHide} backdrop={isDocked ? false : true} enforceFocus={!isDocked} restoreFocus={!isDocked} dialogClassName={dialogClassName}>
        <Card className="modern-card settings-help-shell">
          <Card.Header className="modal-header settings-help-header">
            <DockControls dockedSide={dockedSide} onDockChange={onDockChange} isDocked={isDocked} />
            <div className="settings-help-title-block">
              <Card.Title id="settings-help-title" className="modal-title">Settings & Help</Card.Title>
              <p>Player preferences, guidance, campaigns, account, and character safety.</p>
            </div>
          </Card.Header>
          <Card.Body className="settings-help-body">
            {campaignNotification && <Alert variant="danger" dismissible onClose={clearNotification} className="mb-3">{campaignNotification}</Alert>}
            <div className="settings-help-layout">
              <nav className="settings-help-sidebar" aria-label="Settings sections">
                {SETTINGS_SECTIONS.map((section) => (
                  <button key={section.id} type="button" className={`settings-help-nav-item ${activeSection === section.id ? 'settings-help-nav-item--active' : ''}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? 'page' : undefined}>
                    <span className="settings-help-nav-item__icon" aria-hidden="true">{section.icon}</span>
                    <span><strong>{section.label}</strong><small>{section.eyebrow}</small></span>
                  </button>
                ))}
              </nav>
              <main className="settings-help-content" tabIndex={-1}>
                <div className="settings-help-content__heading">
                  <span>{SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.eyebrow}</span>
                  <h3>{SETTINGS_SECTIONS.find((section) => section.id === activeSection)?.label}</h3>
                </div>
                {renderSection(activeSection)}
              </main>
            </div>
          </Card.Body>
          <Card.Footer className="modal-footer settings-help-footer">
            <Button className="action-btn close-btn" onClick={handleModalHide}>Close</Button>
          </Card.Footer>
        </Card>
      </Modal>
      <Modal className="dnd-modal modern-modal delete-character-modal" size="md" aria-labelledby="delete-character-title" centered show={showDeleteCharacter} onHide={() => setShowDeleteCharacter(false)}>
        <Card className="modern-card">
          <Card.Header className="modal-header"><Card.Title id="delete-character-title" className="modal-title">Confirm Character Deletion</Card.Title></Card.Header>
          <Card.Body>
            <div className="delete-character-confirmation">
              <div className="delete-character-confirmation__portrait" aria-hidden="true">{String(characterName).charAt(0).toUpperCase()}</div>
              <h3>Delete {characterName} permanently?</h3>
              <p>This removes the character and related campaign references. This action cannot be undone.</p>
              <Form.Group controlId="deleteCharacterName">
                <Form.Label>Type <strong>{characterName}</strong> to confirm.</Form.Label>
                <Form.Control value={deleteConfirmName} onChange={(event) => setDeleteConfirmName(event.target.value)} autoFocus autoComplete="off" />
              </Form.Group>
              {deleteError && <Alert variant="danger" role="alert">{deleteError}</Alert>}
            </div>
          </Card.Body>
          <Card.Footer className="modal-footer delete-character-footer">
            <Button variant="outline-light" onClick={() => setShowDeleteCharacter(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={deleteRecord} disabled={!canDelete || isDeleting}>{isDeleting ? 'Deleting…' : 'Delete Character'}</Button>
          </Card.Footer>
        </Card>
      </Modal>
      <CampaignModals playerCampaigns={playerCampaigns} dmCampaigns={dmCampaigns} showJoinCampaignModal={showJoinCampaignModal} closeJoinCampaignModal={closeJoinCampaignModal} showHostCampaignModal={showHostCampaignModal} closeHostCampaignModal={closeHostCampaignModal} showCreateCampaignModal={showCreateCampaignModal} closeCreateCampaignModal={closeCreateCampaignModal} createCampaignForm={createCampaignForm} updateCreateCampaignForm={updateCreateCampaignForm} submitCreateCampaign={submitCreateCampaign} />
    </div>
  );
}
