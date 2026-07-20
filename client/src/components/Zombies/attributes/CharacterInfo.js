import React, { useState, useMemo, useCallback } from "react";
import { Modal } from "react-bootstrap";
import DockControls from '../components/DockControls';
import LevelUp from "./LevelUp";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, Section, StatCard, ActionCard, ClassCard, Button } from "../common/HudPrimitives";
import { getCharacterTotalLevel, getMulticlassSummary } from "./characterProgression";

export default function CharacterInfo({
  form,
  show,
  handleClose,
  onShowBackground,
  onLongRest = () => {},
  onShortRest = () => {},
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
  characterFigurine,
  handleOpenTokenPicker,
  tokenPickerSaving = false,
}) {
  const totalLevel = getCharacterTotalLevel(form);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  const handleShowLevelUpModal = () => {
    setShowLevelUpModal(true);
  };

  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
  };

  const raceLanguages = (form.race?.languages || [])
    .filter((language) => language && !language.includes("Choice"))
    .join(", ");

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--characterInfo');
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

    handleClose?.();
  }, [handleClose, isDocked, onDockClose]);

  const raceName = form?.race?.name?.toLowerCase?.();
  const isDragonborn = raceName === 'dragonborn';
  const isGoliath = raceName === 'goliath';
  const isElf = raceName === 'elf';
  const isTiefling = raceName === 'tiefling';
  const dragonAncestries = isDragonborn ? form?.race?.dragonAncestries || {} : {};
  const giantAncestries = isGoliath ? form?.race?.giantAncestries || {} : {};
  const elvenLineages = isElf ? form?.race?.elvenLineages || {} : {};
  const tieflingLegacies = isTiefling
    ? form?.race?.fiendishLegacies || {}
    : {};
  const goliathAncestry = isGoliath
    ? form?.race?.selectedAncestry ||
      (form?.race?.selectedAncestryKey && giantAncestries
        ? giantAncestries[form.race.selectedAncestryKey]
        : null) ||
      form?.giantAncestry ||
      (form?.giantAncestryKey && giantAncestries
        ? giantAncestries[form.giantAncestryKey]
        : null)
    : null;
  const goliathAncestryName = goliathAncestry
    ? goliathAncestry.ancestryName ||
      goliathAncestry.name ||
      goliathAncestry.label ||
      "Giant Ancestry"
    : null;
  const dragonbornAncestry = isDragonborn
    ? form?.race?.selectedAncestry ||
      (form?.race?.selectedAncestryKey && dragonAncestries
        ? dragonAncestries[form.race.selectedAncestryKey]
        : null) ||
      form?.dragonAncestry ||
      (form?.dragonAncestryKey && dragonAncestries
        ? dragonAncestries[form.dragonAncestryKey]
        : null)
    : null;
  const dragonbornAncestryName = dragonbornAncestry
    ? dragonbornAncestry.label ||
      dragonbornAncestry.ancestryName ||
      dragonbornAncestry.name ||
      form?.dragonAncestryKey ||
      form?.race?.selectedAncestryKey ||
      "Draconic Ancestry"
    : null;
  const elvenLineage = isElf
    ? form?.race?.selectedAncestry ||
      (form?.race?.selectedAncestryKey && elvenLineages
        ? elvenLineages[form.race.selectedAncestryKey]
        : null) ||
      form?.elvenLineage ||
      (form?.elvenLineageKey && elvenLineages
        ? elvenLineages[form.elvenLineageKey]
        : null)
    : null;
  const elvenLineageName = elvenLineage
    ? elvenLineage.label || elvenLineage.name || 'Elven Lineage'
    : null;
  const tieflingLegacy = isTiefling
    ? form?.race?.selectedAncestry ||
      (form?.race?.selectedAncestryKey && tieflingLegacies
        ? tieflingLegacies[form.race.selectedAncestryKey]
        : null) ||
      form?.tieflingLegacy ||
      (form?.tieflingLegacyKey && tieflingLegacies
        ? tieflingLegacies[form.tieflingLegacyKey]
        : null)
    : null;
  const tieflingLegacyName = tieflingLegacy
    ? tieflingLegacy.label || tieflingLegacy.name || 'Fiendish Legacy'
    : null;
  const tieflingLegacyAbility = (() => {
    const fromForm =
      typeof form?.tieflingLegacyAbility === 'string'
        ? form.tieflingLegacyAbility.trim()
        : '';
    if (fromForm) {
      return fromForm;
    }
    const fromRace =
      typeof form?.race?.selectedLineageAbility === 'string'
        ? form.race.selectedLineageAbility.trim()
        : '';
    return fromRace;
  })();
  const tieflingLegacyResistance = (() => {
    const fromRace =
      typeof form?.race?.selectedFiendishLegacyResistance === 'string'
        ? form.race.selectedFiendishLegacyResistance.trim()
        : '';
    if (fromRace) {
      return fromRace;
    }
    const fromLegacy =
      typeof tieflingLegacy?.resistance === 'string'
        ? tieflingLegacy.resistance.trim()
        : '';
    return fromLegacy;
  })();
  const tieflingLegacySubtext = (() => {
    if (!isTiefling) {
      return null;
    }
    const parts = [];
    if (tieflingLegacyName) {
      parts.push(tieflingLegacyName);
    }
    if (tieflingLegacyResistance) {
      parts.push(`Resistance: ${tieflingLegacyResistance}`);
    }
    if (tieflingLegacyAbility) {
      parts.push(`Spellcasting Ability: ${tieflingLegacyAbility}`);
    }
    return parts.length ? parts.join(' • ') : null;
  })();
  const displaySize =
    form?.temporarySize || form?.size || form?.height || "—";
  const hasFigurineSelection = Boolean(
    characterFigurine?.figurineImageUrl || characterFigurine?.figurineImagePublicId
  );
  const canOpenTokenPicker = typeof handleOpenTokenPicker === 'function';
  const isFigurineButtonDisabled = tokenPickerSaving || !canOpenTokenPicker;

  const figurineButtonLabel = tokenPickerSaving
    ? 'Updating Figurine...'
    : hasFigurineSelection
    ? 'Change Figurine'
    : 'Choose Figurine';

  const handleFigurineButtonClick = useCallback(() => {
    if (tokenPickerSaving || !canOpenTokenPicker) {
      return;
    }

    handleOpenTokenPicker();
  }, [canOpenTokenPicker, handleOpenTokenPicker, tokenPickerSaving]);

  const sortedClasses = [...(form.occupation || [])].sort((a, b) => Number(b.Level || 0) - Number(a.Level || 0));
  const primaryClass = sortedClasses[0]?.Occupation || 'Adventurer';
  const characterName = form.name || form.characterName || 'Unnamed Hero';

  return (
    <Modal
      className={`${modalClassName} character-info-modal`}
      show={show}
      onHide={handleModalHide}
      size="xl"
      centered={!isDocked}
      scrollable
      backdrop={isDocked ? false : true}
      enforceFocus={!isDocked}
      restoreFocus={!isDocked}
      dialogClassName={dialogClassName}
    >
      <ModalShell className="character-info-shell">
        <ModalHeader
          title="Character Overview"
          subtitle={`${primaryClass} dossier`}
          actions={
            <DockControls
              dockedSide={dockedSide}
              onDockChange={onDockChange}
              isDocked={isDocked}
            />
          }
        >
          <div className="character-summary-header">
            <div className="character-summary-header__portrait" aria-live="polite">
              {characterFigurine?.figurineImageUrl ? (
                <img src={characterFigurine.figurineImageUrl} alt="Selected figurine token" />
              ) : (
                <i className="fas fa-chess-king" aria-hidden="true"></i>
              )}
            </div>
            <div className="character-summary-header__copy">
              <h3>{characterName}</h3>
              <p>{form.race?.name || 'Unknown race'} • Level {totalLevel}</p>
              <span>{getMulticlassSummary(form)}</span>
              {form.background?.name && <small>{form.background.name} background</small>}
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="character-info-body">
          <div className="character-info-layout">
            <Section className="character-info-panel character-info-panel--progression">
              <div className="character-info-section-heading"><span>Progression</span><h4>Level & classes</h4></div>
              <div className="character-stat-grid character-stat-grid--compact">
                <StatCard label="Total Level" value={totalLevel} detail={`Next: ${totalLevel + 1}`} />
                <StatCard label="Classes" value={(form.occupation || []).length || '—'} detail="Multiclass count" />
                <StatCard label="Proficiency" value={form.proficiencyBonus || form.proficiency || '—'} detail="If tracked" />
              </div>
              <div className="character-class-list" aria-label="Character classes">
                {sortedClasses.length ? sortedClasses.map((el, i) => (
                  <ClassCard as="div" key={`${el.Occupation}-${i}`} className={i === 0 ? 'is-primary-class' : ''}>
                    <span className="class-card__icon" aria-hidden="true">✦</span>
                    <div><strong>{el.Occupation}</strong><small>{el.Subclass || el.subclass || (i === 0 ? 'Primary class' : 'Class')}</small></div>
                    <span className="character-class-list__level">Level {el.Level}</span>
                  </ClassCard>
                )) : <div className="character-info-empty">No classes recorded.</div>}
              </div>
            </Section>

            <Section className="character-info-panel character-info-panel--identity">
              <div className="character-info-section-heading"><span>Identity</span><h4>Details</h4></div>
              <div className="character-stat-grid">
                <StatCard label="Race" value={form.race?.name || '—'} detail={[goliathAncestryName, dragonbornAncestryName, elvenLineageName, tieflingLegacySubtext].filter(Boolean).join(' • ')} className="character-info-item" />
                <StatCard label="Background" value={form.background?.name || '—'} className="character-info-item"><Button variant="ghost" onClick={onShowBackground} aria-label="Show Background" className="stat-card-view"><i className="fa-solid fa-eye"></i></Button></StatCard>
                <StatCard label="Languages" value={raceLanguages || '—'} className="character-info-item" />
                <StatCard label="Age" value={form.age || '—'} className="character-info-item" />
                <StatCard label="Sex" value={form.sex || '—'} className="character-info-item" />
                <StatCard label="Size" value={displaySize} className="character-info-item" />
                <StatCard label="Weight" value={form.weight ? `${form.weight} lbs` : '—'} className="character-info-item" />
              </div>
            </Section>

            <Section className="character-info-panel character-info-panel--recovery">
              <div className="character-info-section-heading"><span>Rest & recovery</span><h4>Recover resources</h4></div>
              <div className="rest-action-grid">
                <ActionCard type="button" className="rest-action-card rest-action-card--short" onClick={onShortRest}>
                  <strong>Short Rest</strong><span>Recover short-rest resources and spend recovery as supported.</span>
                </ActionCard>
                <ActionCard type="button" className="rest-action-card rest-action-card--long" onClick={onLongRest}>
                  <strong>Long Rest</strong><span>Restore hit points and long-rest resources through existing rest rules.</span>
                </ActionCard>
              </div>
              <div className="character-info-figurine">
                <div className="character-info-figurine__preview" aria-live="polite">
                  {characterFigurine?.figurineImageUrl ? <img src={characterFigurine.figurineImageUrl} alt="Selected figurine token" className="character-info-figurine__image" /> : <div className="character-info-figurine__placeholder" aria-hidden="true"><i className="fas fa-chess-king"></i></div>}
                  <div className="character-info-figurine__details">{hasFigurineSelection ? 'Figurine selected' : 'No figurine selected'}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleFigurineButtonClick} disabled={isFigurineButtonDisabled}>{figurineButtonLabel}</Button>
              </div>
            </Section>
          </div>
        </ModalBody>
        <ModalFooter className="character-info-footer">
          <Button className="progression-entry-button" variant="primary" onClick={handleShowLevelUpModal}>Level Up <span>Level {totalLevel} → {totalLevel + 1}</span></Button>
          <Button variant="secondary" onClick={onLongRest}>Long Rest</Button>
          <Button variant="ghost" onClick={onShortRest}>Short Rest</Button>
          <Button variant="ghost" onClick={handleModalHide}>Close</Button>
        </ModalFooter>
      </ModalShell>
      <LevelUp show={showLevelUpModal} handleClose={handleCloseLevelUpModal} form={form} />
    </Modal>
  );
}
