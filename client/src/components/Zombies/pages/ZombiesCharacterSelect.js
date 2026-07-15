import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import apiFetch from '../../../utils/apiFetch';
import Button from 'react-bootstrap/Button';
import { Form, Modal, Card } from 'react-bootstrap';
import { useParams, useNavigate } from "react-router-dom";
import '../../../App.scss';
import loginbg from "../../../images/loginbg.png";
import logoLight from "../../../images/logo-light.png";
import { resolveFigurineImageData } from '../utils/figurineAssets';
import useUser from '../../../hooks/useUser';
import { SKILLS } from "../skillSchema";
import { STATS } from "../statSchema";
import { notify } from '../../../utils/notification';
import { calculateCharacterHitPoints } from '../utils/characterMetrics';

const DEFAULT_SIZE_OPTIONS = ["Tiny", "Small", "Medium", "Large"];

const getRaceSizeOptions = (race) => {
  if (!race) {
    return [];
  }
  if (Array.isArray(race.sizeOptions) && race.sizeOptions.length) {
    return race.sizeOptions;
  }
  if (race.size) {
    return [race.size];
  }
  return [];
};

const getOccupationList = (character) => Array.isArray(character?.occupation) ? character.occupation : [];

const getCharacterLevel = (character) =>
  getOccupationList(character).reduce((total, job) => total + Number(job.Level || job.level || 0), 0) || 1;

const getClassSummary = (character) => {
  const classes = getOccupationList(character);
  if (!classes.length) return "Wanderer";
  return classes.map((job) => `${job.Level || job.level || 1} ${job.Occupation || job.name || "Adventurer"}`).join(" / ");
};

const getPrimaryClass = (character) => {
  const classes = getOccupationList(character);
  return classes[0]?.Occupation || classes[0]?.name || "Adventurer";
};

const formatCharacterDate = (value) => {
  if (!value) return "Awaiting first quest";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently prepared";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const getInitials = (name = "Hero") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "RT";

const CharacterPortrait = ({ character }) => {
  const { figurineImageUrl } = resolveFigurineImageData(character, character?.figurine, character?.figurineImage, character?.tokenImage);
  const portrait = figurineImageUrl || character?.portrait || character?.image || character?.avatar;
  const name = character?.characterName || "Unnamed Hero";
  const portraitClassName = `character-select-portrait${figurineImageUrl ? " character-select-portrait--figurine" : ""}`;

  return (
    <div className={portraitClassName} aria-label={`${name} portrait`}>
      {portrait ? <img src={portrait} alt="" /> : <span>{getInitials(name)}</span>}
    </div>
  );
};

const CharacterStats = ({ character }) => {
  const stats = [
    ["STR", character?.str],
    ["DEX", character?.dex],
    ["CON", character?.con],
    ["INT", character?.int],
    ["WIS", character?.wis],
    ["CHA", character?.cha],
  ];
  return (
    <div className="character-select-card__stats">
      {stats.map(([label, value]) => (
        <span key={label}><strong>{value || "—"}</strong>{label}</span>
      ))}
    </div>
  );
};

const CharacterActions = ({ character, onContinue }) => (
  <div className="character-select-card__actions">
    <Button className="character-select-card__continue" onClick={() => onContinue(character._id)}>Continue Adventure</Button>
  </div>
);

const CharacterCard = ({ character, onContinue }) => {
  const name = character?.characterName || "Unnamed Hero";
  const race = character?.race?.name || character?.race || "Unknown Lineage";
  const background = character?.background?.name || character?.background || "Unwritten Legend";
  const { currentHp, maxHp } = calculateCharacterHitPoints(character);
  const health = currentHp !== null ? currentHp : character?.hp ?? null;
  const healthLabel = health !== null && maxHp !== null ? `${health} / ${maxHp}` : health;
  return (
    <article className="character-select-card">
      <CharacterPortrait character={character} />
      <div className="character-select-card__body">
        <p className="character-select-card__eyebrow">Level {getCharacterLevel(character)} • {getPrimaryClass(character)}</p>
        <h3>{name}</h3>
        <p className="character-select-card__lineage">{race}</p>
        <div className="character-select-card__chips">
          <span>{getClassSummary(character)}</span>
          <span>{background}</span>
          {character?.alignment && <span>{character.alignment}</span>}
        </div>
        <CharacterStats character={character} />
        <div className="character-select-card__meta">
          <span>Status <strong>Ready</strong></span>
          {healthLabel !== null && healthLabel !== undefined && <span>HP <strong>{healthLabel}</strong></span>}
          <span>Last played <strong>{formatCharacterDate(character?.lastPlayed || character?.updatedAt)}</strong></span>
        </div>
      </div>
      <CharacterActions character={character} onContinue={onContinue} />
    </article>
  );
};

const CampaignHero = ({ campaignName, dmName, playerCount, onCreateManual, onCreateRandom }) => (
  <section className="character-select-hero">
    <div className="character-select-hero__art" aria-hidden="true"><img src={logoLight} alt="" /></div>
    <div className="character-select-hero__content">
      <p className="character-select-kicker">RealmTracker Campaign</p>
      <div className="character-select-hero__title-row">
        <h1>{campaignName}</h1>
        <img className="character-select-hero__mobile-logo" src={logoLight} alt="" aria-hidden="true" />
      </div>
      <p>Gather your party, choose the hero who will step through the portal, and continue the next chapter of the adventure.</p>
      <div className="character-select-hero__facts">
        <span>Dungeon Master <strong>{dmName || "Unknown"}</strong></span>
        <span>Players <strong>{playerCount}</strong></span>
      </div>
    </div>
    <div className="character-select-hero__actions">
      <Button onClick={onCreateManual}>Create Manually</Button>
      <Button onClick={onCreateRandom}>Generate Randomly</Button>
    </div>
  </section>
);

const EmptyState = ({ onCreateManual }) => (
  <section className="character-select-empty">
    <div className="character-select-empty__sigil">☾</div>
    <h2>No heroes have joined this realm yet.</h2>
    <p>Create the first champion for this campaign and begin building a legend worth remembering.</p>
    <Button onClick={onCreateManual}>Create Your First Character</Button>
  </section>
);

const CreateCharacterCard = ({ onCreateManual, onCreateRandom }) => (
  <aside className="character-select-create">
    <p className="character-select-kicker">New Hero</p>
    <h2>Forge another legend</h2>
    <p>Start from a blank sheet, let fate roll the dice, or reserve space for future imports.</p>
    <div className="character-select-create__actions">
      <Button onClick={onCreateManual}>Create Manually</Button>
      <Button onClick={onCreateRandom}>Generate Randomly</Button>
      <Button disabled>Future Import</Button>
    </div>
  </aside>
);

const CharacterGrid = ({ records, onContinue }) => (
  <div className="character-select-grid">
    {records.map((character) => <CharacterCard key={character._id} character={character} onContinue={onContinue} />)}
  </div>
);

const abilityModifier = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value)) return "—";
  const modifier = Math.floor((value - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

const MANUAL_STEPS = [
  { id: "identity", title: "Identity", helper: "Name the hero who will enter this realm." },
  { id: "ancestry", title: "Ancestry", helper: "Choose lineage traits and conditional heritage options." },
  { id: "class", title: "Class", helper: "Select the first adventuring path and starting hit die." },
  { id: "background", title: "Background", helper: "Anchor the character in the world." },
  { id: "physical", title: "Physical Details", helper: "Capture concise table-facing details." },
  { id: "abilities", title: "Ability Scores", helper: "Set the six core scores used by the existing character model." },
  { id: "review", title: "Review & Create", helper: "Confirm the sheet before creating the character." },
];

const getManualErrors = (form, selectedOccupation) => {
  const errors = {};
  if (!form.characterName?.trim()) errors.characterName = "Enter a character name before continuing.";
  if ((form.characterName || "").length > 12) errors.characterName = "Use 12 characters or fewer.";
  if (/\d/.test(form.characterName || "")) errors.characterName = "Names cannot include numbers.";
  if (!form.race) errors.race = "Choose a race.";
  if (form.race?.dragonAncestries && !form.dragonAncestryKey) errors.dragonAncestryKey = "Choose a dragon ancestry.";
  if (form.race?.giantAncestries && !form.giantAncestryKey) errors.giantAncestryKey = "Choose a giant ancestry.";
  if (form.race?.elvenLineages && !form.elvenLineageKey) errors.elvenLineageKey = "Choose an elven lineage.";
  if (form.elvenLineage?.spellcastingAbilities?.length && !form.elvenLineageAbility) errors.elvenLineageAbility = "Choose a spellcasting ability.";
  if (form.race?.gnomeLineages && !form.gnomeLineageKey) errors.gnomeLineageKey = "Choose a gnome lineage.";
  if (form.gnomeLineage?.spellcastingAbilities?.length && !form.gnomeLineageAbility) errors.gnomeLineageAbility = "Choose a spellcasting ability.";
  if (form.race?.fiendishLegacies && !form.tieflingLegacyKey) errors.tieflingLegacyKey = "Choose a fiendish legacy.";
  if (form.tieflingLegacy?.spellcastingAbilities?.length && !form.tieflingLegacyAbility) errors.tieflingLegacyAbility = "Choose a spellcasting ability.";
  if (!selectedOccupation) errors.occupation = "Choose a class.";
  if (!form.background) errors.background = "Choose a background.";
  if (!form.size) errors.size = "Choose a size.";
  if (form.age && Number(form.age) < 0) errors.age = "Age must be zero or higher.";
  if (form.weight && Number(form.weight) < 0) errors.weight = "Weight must be zero or higher.";
  STATS.forEach(({ key, label }) => {
    if (form[key] === "" || form[key] == null) errors[key] = `Enter ${label}.`;
    else if (Number(form[key]) < 1 || Number(form[key]) > 30) errors[key] = `${label} must be between 1 and 30.`;
  });
  return errors;
};

const CharacterFormField = ({ id, label, helper, error, children }) => (
  <div className={`character-wizard-field${error ? " character-wizard-field--error" : ""}`}>
    <label htmlFor={id}>{label}</label>
    {helper && <p>{helper}</p>}
    {children}
    {error && <span className="character-wizard-error" id={`${id}-error`}>{error}</span>}
  </div>
);

const CharacterSelectCard = ({ selected, title, meta, detail, onClick, name }) => (
  <button type="button" className={`character-option-card${selected ? " character-option-card--selected" : ""}`} onClick={onClick} aria-pressed={selected} name={name}>
    <span className="character-option-card__sigil">✦</span><strong>{title}</strong>{meta && <small>{meta}</small>}{detail && <span>{detail}</span>}
  </button>
);

const AbilityScoreCard = ({ stat, value, onChange, error }) => {
  const numberValue = Number(value || 0);
  const setScore = (next) => onChange(String(Math.min(30, Math.max(1, next))));
  return <div className={`ability-score-card${error ? " ability-score-card--error" : ""}`}>
    <div><strong>{stat.key.toUpperCase()}</strong><span>{stat.label}</span></div>
    <div className="ability-score-card__stepper">
      <button type="button" onClick={() => setScore(numberValue - 1)} aria-label={`Decrease ${stat.label}`}>−</button>
      <input id={`manual-${stat.key}`} type="number" min="1" max="30" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={error ? `manual-${stat.key}-error` : undefined} />
      <button type="button" onClick={() => setScore(numberValue + 1)} aria-label={`Increase ${stat.label}`}>+</button>
    </div>
    <small>Modifier: {abilityModifier(value)} • Range 1–30</small>
    {error && <span className="character-wizard-error" id={`manual-${stat.key}-error`}>{error}</span>}
  </div>;
};

const CharacterCreationWizard = ({ form, updateForm, races, backgrounds, occupations, selectedOccupation, selectedAddOccupationRef, sizeOptions, step, setStep, touched, setTouched, onClose, onSubmit, onRaceChange, onClassChange, onSelectClass, onBackgroundChange, onDragonAncestryChange, onGiantAncestryChange, onElvenLineageChange, onElvenLineageAbilityChange, onGnomeLineageChange, onGnomeLineageAbilityChange, onTieflingLegacyChange, onTieflingLegacyAbilityChange }) => {
  const errors = getManualErrors(form, selectedOccupation);
  const stepFields = {
    identity: ["characterName"], ancestry: ["race", "dragonAncestryKey", "giantAncestryKey", "elvenLineageKey", "elvenLineageAbility", "gnomeLineageKey", "gnomeLineageAbility", "tieflingLegacyKey", "tieflingLegacyAbility"], class: ["occupation"], background: ["background"], physical: ["age", "sex", "size", "weight"], abilities: STATS.map((s) => s.key), review: Object.keys(errors),
  };
  const current = MANUAL_STEPS[step];
  const stepHasError = (id) => stepFields[id].some((field) => errors[field] && touched[field]);
  const validateStep = () => {
    const fields = stepFields[current.id];
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(fields.map((field) => [field, true])) }));
    const firstInvalid = fields.find((field) => errors[field]);
    if (firstInvalid) {
      setTimeout(() => document.querySelector(`[name="${firstInvalid}"], #manual-${firstInvalid}`)?.focus(), 0);
      return false;
    }
    return true;
  };
  const goNext = () => { if (validateStep()) setStep(Math.min(step + 1, MANUAL_STEPS.length - 1)); };
  const createCharacter = (e) => {
    e.preventDefault();
    if (current.id !== "review") {
      goNext();
      return;
    }
    if (validateStep() && !Object.keys(errors).length) {
      onSubmit(e);
    } else {
      setTouched((p) => ({ ...p, ...Object.fromEntries(Object.keys(errors).map((k) => [k, true])) }));
    }
  };
  const selectRaceKey = Object.keys(races).find((key) => races[key]?.name === form.race?.name) || "";
  const selectBackgroundKey = Object.keys(backgrounds).find((key) => backgrounds[key]?.name === form.background?.name) || "";

  return <form className="character-wizard" onSubmit={(e) => e.preventDefault()} noValidate>
    <header className="character-wizard__header"><div><p className="character-select-kicker">Hero Forge</p><h2>Create Character</h2><span>Step {step + 1} of {MANUAL_STEPS.length} · {current.title}</span></div><button type="button" onClick={onClose} aria-label="Close character creator">×</button><div className="character-wizard__mobile-progress"><span style={{ width: `${((step + 1) / MANUAL_STEPS.length) * 100}%` }} /></div></header>
    <div className="character-wizard__shell"><aside className="character-wizard__sidebar"><div className="character-wizard__portrait">{(form.characterName || "RT").slice(0,2).toUpperCase()}</div><nav aria-label="Character creation steps">{MANUAL_STEPS.map((s, i) => <button type="button" key={s.id} className={`${i===step ? "is-current" : ""} ${i<step ? "is-complete" : ""} ${stepHasError(s.id) ? "has-error" : ""}`} onClick={() => i <= step ? setStep(i) : null}><span>{i < step ? "✓" : i + 1}</span><strong>{s.title}</strong><small>{s.helper}</small></button>)}</nav><div className="character-wizard__summary"><strong>{form.characterName || "Unnamed Hero"}</strong><span>{form.race?.name || "Ancestry pending"}</span><span>{selectedOccupation?.name || "Class pending"}</span></div></aside>
    <main className="character-wizard__content"><section className="character-wizard-step"><p className="character-select-kicker">{current.title}</p><h3>{current.helper}</h3>{Object.keys(errors).some((k) => stepFields[current.id].includes(k) && touched[k]) && <div className="character-wizard-error-summary">Review the highlighted fields before continuing.</div>}
      {current.id === "identity" && <><CharacterFormField id="manual-characterName" label="Character Name" helper={`Choose a name up to 12 characters. ${(form.characterName || "").length}/12`} error={touched.characterName && errors.characterName}><input id="manual-characterName" name="characterName" value={form.characterName || ""} maxLength="12" onBlur={() => setTouched((p)=>({...p, characterName:true}))} onChange={(e)=>updateForm({characterName:e.target.value})} aria-describedby={errors.characterName ? "manual-characterName-error" : undefined} /></CharacterFormField><div className="identity-preview"><span>✦</span><strong>{form.characterName || "Your hero's name"}</strong><small>This preview updates as you build the character.</small></div></>}
      {current.id === "ancestry" && <><div className="character-option-grid">{Object.entries(races).map(([key, race]) => <CharacterSelectCard key={key} name="race" selected={selectRaceKey===key} title={race.name} meta={getRaceSizeOptions(race).join(" / ") || "Size varies"} onClick={()=>{onRaceChange({target:{value:key}}); setTouched((p)=>({...p,race:true}));}} />)}</div>{touched.race && errors.race && <span className="character-wizard-error">{errors.race}</span>}<div className="conditional-lineage">{form.race?.dragonAncestries && <CharacterFormField id="manual-dragonAncestryKey" label="Dragon Ancestry" error={touched.dragonAncestryKey && errors.dragonAncestryKey}><select id="manual-dragonAncestryKey" name="dragonAncestryKey" value={form.dragonAncestryKey || ""} onChange={onDragonAncestryChange} onBlur={()=>setTouched((p)=>({...p,dragonAncestryKey:true}))}><option value="" disabled>Select ancestry</option>{Object.entries(form.race.dragonAncestries).map(([key,a])=><option key={key} value={key}>{a.label}</option>)}</select></CharacterFormField>}{form.race?.giantAncestries && <CharacterFormField id="manual-giantAncestryKey" label="Giant Ancestry" error={touched.giantAncestryKey && errors.giantAncestryKey}><select id="manual-giantAncestryKey" name="giantAncestryKey" value={form.giantAncestryKey || ""} onChange={onGiantAncestryChange}><option value="" disabled>Select ancestry</option>{Object.entries(form.race.giantAncestries).map(([key,a])=><option key={key} value={key}>{a.ancestryName || a.label || a.name}</option>)}</select></CharacterFormField>}{form.race?.elvenLineages && <CharacterFormField id="manual-elvenLineageKey" label="Elven Lineage" error={touched.elvenLineageKey && errors.elvenLineageKey}><select id="manual-elvenLineageKey" name="elvenLineageKey" value={form.elvenLineageKey || ""} onChange={onElvenLineageChange}><option value="" disabled>Select lineage</option>{Object.entries(form.race.elvenLineages).map(([key,a])=><option key={key} value={key}>{a.label || a.name}</option>)}</select></CharacterFormField>}{form.elvenLineage?.spellcastingAbilities?.length ? <CharacterFormField id="manual-elvenLineageAbility" label="Spellcasting Ability" error={touched.elvenLineageAbility && errors.elvenLineageAbility}><select id="manual-elvenLineageAbility" name="elvenLineageAbility" value={form.elvenLineageAbility || ""} onChange={onElvenLineageAbilityChange}><option value="" disabled>Select ability</option>{form.elvenLineage.spellcastingAbilities.map((a)=><option key={a} value={a}>{a}</option>)}</select></CharacterFormField> : null}{form.race?.gnomeLineages && <CharacterFormField id="manual-gnomeLineageKey" label="Gnome Lineage" error={touched.gnomeLineageKey && errors.gnomeLineageKey}><select id="manual-gnomeLineageKey" name="gnomeLineageKey" value={form.gnomeLineageKey || ""} onChange={onGnomeLineageChange}><option value="" disabled>Select lineage</option>{Object.entries(form.race.gnomeLineages).map(([key,a])=><option key={key} value={key}>{a.label || a.name}</option>)}</select></CharacterFormField>}{form.gnomeLineage?.spellcastingAbilities?.length ? <CharacterFormField id="manual-gnomeLineageAbility" label="Spellcasting Ability" error={touched.gnomeLineageAbility && errors.gnomeLineageAbility}><select id="manual-gnomeLineageAbility" name="gnomeLineageAbility" value={form.gnomeLineageAbility || ""} onChange={onGnomeLineageAbilityChange}><option value="" disabled>Select ability</option>{form.gnomeLineage.spellcastingAbilities.map((a)=><option key={a} value={a}>{a}</option>)}</select></CharacterFormField> : null}{form.race?.fiendishLegacies && <CharacterFormField id="manual-tieflingLegacyKey" label="Fiendish Legacy" error={touched.tieflingLegacyKey && errors.tieflingLegacyKey}><select id="manual-tieflingLegacyKey" name="tieflingLegacyKey" value={form.tieflingLegacyKey || ""} onChange={onTieflingLegacyChange}><option value="" disabled>Select legacy</option>{Object.entries(form.race.fiendishLegacies).map(([key,a])=><option key={key} value={key}>{a.label || a.name}</option>)}</select></CharacterFormField>}{form.tieflingLegacy?.spellcastingAbilities?.length ? <CharacterFormField id="manual-tieflingLegacyAbility" label="Spellcasting Ability" error={touched.tieflingLegacyAbility && errors.tieflingLegacyAbility}><select id="manual-tieflingLegacyAbility" name="tieflingLegacyAbility" value={form.tieflingLegacyAbility || ""} onChange={onTieflingLegacyAbilityChange}><option value="" disabled>Select ability</option>{form.tieflingLegacy.spellcastingAbilities.map((a)=><option key={a} value={a}>{a}</option>)}</select></CharacterFormField> : null}</div></>}
      {current.id === "class" && <><select className="visually-hidden" ref={selectedAddOccupationRef} onChange={onClassChange} value={selectedOccupation?.name || ""}><option value="">Select class</option>{occupations.map((o)=><option key={o.name} value={o.name}>{o.name}</option>)}</select><div className="character-option-grid character-option-grid--classes">{occupations.map((o) => <CharacterSelectCard key={o.name} name="occupation" selected={selectedOccupation?.name===o.name} title={o.name} meta={o.hitDie ? `Hit Die d${o.hitDie}` : "Starting class"} detail={o.proficiencies?.savingThrows?.length ? `Saves: ${o.proficiencies.savingThrows.join(", ")}` : "Choose this path"} onClick={()=>{onSelectClass(o); setTouched((p)=>({...p,occupation:true}));}} />)}</div>{touched.occupation && errors.occupation && <span className="character-wizard-error">{errors.occupation}</span>}</>}
      {current.id === "background" && <><div className="character-option-grid">{Object.entries(backgrounds).map(([key,bg]) => <CharacterSelectCard key={key} name="background" selected={selectBackgroundKey===key} title={bg.name} meta={bg.skills ? `Skills: ${Object.keys(bg.skills).join(", ")}` : "Background"} onClick={()=>{onBackgroundChange({target:{value:key}}); setTouched((p)=>({...p,background:true}));}} />)}</div>{touched.background && errors.background && <span className="character-wizard-error">{errors.background}</span>}</>}
      {current.id === "physical" && <div className="character-wizard-fields-grid"><CharacterFormField id="manual-age" label="Age" error={touched.age && errors.age}><input id="manual-age" name="age" type="number" min="0" value={form.age || ""} onChange={(e)=>updateForm({age:e.target.value})} onBlur={()=>setTouched((p)=>({...p,age:true}))} /></CharacterFormField><CharacterFormField id="manual-sex" label="Sex / Gender" helper="Free text to match your table." ><input id="manual-sex" name="sex" value={form.sex || ""} onChange={(e)=>updateForm({sex:e.target.value})} /></CharacterFormField><CharacterFormField id="manual-size" label="Size" error={touched.size && errors.size}><select id="manual-size" name="size" value={form.size || ""} onChange={(e)=>updateForm({size:e.target.value})} onBlur={()=>setTouched((p)=>({...p,size:true}))}><option value="" disabled>Select size</option>{sizeOptions.map((o)=><option key={o} value={o}>{o}</option>)}</select></CharacterFormField><CharacterFormField id="manual-weight" label="Weight" error={touched.weight && errors.weight}><input id="manual-weight" name="weight" type="number" min="0" value={form.weight || ""} onChange={(e)=>updateForm({weight:e.target.value})} onBlur={()=>setTouched((p)=>({...p,weight:true}))} /></CharacterFormField></div>}
      {current.id === "abilities" && <div className="ability-score-grid">{STATS.map((stat)=><AbilityScoreCard key={stat.key} stat={stat} value={form[stat.key] || ""} error={touched[stat.key] && errors[stat.key]} onChange={(value)=>updateForm({[stat.key]:value})} />)}</div>}
      {current.id === "review" && <div className="character-review"><h4>{form.characterName || "Unnamed Hero"}</h4>{[["Ancestry", form.race?.name], ["Class", selectedOccupation?.name], ["Background", form.background?.name], ["Size", form.size], ["Age", form.age || "—"], ["Sex / Gender", form.sex || "—"], ["Weight", form.weight || "—"]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value || "Missing"}</strong></div>)}<div className="character-review__abilities">{STATS.map((s)=><span key={s.key}>{s.key.toUpperCase()} <strong>{form[s.key] || "—"}</strong></span>)}</div>{Object.keys(errors).length > 0 && <div className="character-wizard-error-summary">Complete missing sections before creating this character.</div>}</div>}
    </section></main></div><footer className="character-wizard__actions"><Button type="button" variant="secondary" onClick={() => step ? setStep(step - 1) : onClose()}>{step ? "Back" : "Cancel"}</Button>{step < MANUAL_STEPS.length - 1 ? <Button type="button" onClick={goNext}>Continue</Button> : <Button type="button" onClick={createCharacter} disabled={Object.keys(errors).length > 0}>Create Character</Button>}</footer></form>;
};

export default function RecordList() {
  const params = useParams();
  const [records, setRecords] = useState([]);
  const [dmName, setDmName] = useState("");
  const [campaignPlayerCount, setCampaignPlayerCount] = useState(0);
  const navigate = useNavigate();
  const user = useUser();

  useEffect(() => {
    document.body.classList.add("character-select-scroll-enabled");
    document.documentElement.classList.add("character-select-scroll-enabled");

    return () => {
      document.body.classList.remove("character-select-scroll-enabled");
      document.documentElement.classList.remove("character-select-scroll-enabled");
    };
  }, []);

  useEffect(() => {
    if (!user || !params.campaign) {
      return;
    }

    apiFetch(`/campaigns/${encodeURIComponent(params.campaign)}/access`, { method: "PUT" }).catch(() => {});
  }, [params.campaign, user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    async function getCampaign() {
      const response = await apiFetch(`/campaigns/${params.campaign}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        notify(message);
        return;
      }

      const campaign = await response.json();
      setDmName(campaign?.dm || "");
      setCampaignPlayerCount(Array.isArray(campaign?.players) ? campaign.players.length : 0);
    }

    getCampaign();

    return;
  }, [params.campaign, user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    async function getRecords() {
    const response = await apiFetch(`/campaigns/${params.campaign}/${user.username}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        notify(message);
        return;
      }

      const records = await response.json();
      setRecords(records);
    }

    getRecords();

    return;
  }, [params.campaign, user]);

  const navigateToCharacter = async (id) => {
    const lastPlayed = new Date().toISOString();
    setRecords((prev) => prev.map((record) => (record._id === id ? { ...record, lastPlayed } : record)));
    try {
      await apiFetch(`/characters/${id}/last-played`, { method: 'PUT' });
    } catch (error) {
      // Navigating should not be blocked if this best-effort timestamp update fails.
    } finally {
      navigate(`/zombies-character-sheet/${id}`);
    }
  }

// --------------------------Random Character Creator Section------------------------------------
  const createEmptyArray = (length) => Array(length).fill("");

const createDefaultForm = useCallback((campaign) => {
  const skillDefaults = Object.fromEntries(SKILLS.map(({ key }) => [key, 0]));
  const statDefaults = Object.fromEntries(STATS.map(({ key }) => [key, ""]));
  return {
    token: "",
    characterName: "",
    campaign: campaign.toString(),
    occupation: [],
    race: null,
    dragonAncestryKey: "",
    dragonAncestry: null,
    giantAncestryKey: "",
    giantAncestry: null,
    gnomeLineageKey: "",
    gnomeLineage: null,
    gnomeLineageAbility: "",
    elvenLineageKey: "",
    elvenLineage: null,
    elvenLineageAbility: "",
    tieflingLegacyKey: "",
    tieflingLegacy: null,
    tieflingLegacyAbility: "",
    background: null,
    feat: [],
    weapon: [],
    armor: [createEmptyArray(4)],
    item: [createEmptyArray(SKILLS.length + 8)],
    age: "",
    sex: "",
    size: "",
    weight: "",
    startStatTotal: "",
    health: "",
    tempHealth: "",
    alignment: "",
    ...statDefaults,
    ...skillDefaults,
    newSkill: [["", 0]],
    diceColor: "#000000",
  };
}, []);

  const [form, setForm] = useState(createDefaultForm(params.campaign));

useEffect(() => {
  // Update form state once the token is decoded
  if (user) {
    setForm(prevForm => ({ ...prevForm, token: user.username }));
  }
}, [user]);

const [occupation, setOccupation] = useState({
  occupation: [],
});

const [races, setRaces] = useState({});
const [backgrounds, setBackgrounds] = useState({});

const globalSizeOptions = useMemo(() => {
  const collected = new Set();
  Object.values(races || {}).forEach((race) => {
    getRaceSizeOptions(race).forEach((size) => {
      if (size) {
        collected.add(size);
      }
    });
  });
  return collected.size ? Array.from(collected) : DEFAULT_SIZE_OPTIONS;
}, [races]);

const sizeOptionsForManual = useMemo(() => {
  const baseOptions = form.race?.sizeOptions?.length
    ? form.race.sizeOptions
    : globalSizeOptions;
  const optionsSet = new Set(baseOptions);
  if (form.size && !optionsSet.has(form.size)) {
    optionsSet.add(form.size);
  }
  return Array.from(optionsSet);
}, [form.race, form.size, globalSizeOptions]);

const [show, setShow] = useState(false);
const handleClose = () => setShow(false);
const handleShow = () => setShow(true);

const [showAbilitySkillModal, setShowAbilitySkillModal] = useState(false);
const [abilitySelections, setAbilitySelections] = useState([]);
const [skillSelections, setSkillSelections] = useState([]);

// Fetch Occupations
useEffect(() => {
  if (!user) return;
  async function fetchData() {
    const response = await apiFetch(`/classes`);

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      notify(message);
      return;
    }

    const record = await response.json();
    if (!record) {
      notify(`Record not found`, 'warning');
      navigate("/");
      return;
    }

    const classes = Object.values(record);
    setOccupation(classes);
    setGetOccupation(classes);
  }
  fetchData();
  return;

}, [navigate, user]);

// Fetch Races
useEffect(() => {
  if (!user) return;
  async function fetchRaces() {
    const response = await apiFetch(`/races`);
    if (!response.ok) {
      notify(`An error has occurred: ${response.statusText}`);
      return;
    }
    const data = await response.json();
    setRaces(data);
  }
  fetchRaces();
}, [user]);

// Update the state properties.
function updateForm(value) {
  return setForm((prev) => {
    const updatedForm = { ...prev };

    // Convert numeric values to numbers
    Object.keys(value).forEach((key) => {
      const val = value[key];
      if (typeof val === "number") {
        updatedForm[key] = val;
        return;
      }
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
          updatedForm[key] = Number(trimmed);
          return;
        }
        updatedForm[key] = val;
        return;
      }

      updatedForm[key] = val;
    });

    return updatedForm;
  });
}

const attachSelectedAncestryToRace = useCallback((race, {
  dragonAncestryKey,
  dragonAncestry,
  giantAncestryKey,
  giantAncestry,
  gnomeLineageKey,
  gnomeLineage,
  gnomeLineageAbility,
  elvenLineageKey,
  elvenLineage,
  elvenLineageAbility,
  tieflingLegacyKey,
  tieflingLegacy,
  tieflingLegacyAbility,
}) => {
  if (!race) return race;
  const updatedRace = { ...race };

  const baseSpeed =
    typeof race.__baseSpeed === "number" ? race.__baseSpeed : race.speed;
  if (typeof baseSpeed === "number") {
    updatedRace.__baseSpeed = baseSpeed;
  }

  const hasStoredBaseAbilities = Object.prototype.hasOwnProperty.call(
    race,
    "__baseAbilities"
  );
  const baseAbilities = hasStoredBaseAbilities ? race.__baseAbilities : race.abilities;
  if (baseAbilities) {
    updatedRace.__baseAbilities = { ...baseAbilities };
  } else {
    delete updatedRace.__baseAbilities;
  }

  const hasStoredBaseDarkvision = Object.prototype.hasOwnProperty.call(
    race,
    "__baseDarkvisionRange"
  );
  const hasRaceDarkvision = Object.prototype.hasOwnProperty.call(
    race,
    "darkvisionRange"
  );
  const baseDarkvision = hasStoredBaseDarkvision
    ? race.__baseDarkvisionRange
    : hasRaceDarkvision
    ? race.darkvisionRange
    : undefined;
  if (hasStoredBaseDarkvision || hasRaceDarkvision) {
    updatedRace.__baseDarkvisionRange = baseDarkvision;
  }

  delete updatedRace.selectedAncestryKey;
  delete updatedRace.selectedAncestry;
  delete updatedRace.selectedLineageAbility;
  delete updatedRace.selectedFiendishLegacyResistance;

  if (race.dragonAncestries && dragonAncestryKey && dragonAncestry) {
    updatedRace.selectedAncestryKey = dragonAncestryKey;
    updatedRace.selectedAncestry = dragonAncestry;
  } else if (race.giantAncestries && giantAncestryKey && giantAncestry) {
    updatedRace.selectedAncestryKey = giantAncestryKey;
    updatedRace.selectedAncestry = giantAncestry;
  } else if (race.gnomeLineages && gnomeLineageKey && gnomeLineage) {
    updatedRace.selectedAncestryKey = gnomeLineageKey;
    updatedRace.selectedAncestry = gnomeLineage;
    if (gnomeLineageAbility) {
      updatedRace.selectedLineageAbility = gnomeLineageAbility;
    }
  } else if (race.elvenLineages && elvenLineageKey && elvenLineage) {
    updatedRace.selectedAncestryKey = elvenLineageKey;
    updatedRace.selectedAncestry = elvenLineage;
    if (elvenLineageAbility) {
      updatedRace.selectedLineageAbility = elvenLineageAbility;
    }
  } else if (race.fiendishLegacies && tieflingLegacyKey && tieflingLegacy) {
    updatedRace.selectedAncestryKey = tieflingLegacyKey;
    updatedRace.selectedAncestry = tieflingLegacy;
    if (tieflingLegacyAbility) {
      updatedRace.selectedLineageAbility = tieflingLegacyAbility;
    }
    if (tieflingLegacy?.resistance) {
      updatedRace.selectedFiendishLegacyResistance = tieflingLegacy.resistance;
    }
  }

  if (race.elvenLineages) {
    const hasExplicitElvenSelection =
      typeof elvenLineageKey !== "undefined";
    const lineageToApply = hasExplicitElvenSelection
      ? elvenLineageKey && elvenLineage
        ? elvenLineage
        : null
      : race.selectedAncestryKey && race.elvenLineages[race.selectedAncestryKey]
      ? race.elvenLineages[race.selectedAncestryKey]
      : null;

    const lineageSpeed =
      typeof lineageToApply?.speed === "number" ? lineageToApply.speed : null;
    const lineageDarkvision =
      typeof lineageToApply?.darkvisionRange === "number"
        ? lineageToApply.darkvisionRange
        : null;
    const lineageAbilities = lineageToApply?.abilities || null;

    if (typeof baseSpeed === "number") {
      updatedRace.speed = lineageSpeed ?? baseSpeed;
    } else if (lineageSpeed != null) {
      updatedRace.speed = lineageSpeed;
    }

    if (lineageDarkvision != null) {
      updatedRace.darkvisionRange = lineageDarkvision;
    } else if (typeof baseDarkvision !== "undefined") {
      if (baseDarkvision === null) {
        delete updatedRace.darkvisionRange;
      } else {
        updatedRace.darkvisionRange = baseDarkvision;
      }
    }

    if (baseAbilities || lineageAbilities) {
      const combinedAbilities = baseAbilities ? { ...baseAbilities } : {};

      if (lineageAbilities) {
        Object.entries(lineageAbilities).forEach(([abilityKey, bonusValue]) => {
          const numericBase = Number(combinedAbilities[abilityKey] ?? 0);
          const numericBonus = Number(bonusValue ?? 0);
          const safeBase = Number.isNaN(numericBase) ? 0 : numericBase;
          const safeBonus = Number.isNaN(numericBonus) ? 0 : numericBonus;
          combinedAbilities[abilityKey] = safeBase + safeBonus;
        });
      }

      updatedRace.abilities = combinedAbilities;
    } else if (updatedRace.abilities) {
      delete updatedRace.abilities;
    }
  }

  if (race.fiendishLegacies) {
    if (typeof baseSpeed === "number") {
      updatedRace.speed = baseSpeed;
    }

    if (typeof baseDarkvision !== "undefined") {
      if (baseDarkvision === null) {
        delete updatedRace.darkvisionRange;
      } else {
        updatedRace.darkvisionRange = baseDarkvision;
      }
    }
  }

  return updatedRace;
}, []);

 // Function to handle submission.
 async function onSubmit(e) {
  e.preventDefault();
  if (form.race?.abilityChoices || form.race?.skillChoices) {
    setAbilitySelections(Array(form.race?.abilityChoices?.count || 0).fill(""));
    setSkillSelections(Array(form.race?.skillChoices?.count || 0).fill(""));
    setShowAbilitySkillModal(true);
    return;
  }
  sendToDb();
}

// Dice Randomizer
const [sumArray, setSumArray] = useState([]);
useEffect(() => {
  rollDiceSixTimes();
}, []);

// Fetch Backgrounds
useEffect(() => {
  if (!user) return;
  async function fetchBackgrounds() {
    const response = await apiFetch(`/backgrounds`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      notify(message);
      return;
    }
    const record = await response.json();
    setBackgrounds(record);
  }
  fetchBackgrounds();
}, [user]);
const rollDiceSixTimes = () => {
  const newSumArray = [];
  for (let i = 0; i < 6; i++) {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => a - b);
    rolls.shift(); // Remove the lowest value
    const totalSum = rolls.reduce((acc, value) => acc + value, 0);
    newSumArray.push(totalSum);
  }
  setSumArray(newSumArray);
};

function bigMaff() {
  // Occupation Randomizer
  let occupationLength = occupation.length;
  let randomOccupation = Math.round(Math.random() * (occupationLength - 1));
  let newOccupation = occupation[randomOccupation];
  const normalizedOcc = {
    Occupation: newOccupation.name,
    Health: newOccupation.hitDie,
    Level: 1,
    proficiencyPoints: newOccupation.proficiencies?.skills?.count || 0,
    armor: newOccupation.proficiencies?.armor || [],
    weapons: newOccupation.proficiencies?.weapons || [],
    tools: newOccupation.proficiencies?.tools || [],
    savingThrows: newOccupation.proficiencies?.savingThrows || [],
    skills: (() => {
      const skills = {};
      const profSkills = newOccupation.proficiencies?.skills;
      if (profSkills?.options && profSkills.count) {
        const available = [...profSkills.options];
        for (let i = 0; i < profSkills.count; i++) {
          if (!available.length) break;
          const idx = Math.floor(Math.random() * available.length);
          const skill = available.splice(idx, 1)[0];
          skills[skill] = { proficient: true };
        }
      }
      return skills;
    })(),
  };
  updateForm({ occupation: [normalizedOcc] });

  const alignmentOptions = [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
  ];
  const alignmentValue =
    form.alignment && form.alignment !== ""
      ? form.alignment
      : alignmentOptions[Math.floor(Math.random() * alignmentOptions.length)];
  if (!form.alignment || form.alignment === "") {
    updateForm({ alignment: alignmentValue });
  }

  // Race Randomizer
  const raceKeys = Object.keys(races);
  let chosenRace = null;
  if (raceKeys.length) {
    const randomRaceKey = raceKeys[Math.floor(Math.random() * raceKeys.length)];
    chosenRace = JSON.parse(JSON.stringify(races[randomRaceKey]));
    const raceSizeOptions = getRaceSizeOptions(chosenRace);
    const selectedSize =
      raceSizeOptions.length > 1
        ? raceSizeOptions[Math.floor(Math.random() * raceSizeOptions.length)]
        : raceSizeOptions[0] || "";
    if (chosenRace.abilityChoices) {
      const { count, options } = chosenRace.abilityChoices;
      for (let i = 0; i < count; i++) {
        const choice = options[Math.floor(Math.random() * options.length)];
        chosenRace.abilities[choice] = (chosenRace.abilities[choice] || 0) + 1;
      }
      delete chosenRace.abilityChoices;
    }
    if (chosenRace.skillChoices) {
      const { count, options } = chosenRace.skillChoices;
      const available = (options && options.length
        ? [...options]
        : SKILLS.map((s) => s.key)
      ).filter((skillKey) => !chosenRace.skills?.[skillKey]?.proficient);
      chosenRace.skills = chosenRace.skills || {};
      for (let i = 0; i < count; i++) {
        if (!available.length) break;
        const idx = Math.floor(Math.random() * available.length);
        const skill = available.splice(idx, 1)[0];
        chosenRace.skills[skill] = { proficient: true };
      }
      delete chosenRace.skillChoices;
    }
    let selectedDragonAncestryKey = "";
    let selectedDragonAncestry = null;
    let selectedGiantAncestryKey = "";
    let selectedGiantAncestry = null;
    let selectedGnomeLineageKey = "";
    let selectedGnomeLineage = null;
    let selectedGnomeLineageAbility = "";
    let selectedElvenLineageKey = "";
    let selectedElvenLineage = null;
    let selectedElvenLineageAbility = "";
    let selectedTieflingLegacyKey = "";
    let selectedTieflingLegacy = null;
    let selectedTieflingLegacyAbility = "";
    if (chosenRace.name === "Dragonborn" && chosenRace.dragonAncestries) {
      const ancestryKeys = Object.keys(chosenRace.dragonAncestries);
      const alignmentLower = alignmentValue.toLowerCase();
      let ancestryPool = ancestryKeys;
      if (alignmentLower.includes("good")) {
        ancestryPool = ancestryKeys.filter(
          (key) => chosenRace.dragonAncestries[key].moralAlignment === "good"
        );
      } else if (alignmentLower.includes("evil")) {
        ancestryPool = ancestryKeys.filter(
          (key) => chosenRace.dragonAncestries[key].moralAlignment === "evil"
        );
      }
      if (!ancestryPool.length) {
        ancestryPool = ancestryKeys;
      }
      selectedDragonAncestryKey = ancestryPool[Math.floor(Math.random() * ancestryPool.length)];
      selectedDragonAncestry = chosenRace.dragonAncestries[selectedDragonAncestryKey];
      chosenRace.selectedAncestryKey = selectedDragonAncestryKey;
      chosenRace.selectedAncestry = selectedDragonAncestry;
    }
    if (chosenRace.name === "Goliath" && chosenRace.giantAncestries) {
      const ancestryKeys = Object.keys(chosenRace.giantAncestries);
      if (ancestryKeys.length) {
        selectedGiantAncestryKey = ancestryKeys[Math.floor(Math.random() * ancestryKeys.length)];
        selectedGiantAncestry = chosenRace.giantAncestries[selectedGiantAncestryKey];
        chosenRace.selectedAncestryKey = selectedGiantAncestryKey;
        chosenRace.selectedAncestry = selectedGiantAncestry;
      }
    }
    if (chosenRace.name === "Gnome" && chosenRace.gnomeLineages) {
      const lineageKeys = Object.keys(chosenRace.gnomeLineages);
      if (lineageKeys.length) {
        selectedGnomeLineageKey = lineageKeys[Math.floor(Math.random() * lineageKeys.length)];
        selectedGnomeLineage = chosenRace.gnomeLineages[selectedGnomeLineageKey];
        chosenRace.selectedAncestryKey = selectedGnomeLineageKey;
        chosenRace.selectedAncestry = selectedGnomeLineage;
        const abilityOptions = selectedGnomeLineage?.spellcastingAbilities || [];
        if (abilityOptions.length) {
          selectedGnomeLineageAbility = abilityOptions[Math.floor(Math.random() * abilityOptions.length)];
          chosenRace.selectedLineageAbility = selectedGnomeLineageAbility;
        }
      }
    }
    if (chosenRace.name === "Elf" && chosenRace.elvenLineages) {
      const lineageKeys = Object.keys(chosenRace.elvenLineages);
      if (lineageKeys.length) {
        selectedElvenLineageKey = lineageKeys[Math.floor(Math.random() * lineageKeys.length)];
        selectedElvenLineage = chosenRace.elvenLineages[selectedElvenLineageKey];
        chosenRace.selectedAncestryKey = selectedElvenLineageKey;
        chosenRace.selectedAncestry = selectedElvenLineage;
        const abilityOptions = selectedElvenLineage?.spellcastingAbilities || [];
        if (abilityOptions.length) {
          selectedElvenLineageAbility = abilityOptions[Math.floor(Math.random() * abilityOptions.length)];
          chosenRace.selectedLineageAbility = selectedElvenLineageAbility;
        }
      }
    }
    if (chosenRace.name === "Tiefling" && chosenRace.fiendishLegacies) {
      const legacyKeys = Object.keys(chosenRace.fiendishLegacies);
      if (legacyKeys.length) {
        selectedTieflingLegacyKey = legacyKeys[Math.floor(Math.random() * legacyKeys.length)];
        selectedTieflingLegacy = chosenRace.fiendishLegacies[selectedTieflingLegacyKey];
        chosenRace.selectedAncestryKey = selectedTieflingLegacyKey;
        chosenRace.selectedAncestry = selectedTieflingLegacy;
        const abilityOptions = selectedTieflingLegacy?.spellcastingAbilities || [];
        if (abilityOptions.length) {
          selectedTieflingLegacyAbility = abilityOptions[Math.floor(Math.random() * abilityOptions.length)];
          chosenRace.selectedLineageAbility = selectedTieflingLegacyAbility;
        }
        if (selectedTieflingLegacy?.resistance) {
          chosenRace.selectedFiendishLegacyResistance = selectedTieflingLegacy.resistance;
        }
      }
    }
    const raceWithSelections = attachSelectedAncestryToRace(chosenRace, {
      dragonAncestryKey: selectedDragonAncestry ? selectedDragonAncestryKey : "",
      dragonAncestry: selectedDragonAncestry,
      giantAncestryKey: selectedGiantAncestry ? selectedGiantAncestryKey : "",
      giantAncestry: selectedGiantAncestry,
      gnomeLineageKey: selectedGnomeLineage ? selectedGnomeLineageKey : "",
      gnomeLineage: selectedGnomeLineage,
      gnomeLineageAbility: selectedGnomeLineageAbility,
      elvenLineageKey: selectedElvenLineage ? selectedElvenLineageKey : "",
      elvenLineage: selectedElvenLineage,
      elvenLineageAbility: selectedElvenLineageAbility,
      tieflingLegacyKey: selectedTieflingLegacy ? selectedTieflingLegacyKey : "",
      tieflingLegacy: selectedTieflingLegacy,
      tieflingLegacyAbility: selectedTieflingLegacyAbility,
    });
    setForm((prev) => {
      const updatedSkills = { ...(prev.skills || {}) };
      if (raceWithSelections?.skills) {
        Object.assign(updatedSkills, raceWithSelections.skills);
      }
      const nextForm = {
        ...prev,
        race: raceWithSelections,
        speed:
          typeof raceWithSelections?.speed === "number"
            ? raceWithSelections.speed
            : prev.speed,
        size: selectedSize || prev.size || "",
        dragonAncestryKey: selectedDragonAncestry ? selectedDragonAncestryKey : "",
        dragonAncestry: selectedDragonAncestry || null,
        giantAncestryKey: selectedGiantAncestry ? selectedGiantAncestryKey : "",
        giantAncestry: selectedGiantAncestry || null,
        gnomeLineageKey: selectedGnomeLineage ? selectedGnomeLineageKey : "",
        gnomeLineage: selectedGnomeLineage || null,
        gnomeLineageAbility: selectedGnomeLineageAbility || "",
        elvenLineageKey: selectedElvenLineage ? selectedElvenLineageKey : "",
        elvenLineage: selectedElvenLineage || null,
        elvenLineageAbility: selectedElvenLineageAbility || "",
        tieflingLegacyKey: selectedTieflingLegacy ? selectedTieflingLegacyKey : "",
        tieflingLegacy: selectedTieflingLegacy || null,
        tieflingLegacyAbility: selectedTieflingLegacyAbility || "",
      };
      if (Object.keys(updatedSkills).length) {
        nextForm.skills = updatedSkills;
      }
      return nextForm;
    });
  }
  // Background Randomizer
  const backgroundKeys = Object.keys(backgrounds);
  if (backgroundKeys.length) {
    const bg = JSON.parse(JSON.stringify(
      backgrounds[backgroundKeys[Math.floor(Math.random() * backgroundKeys.length)]]
    ));
    setForm((prev) => {
      const updatedSkills = { ...(prev.skills || {}) };
      if (bg.skills) {
        Object.assign(updatedSkills, bg.skills);
      }
      const nextForm = {
        ...prev,
        background: bg,
      };
      if (Object.keys(updatedSkills).length) {
        nextForm.skills = updatedSkills;
      }
      return nextForm;
    });
  }

  // Age Randomizer
  let newAge = Math.round(Math.random() * (50 - 19)) + 19;
  updateForm({ age: newAge });

  // Sex Randomizer
  let sexArr = ["Male", "Female"];
  let randomSex = Math.round(Math.random() * 1);
  let newSex = sexArr[randomSex];
  updateForm({ sex: newSex });

  if (!chosenRace) {
    const fallbackSizeOptions = globalSizeOptions;
    if (fallbackSizeOptions.length) {
      const randomIndex = Math.floor(Math.random() * fallbackSizeOptions.length);
      updateForm({ size: fallbackSizeOptions[randomIndex] });
    }
  }

  // Weight Randomizer
  let randomWeight = Math.round(Math.random() * (220 - 120)) + 120;
  let newWeight = randomWeight;
  updateForm({ weight: newWeight });

  // Stat Randomizer
    const raceAbilities = (chosenRace && chosenRace.abilities) || {};
    let randomStr = sumArray[0];
    updateForm({ str: randomStr });
    let randomDex = sumArray[1];
    updateForm({ dex: randomDex });
    let randomCon = sumArray[2];
    updateForm({ con: randomCon });
    let randomInt = sumArray[3];
    updateForm({ int: randomInt });
    let randomWis = sumArray[4];
    updateForm({ wis: randomWis });
    let randomCha = sumArray[5];
    updateForm({ cha: randomCha });

  const stats = [randomStr, randomDex, randomCon, randomInt, randomWis, randomCha];
  const startStatTotal = stats.reduce((sum, stat) => sum + (Number(stat) || 0), 0);
  updateForm({ startStatTotal });

  const conModValue = Math.floor((randomCon - 10) / 2);
  const newHealth = Number(normalizedOcc.Health);
  const tempHealth = newHealth + conModValue * Number(normalizedOcc.Level);
  updateForm({ health: newHealth, tempHealth });
}

// Health Randomizer
let conMod = Math.floor((form.con - 10) / 2);
const [healthArray, setHealthArray] = useState([]);
const normalizedOccState = form.occupation?.[0] || {};
let newHealth = (healthArray[0] || 0) + Number(normalizedOccState.Health || 0);
let tempHealth = newHealth + Number(conMod) * Number(normalizedOccState.Level || 0);
useEffect(() => {
  updateForm({ health: newHealth });
  updateForm({ tempHealth });
}, [newHealth, tempHealth]);

  useEffect(() => {
  const lvl = (normalizedOccState.Level || 1) - 1;
  const diceValue = normalizedOccState.Health || 0;
  const rollHealthDice = () => {
    const newHealthArray = [];
    for (let i = 0; i < 1; i++) { //array amount
      const rolls = Array.from({ length: lvl }, () => Math.floor(Math.random() * diceValue) + 1);
      const totalSum = rolls.reduce((acc, value) => acc + value, 0);
      newHealthArray.push(totalSum);
    }
    setHealthArray(newHealthArray);  
  };
  rollHealthDice();
  return;
}, [normalizedOccState.Health, normalizedOccState.Level]);

 // Sends form data to database
   const sendToDb = useCallback(async (characterData) => {
    const baseCharacter = characterData ?? form;
    const newCharacter = {
      ...baseCharacter,
      feat: (baseCharacter.feat || []).filter((feat) => feat?.featName && feat.featName.trim() !== ""),
    };

    delete newCharacter.height;

    const raceWithAncestry = attachSelectedAncestryToRace(
      baseCharacter.race,
      {
        dragonAncestryKey: baseCharacter.dragonAncestryKey,
        dragonAncestry: baseCharacter.dragonAncestry,
        giantAncestryKey: baseCharacter.giantAncestryKey,
        giantAncestry: baseCharacter.giantAncestry,
        gnomeLineageKey: baseCharacter.gnomeLineageKey,
        gnomeLineage: baseCharacter.gnomeLineage,
        gnomeLineageAbility: baseCharacter.gnomeLineageAbility,
        elvenLineageKey: baseCharacter.elvenLineageKey,
        elvenLineage: baseCharacter.elvenLineage,
        elvenLineageAbility: baseCharacter.elvenLineageAbility,
        tieflingLegacyKey: baseCharacter.tieflingLegacyKey,
        tieflingLegacy: baseCharacter.tieflingLegacy,
        tieflingLegacyAbility: baseCharacter.tieflingLegacyAbility,
      }
    );
    if (raceWithAncestry) {
      newCharacter.race = raceWithAncestry;
      delete newCharacter.race.__baseSpeed;
      delete newCharacter.race.__baseAbilities;
      delete newCharacter.race.__baseDarkvisionRange;
    } else {
      delete newCharacter.race;
    }
    if (newCharacter.background == null) {
      delete newCharacter.background;
    }
    Object.keys(newCharacter).forEach((key) => {
      if (newCharacter[key] === "") {
        delete newCharacter[key];
      }
    });
    try {
      const response = await apiFetch("/characters/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCharacter),
      });
      if (!response.ok) {
        let message = response.statusText;
        try {
          const errorBody = await response.json();
          const validationMessages = errorBody?.errors?.map((error) => error.msg || error.path).filter(Boolean).join(", ");
          message = validationMessages || errorBody?.message || message;
        } catch (_) {
          // Keep the HTTP status text when the response body is not JSON.
        }
        notify(`An error occurred: ${message}`);
        return false;
      }
      const { insertedId } = await response.json();
      handleClose();
      setRecords((prev) => [...prev, { ...newCharacter, _id: insertedId }]);
      setForm((prev) => ({ ...createDefaultForm(params.campaign), token: user?.username || prev.token || "" }));
      return true;
    } catch (error) {
      notify(error.toString());
      return false;
    }
}, [form, params.campaign, handleClose, setRecords, setForm, createDefaultForm, attachSelectedAncestryToRace, user]);

//--------------------------------------------Create Character (Manual)---------------------
const [show5, setShow5] = useState(false);
const [manualStep, setManualStep] = useState(0);
const [manualTouched, setManualTouched] = useState({});
const [showUnsavedManualDialog, setShowUnsavedManualDialog] = useState(false);
const initialManualSnapshot = useRef(null);
const shouldLockCharacterCreationScroll = show5 || showUnsavedManualDialog || showAbilitySkillModal;
useEffect(() => {
  if (!shouldLockCharacterCreationScroll) {
    document.body.classList.remove("character-creation-modal-open");
    document.documentElement.classList.remove("character-creation-modal-open");
    return undefined;
  }

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const previousBodyPosition = document.body.style.position;
  const previousBodyTop = document.body.style.top;
  const previousBodyWidth = document.body.style.width;

  document.body.classList.add("character-creation-modal-open");
  document.documentElement.classList.add("character-creation-modal-open");
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";

  return () => {
    document.body.classList.remove("character-creation-modal-open");
    document.documentElement.classList.remove("character-creation-modal-open");
    document.body.style.position = previousBodyPosition;
    document.body.style.top = previousBodyTop;
    document.body.style.width = previousBodyWidth;
    window.scrollTo(0, scrollY);
  };
}, [shouldLockCharacterCreationScroll]);
const handleClose5 = useCallback(() => setShow5(false), []);
const handleShow5 = () => {
  const freshForm = { ...createDefaultForm(params.campaign), token: user?.username || form.token || "" };
  setForm(freshForm);
  setSelectedOccupation(null);
  setIsOccupationConfirmed(false);
  initialManualSnapshot.current = JSON.stringify(freshForm);
  setManualStep(0);
  setManualTouched({});
  setShow5(true);
};
const hasManualChanges = useCallback(() => show5 && initialManualSnapshot.current && JSON.stringify(form) !== initialManualSnapshot.current, [form, show5]);
const requestCloseManual = useCallback(() => {
  if (hasManualChanges()) {
    setShowUnsavedManualDialog(true);
    return;
  }
  handleClose5();
}, [handleClose5, hasManualChanges]);
const discardManualChanges = () => {
  setShowUnsavedManualDialog(false);
  handleClose5();
  setForm((prev) => ({ ...createDefaultForm(params.campaign), token: user?.username || prev.token || "" }));
  setSelectedOccupation(null);
  setIsOccupationConfirmed(false);
};

const [selectedOccupation, setSelectedOccupation] = useState(null);
const selectedAddOccupationRef = useRef();

const [getOccupation, setGetOccupation] = useState([]);

const handleOccupationChange = (event) => {
  const selectedIndex = event.target.selectedIndex;
  setSelectedOccupation(getOccupation[selectedIndex - 1]); // Subtract 1 because the first option is empty
  setIsOccupationConfirmed(false);
};

const selectOccupation = (occupation) => {
  setSelectedOccupation(occupation);
  setIsOccupationConfirmed(false);
};

const handleRaceChange = (e) => {
  const key = e.target.value;
  const baseRace = races[key] || null;
  const raceObj = baseRace ? JSON.parse(JSON.stringify(baseRace)) : null;

  setForm((prev) => {
    if (!raceObj) {
      return {
        ...prev,
        race: null,
        speed: 0,
        size: "",
        dragonAncestryKey: "",
        dragonAncestry: null,
        giantAncestryKey: "",
        giantAncestry: null,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
        elvenLineageKey: "",
        elvenLineage: null,
        elvenLineageAbility: "",
        tieflingLegacyKey: "",
        tieflingLegacy: null,
        tieflingLegacyAbility: "",
      };
    }

    const updatedSkills = { ...(prev.skills || {}) };
    if (raceObj.skills) {
      Object.assign(updatedSkills, raceObj.skills);
    }

    const sizeOptions = getRaceSizeOptions(raceObj);
    const shouldRetainPreviousRace = prev.race?.name === raceObj.name;
    const size =
      shouldRetainPreviousRace && sizeOptions.includes(prev.size)
        ? prev.size
        : sizeOptions[0] || (shouldRetainPreviousRace ? prev.size : "");

    let dragonAncestryKey = "";
    let dragonAncestry = null;
    let giantAncestryKey = "";
    let giantAncestry = null;
    let gnomeLineageKey = "";
    let gnomeLineage = null;
    let gnomeLineageAbility = "";
    let elvenLineageKey = "";
    let elvenLineage = null;
    let elvenLineageAbility = "";
    let tieflingLegacyKey = "";
    let tieflingLegacy = null;
    let tieflingLegacyAbility = "";
    if (raceObj.dragonAncestries) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.dragonAncestryKey
          ? prev.dragonAncestryKey
          : "";
      if (prevKey && raceObj.dragonAncestries[prevKey]) {
        dragonAncestryKey = prevKey;
        dragonAncestry = raceObj.dragonAncestries[prevKey];
      }
    }

    if (raceObj.giantAncestries) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.giantAncestryKey
          ? prev.giantAncestryKey
          : "";
      if (prevKey && raceObj.giantAncestries[prevKey]) {
        giantAncestryKey = prevKey;
        giantAncestry = raceObj.giantAncestries[prevKey];
      }
    }

    if (raceObj.gnomeLineages) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.gnomeLineageKey
          ? prev.gnomeLineageKey
          : "";
      if (prevKey && raceObj.gnomeLineages[prevKey]) {
        gnomeLineageKey = prevKey;
        gnomeLineage = raceObj.gnomeLineages[prevKey];
        const prevAbility =
          prev.race?.name === raceObj.name && prev.gnomeLineageAbility
            ? prev.gnomeLineageAbility
            : "";
        if (
          prevAbility &&
          gnomeLineage?.spellcastingAbilities?.includes(prevAbility)
        ) {
          gnomeLineageAbility = prevAbility;
        }
      }
    }

    if (raceObj.elvenLineages) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.elvenLineageKey
          ? prev.elvenLineageKey
          : "";
      if (prevKey && raceObj.elvenLineages[prevKey]) {
        elvenLineageKey = prevKey;
        elvenLineage = raceObj.elvenLineages[prevKey];
        const prevAbility =
          prev.race?.name === raceObj.name && prev.elvenLineageAbility
            ? prev.elvenLineageAbility
            : "";
        if (
          prevAbility &&
          elvenLineage?.spellcastingAbilities?.includes(prevAbility)
        ) {
          elvenLineageAbility = prevAbility;
        } else if ((elvenLineage?.spellcastingAbilities || []).length === 1) {
          elvenLineageAbility = elvenLineage.spellcastingAbilities[0];
        }
      }
    }

    if (raceObj.fiendishLegacies) {
      const prevKey =
        prev.race?.name === raceObj.name && prev.tieflingLegacyKey
          ? prev.tieflingLegacyKey
          : "";
      if (prevKey && raceObj.fiendishLegacies[prevKey]) {
        tieflingLegacyKey = prevKey;
        tieflingLegacy = raceObj.fiendishLegacies[prevKey];
        const prevAbility =
          prev.race?.name === raceObj.name && prev.tieflingLegacyAbility
            ? prev.tieflingLegacyAbility
            : "";
        if (
          prevAbility &&
          tieflingLegacy?.spellcastingAbilities?.includes(prevAbility)
        ) {
          tieflingLegacyAbility = prevAbility;
        } else if ((tieflingLegacy?.spellcastingAbilities || []).length === 1) {
          tieflingLegacyAbility = tieflingLegacy.spellcastingAbilities[0];
        }
      }
    }

    const updatedRace = attachSelectedAncestryToRace(raceObj, {
      dragonAncestryKey,
      dragonAncestry,
      giantAncestryKey,
      giantAncestry,
      gnomeLineageKey,
      gnomeLineage,
      gnomeLineageAbility,
      elvenLineageKey,
      elvenLineage,
      elvenLineageAbility,
      tieflingLegacyKey,
      tieflingLegacy,
      tieflingLegacyAbility,
    });

    const updatedForm = {
      ...prev,
      race: updatedRace,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
      size,
      dragonAncestryKey,
      dragonAncestry,
      giantAncestryKey,
      giantAncestry,
      gnomeLineageKey,
      gnomeLineage,
      gnomeLineageAbility,
      elvenLineageKey,
      elvenLineage,
      elvenLineageAbility,
      tieflingLegacyKey,
      tieflingLegacy,
      tieflingLegacyAbility,
    };

    if (Object.keys(updatedSkills).length) {
      updatedForm.skills = updatedSkills;
    }

    return updatedForm;
  });
};

const handleDragonAncestryChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.dragonAncestries) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: "",
        dragonAncestry: null,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        dragonAncestryKey: "",
        dragonAncestry: null,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const ancestry = prev.race.dragonAncestries[key];
    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: ancestry ? key : "",
      dragonAncestry: ancestry || null,
      giantAncestryKey: "",
      giantAncestry: null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
      elvenLineageKey: "",
      elvenLineage: null,
      elvenLineageAbility: "",
      tieflingLegacyKey: "",
      tieflingLegacy: null,
      tieflingLegacyAbility: "",
    });

    return {
      ...prev,
      race: updatedRace,
      dragonAncestryKey: ancestry ? key : "",
      dragonAncestry: ancestry || null,
      giantAncestryKey: "",
      giantAncestry: null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
      elvenLineageKey: "",
      elvenLineage: null,
      elvenLineageAbility: "",
      tieflingLegacyKey: "",
      tieflingLegacy: null,
      tieflingLegacyAbility: "",
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleGiantAncestryChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.giantAncestries) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: "",
        giantAncestry: null,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: "",
        giantAncestry: null,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const ancestry = prev.race.giantAncestries[key];
    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: "",
      dragonAncestry: null,
      giantAncestryKey: ancestry ? key : "",
      giantAncestry: ancestry || null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
      elvenLineageKey: "",
      elvenLineage: null,
      elvenLineageAbility: "",
      tieflingLegacyKey: "",
      tieflingLegacy: null,
      tieflingLegacyAbility: "",
    });

    return {
      ...prev,
      race: updatedRace,
      dragonAncestryKey: "",
      dragonAncestry: null,
      giantAncestryKey: ancestry ? key : "",
      giantAncestry: ancestry || null,
      gnomeLineageKey: "",
      gnomeLineage: null,
      gnomeLineageAbility: "",
      elvenLineageKey: "",
      elvenLineage: null,
      elvenLineageAbility: "",
      tieflingLegacyKey: "",
      tieflingLegacy: null,
      tieflingLegacyAbility: "",
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleGnomeLineageChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.gnomeLineages) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const lineage = prev.race.gnomeLineages[key];
    const abilityOptions = lineage?.spellcastingAbilities || [];
    let nextAbility = "";
    if (lineage) {
      if (abilityOptions.includes(prev.gnomeLineageAbility)) {
        nextAbility = prev.gnomeLineageAbility;
      } else if (abilityOptions.length === 1) {
        nextAbility = abilityOptions[0];
      }
    }

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: lineage ? key : "",
      gnomeLineage: lineage || null,
      gnomeLineageAbility: nextAbility,
      elvenLineageKey: prev.elvenLineageKey,
      elvenLineage: prev.elvenLineage,
      elvenLineageAbility: prev.elvenLineageAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      gnomeLineageKey: lineage ? key : "",
      gnomeLineage: lineage || null,
      gnomeLineageAbility: nextAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleGnomeLineageAbilityChange = (e) => {
  const ability = e.target.value;
  setForm((prev) => {
    if (!prev.race?.gnomeLineages || !prev.gnomeLineageKey) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: "",
        gnomeLineage: null,
        gnomeLineageAbility: "",
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        gnomeLineageAbility: "",
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const lineage = prev.race.gnomeLineages[prev.gnomeLineageKey];
    const validAbility =
      lineage?.spellcastingAbilities?.includes(ability) ? ability : "";

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: lineage ? prev.gnomeLineageKey : "",
      gnomeLineage: lineage || null,
      gnomeLineageAbility: validAbility,
      elvenLineageKey: prev.elvenLineageKey,
      elvenLineage: prev.elvenLineage,
      elvenLineageAbility: prev.elvenLineageAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      gnomeLineageAbility: validAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleElvenLineageChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.elvenLineages) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: "",
        elvenLineage: null,
        elvenLineageAbility: "",
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        elvenLineageKey: "",
        elvenLineage: null,
        elvenLineageAbility: "",
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const lineage = prev.race.elvenLineages[key];
    const abilityOptions = lineage?.spellcastingAbilities || [];
    let nextAbility = "";
    if (lineage) {
      if (abilityOptions.includes(prev.elvenLineageAbility)) {
        nextAbility = prev.elvenLineageAbility;
      } else if (abilityOptions.length === 1) {
        nextAbility = abilityOptions[0];
      }
    }

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: prev.gnomeLineageKey,
      gnomeLineage: prev.gnomeLineage,
      gnomeLineageAbility: prev.gnomeLineageAbility,
      elvenLineageKey: lineage ? key : "",
      elvenLineage: lineage || null,
      elvenLineageAbility: nextAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      elvenLineageKey: lineage ? key : "",
      elvenLineage: lineage || null,
      elvenLineageAbility: nextAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleElvenLineageAbilityChange = (e) => {
  const ability = e.target.value;
  setForm((prev) => {
    if (!prev.race?.elvenLineages || !prev.elvenLineageKey) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: "",
        elvenLineage: null,
        elvenLineageAbility: "",
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
      });
      return {
        ...prev,
        race: updatedRace,
        elvenLineageAbility: "",
        tieflingLegacyKey: prev.tieflingLegacyKey,
        tieflingLegacy: prev.tieflingLegacy,
        tieflingLegacyAbility: prev.tieflingLegacyAbility,
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const lineage = prev.race.elvenLineages[prev.elvenLineageKey];
    const validAbility =
      lineage?.spellcastingAbilities?.includes(ability) ? ability : "";

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: prev.gnomeLineageKey,
      gnomeLineage: prev.gnomeLineage,
      gnomeLineageAbility: prev.gnomeLineageAbility,
      elvenLineageKey: lineage ? prev.elvenLineageKey : "",
      elvenLineage: lineage || null,
      elvenLineageAbility: validAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      elvenLineageAbility: validAbility,
      tieflingLegacyKey: prev.tieflingLegacyKey,
      tieflingLegacy: prev.tieflingLegacy,
      tieflingLegacyAbility: prev.tieflingLegacyAbility,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleTieflingLegacyChange = (e) => {
  const key = e.target.value;
  setForm((prev) => {
    if (!prev.race?.fiendishLegacies) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: "",
        tieflingLegacy: null,
        tieflingLegacyAbility: "",
      });
      return {
        ...prev,
        race: updatedRace,
        tieflingLegacyKey: "",
        tieflingLegacy: null,
        tieflingLegacyAbility: "",
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const legacy = prev.race.fiendishLegacies[key];
    const abilityOptions = legacy?.spellcastingAbilities || [];
    let nextAbility = "";
    if (legacy) {
      if (abilityOptions.includes(prev.tieflingLegacyAbility)) {
        nextAbility = prev.tieflingLegacyAbility;
      } else if (abilityOptions.length === 1) {
        nextAbility = abilityOptions[0];
      }
    }

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: prev.gnomeLineageKey,
      gnomeLineage: prev.gnomeLineage,
      gnomeLineageAbility: prev.gnomeLineageAbility,
      elvenLineageKey: prev.elvenLineageKey,
      elvenLineage: prev.elvenLineage,
      elvenLineageAbility: prev.elvenLineageAbility,
      tieflingLegacyKey: legacy ? key : "",
      tieflingLegacy: legacy || null,
      tieflingLegacyAbility: nextAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      tieflingLegacyKey: legacy ? key : "",
      tieflingLegacy: legacy || null,
      tieflingLegacyAbility: nextAbility,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleTieflingLegacyAbilityChange = (e) => {
  const ability = e.target.value;
  setForm((prev) => {
    if (!prev.race?.fiendishLegacies || !prev.tieflingLegacyKey) {
      const updatedRace = attachSelectedAncestryToRace(prev.race, {
        dragonAncestryKey: prev.dragonAncestryKey,
        dragonAncestry: prev.dragonAncestry,
        giantAncestryKey: prev.giantAncestryKey,
        giantAncestry: prev.giantAncestry,
        gnomeLineageKey: prev.gnomeLineageKey,
        gnomeLineage: prev.gnomeLineage,
        gnomeLineageAbility: prev.gnomeLineageAbility,
        elvenLineageKey: prev.elvenLineageKey,
        elvenLineage: prev.elvenLineage,
        elvenLineageAbility: prev.elvenLineageAbility,
        tieflingLegacyKey: "",
        tieflingLegacy: null,
        tieflingLegacyAbility: "",
      });
      return {
        ...prev,
        race: updatedRace,
        tieflingLegacyAbility: "",
        speed:
          typeof updatedRace?.speed === "number"
            ? updatedRace.speed
            : prev.speed,
      };
    }

    const legacy = prev.race.fiendishLegacies[prev.tieflingLegacyKey];
    const validAbility =
      legacy?.spellcastingAbilities?.includes(ability) ? ability : "";

    const updatedRace = attachSelectedAncestryToRace(prev.race, {
      dragonAncestryKey: prev.dragonAncestryKey,
      dragonAncestry: prev.dragonAncestry,
      giantAncestryKey: prev.giantAncestryKey,
      giantAncestry: prev.giantAncestry,
      gnomeLineageKey: prev.gnomeLineageKey,
      gnomeLineage: prev.gnomeLineage,
      gnomeLineageAbility: prev.gnomeLineageAbility,
      elvenLineageKey: prev.elvenLineageKey,
      elvenLineage: prev.elvenLineage,
      elvenLineageAbility: prev.elvenLineageAbility,
      tieflingLegacyKey: legacy ? prev.tieflingLegacyKey : "",
      tieflingLegacy: legacy || null,
      tieflingLegacyAbility: validAbility,
    });

    return {
      ...prev,
      race: updatedRace,
      tieflingLegacyAbility: validAbility,
      speed:
        typeof updatedRace?.speed === "number"
          ? updatedRace.speed
          : prev.speed,
    };
  });
};

const handleBackgroundChange = (e) => {
  const key = e.target.value;
  const base = backgrounds[key] || null;
  const bgObj = base ? JSON.parse(JSON.stringify(base)) : null;
  setForm((prev) => {
    if (!bgObj) {
      return {
        ...prev,
        background: null,
      };
    }

    const updatedSkills = { ...(prev.skills || {}) };
    if (bgObj.skills) {
      Object.assign(updatedSkills, bgObj.skills);
    }

    const updatedForm = {
      ...prev,
      background: bgObj,
    };

    if (Object.keys(updatedSkills).length) {
      updatedForm.skills = updatedSkills;
    }

    return updatedForm;
  });
};

const [isOccupationConfirmed, setIsOccupationConfirmed] = useState(false);

const handleConfirmOccupation = useCallback(() => {
  if (selectedOccupation && !isOccupationConfirmed) {
    const selectedAddOccupation = selectedOccupation.name;
    const occupationExists = form.occupation.some(
      (occupation) => occupation.Occupation === selectedOccupation.name
    );
    const selectedAddOccupationObject = selectedOccupation || getOccupation.find(
      (occupation) => occupation.name === selectedAddOccupation
    );

    if (!occupationExists && selectedAddOccupationObject) {
      const hitDieValue = Number(selectedAddOccupationObject.hitDie || 0);
      const normalizedOcc = {
        Occupation: selectedAddOccupationObject.name,
        Health: hitDieValue,
        Level: 1,
        proficiencyPoints: selectedAddOccupationObject.proficiencies?.skills?.count || 0,
        armor: selectedAddOccupationObject.proficiencies?.armor || [],
        weapons: selectedAddOccupationObject.proficiencies?.weapons || [],
        tools: selectedAddOccupationObject.proficiencies?.tools || [],
        savingThrows: selectedAddOccupationObject.proficiencies?.savingThrows || [],
        skills: (() => {
          const skills = {};
          const profSkills = selectedAddOccupationObject.proficiencies?.skills;
          if (profSkills?.options && profSkills.count) {
            const available = [...profSkills.options];
            for (let i = 0; i < profSkills.count; i++) {
              if (!available.length) break;
              const idx = Math.floor(Math.random() * available.length);
              const skill = available.splice(idx, 1)[0];
              skills[skill] = { proficient: true };
            }
          }
          return skills;
        })(),
      };

      const addOccupationStr = Number(selectedAddOccupationObject.str || 0) + Number(form.str);
      const addOccupationDex = Number(selectedAddOccupationObject.dex || 0) + Number(form.dex);
      const addOccupationCon = Number(selectedAddOccupationObject.con || 0) + Number(form.con);
      const addOccupationInt = Number(selectedAddOccupationObject.int || 0) + Number(form.int);
      const addOccupationWis = Number(selectedAddOccupationObject.wis || 0) + Number(form.wis);
      const addOccupationCha = Number(selectedAddOccupationObject.cha || 0) + Number(form.cha);

      const totalNewStats =
        addOccupationStr +
        addOccupationDex +
        addOccupationCon +
        addOccupationInt +
        addOccupationWis +
        addOccupationCha;

      const conModValue = Math.floor((addOccupationCon - 10) / 2);
      const calculatedTempHealth = hitDieValue +
        conModValue * Number(normalizedOcc.Level || 1);
      const normalizedTempHealth = Number.isFinite(calculatedTempHealth)
        ? calculatedTempHealth
        : hitDieValue;

      const updatedForm = {
        ...form,
        occupation: [normalizedOcc],
        str: addOccupationStr,
        dex: addOccupationDex,
        con: addOccupationCon,
        int: addOccupationInt,
        wis: addOccupationWis,
        cha: addOccupationCha,
        startStatTotal: totalNewStats,
        health: hitDieValue,
        tempHealth: normalizedTempHealth,
      };

      setForm(updatedForm);
      setIsOccupationConfirmed(true);
      return updatedForm;
    }
  }
  return form;
}, [selectedOccupation, isOccupationConfirmed, form, getOccupation, setForm]);

const sendManualToDb = useCallback(async (characterData) => {
  const baseCharacter = characterData ?? form;
  const newCharacter = {
    ...baseCharacter,
    feat: (baseCharacter.feat || []).filter((feat) => feat?.featName && feat.featName.trim() !== ""),
  };
  delete newCharacter.height;
  const raceWithAncestry = attachSelectedAncestryToRace(
    baseCharacter.race,
    {
      dragonAncestryKey: baseCharacter.dragonAncestryKey,
      dragonAncestry: baseCharacter.dragonAncestry,
      giantAncestryKey: baseCharacter.giantAncestryKey,
      giantAncestry: baseCharacter.giantAncestry,
      gnomeLineageKey: baseCharacter.gnomeLineageKey,
      gnomeLineage: baseCharacter.gnomeLineage,
      gnomeLineageAbility: baseCharacter.gnomeLineageAbility,
      elvenLineageKey: baseCharacter.elvenLineageKey,
      elvenLineage: baseCharacter.elvenLineage,
      elvenLineageAbility: baseCharacter.elvenLineageAbility,
      tieflingLegacyKey: baseCharacter.tieflingLegacyKey,
      tieflingLegacy: baseCharacter.tieflingLegacy,
      tieflingLegacyAbility: baseCharacter.tieflingLegacyAbility,
    }
  );
  if (raceWithAncestry) {
    newCharacter.race = raceWithAncestry;
    delete newCharacter.race.__baseSpeed;
    delete newCharacter.race.__baseAbilities;
    delete newCharacter.race.__baseDarkvisionRange;
  } else {
    delete newCharacter.race;
  }
  if (newCharacter.race == null) {
    delete newCharacter.race;
  }
  if (newCharacter.background == null) {
    delete newCharacter.background;
  }
  Object.keys(newCharacter).forEach((key) => {
    if (newCharacter[key] === "") {
      delete newCharacter[key];
    }
  });
  try {
    const response = await apiFetch("/characters/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newCharacter),
    });
    if (!response.ok) {
      let message = response.statusText;
      try {
        const errorBody = await response.json();
        const validationMessages = errorBody?.errors?.map((error) => error.msg || error.path).filter(Boolean).join(", ");
        message = validationMessages || errorBody?.message || message;
      } catch (_) {
        // Keep the HTTP status text when the response body is not JSON.
      }
      notify(`An error occurred: ${message}`);
      return false;
    }
    const { insertedId } = await response.json();
    handleClose5();
    setRecords((prev) => [...prev, { ...newCharacter, _id: insertedId }]);
    setForm((prev) => ({ ...createDefaultForm(params.campaign), token: user?.username || prev.token || "" }));
    return true;
  } catch (error) {
    notify(error.toString());
    return false;
  }
}, [form, params.campaign, handleClose5, setRecords, setForm, createDefaultForm, attachSelectedAncestryToRace, user]);

// Function to handle submission for manual character creation.
const onSubmitManual = async (e) => {
  e.preventDefault();
  const updatedForm = await handleConfirmOccupation();
  if (updatedForm.race?.abilityChoices || updatedForm.race?.skillChoices) {
    setAbilitySelections(Array(updatedForm.race?.abilityChoices?.count || 0).fill(""));
    setSkillSelections(Array(updatedForm.race?.skillChoices?.count || 0).fill(""));
    setShowAbilitySkillModal(true);
    setForm(updatedForm);
    return;
  }
  await sendManualToDb(updatedForm);
};

const handleAbilitySkillConfirm = async () => {
  const raceObj = { ...form.race, abilities: { ...(form.race?.abilities || {}) } };
  let updatedSkills = { ...(form.skills || {}) };

  if (raceObj.abilityChoices) {
    abilitySelections.forEach((choice) => {
      if (choice) {
        raceObj.abilities[choice] = (raceObj.abilities[choice] || 0) + 1;
      }
    });
    delete raceObj.abilityChoices;
  }

  if (raceObj.skillChoices) {
    raceObj.skills = raceObj.skills || {};
    skillSelections.forEach((skill) => {
      if (skill) {
        raceObj.skills[skill] = { proficient: true };
        updatedSkills[skill] = { proficient: true };
      }
    });
    delete raceObj.skillChoices;
  }

  const updatedRace = attachSelectedAncestryToRace(
    raceObj,
    {
      dragonAncestryKey: form.dragonAncestryKey,
      dragonAncestry: form.dragonAncestry,
      giantAncestryKey: form.giantAncestryKey,
      giantAncestry: form.giantAncestry,
      gnomeLineageKey: form.gnomeLineageKey,
      gnomeLineage: form.gnomeLineage,
      gnomeLineageAbility: form.gnomeLineageAbility,
      elvenLineageKey: form.elvenLineageKey,
      elvenLineage: form.elvenLineage,
      elvenLineageAbility: form.elvenLineageAbility,
      tieflingLegacyKey: form.tieflingLegacyKey,
      tieflingLegacy: form.tieflingLegacy,
      tieflingLegacyAbility: form.tieflingLegacyAbility,
    }
  );
  const updatedForm = {
    ...form,
    race: updatedRace,
    speed:
      typeof updatedRace?.speed === "number" ? updatedRace.speed : form.speed,
  };
  if (Object.keys(updatedSkills).length) {
    updatedForm.skills = updatedSkills;
  }

  setForm(updatedForm);
  if (show5) {
    const saved = await sendManualToDb(updatedForm);
    if (!saved) {
      return;
    }
  } else {
    const saved = await sendToDb(updatedForm);
    if (!saved) {
      return;
    }
  }
  setShowAbilitySkillModal(false);
  setAbilitySelections([]);
  setSkillSelections([]);
};

const getAvailableAbilityOptions = (index) => {
  const taken = abilitySelections.filter((_, i) => i !== index);
  return form.race?.abilityChoices?.options.filter((opt) => !taken.includes(opt)) || [];
};

const getAvailableSkillOptions = (index) => {
  const taken = skillSelections.filter((_, i) => i !== index);
  const raceOptions = form.race?.skillChoices?.options;
  const allOptions = raceOptions?.length
    ? raceOptions
    : SKILLS.map((s) => s.key);
  const base = allOptions.filter((s) => !form.skills?.[s]?.proficient);
  return base.filter((opt) => !taken.includes(opt));
};

  return (
    <div className="character-select-page" style={{ backgroundImage: `url(${loginbg})` }}>
      <div className="character-select-shell">
        <CampaignHero
          campaignName={params.campaign.toString()}
          dmName={dmName}
          playerCount={campaignPlayerCount}
          onCreateManual={(e) => { e.preventDefault(); handleShow5(); }}
          onCreateRandom={(e) => { e.preventDefault(); bigMaff(); handleShow(); }}
        />

        <section className="character-select-library">
          <div className="character-select-library__header">
            <div>
              <p className="character-select-kicker">Character Library</p>
              <h2>Choose your hero</h2>
            </div>
          </div>
          {records.length ? <CharacterGrid records={records} onContinue={navigateToCharacter} /> : <EmptyState onCreateManual={handleShow5} />}
        </section>

    
      </div>
    {/* ---------------------------Create Character (Random)------------------------------------------------------- */}
    <Modal className="dnd-modal" centered show={show} onHide={handleClose}>
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Create Random</Card.Title>
        <Card.Body>   
        <div className="text-center">
      <Form onSubmit={onSubmit} className="px-5">
      <Form.Group className="mb-3 pt-3">
       <Form.Label className="text-light">Character Name</Form.Label>
       <Form.Control className="mb-2" onChange={(e) => updateForm({ characterName: e.target.value })}
        type="text" placeholder="Enter character name" />        
     </Form.Group>
     <div className="text-center">
     <Button variant="primary" onClick={handleClose} type="submit">
            Create
          </Button>
          <Button className="ms-4" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          </div>
     </Form>
     </div>
     </Card.Body> 
     </Card>  
     </div>      
      </Modal>
       {/* ---------------------------Create Character (Manual)------------------------------------------------------- */}
    <Modal className="dnd-modal manual-character-modal" dialogClassName="manual-character-modal__dialog" centered show={show5} onHide={requestCloseManual} backdrop="static" keyboard={false}>
      <CharacterCreationWizard
        form={form}
        updateForm={updateForm}
        races={races}
        backgrounds={backgrounds}
        occupations={getOccupation}
        selectedOccupation={selectedOccupation}
        selectedAddOccupationRef={selectedAddOccupationRef}
        sizeOptions={sizeOptionsForManual}
        step={manualStep}
        setStep={setManualStep}
        touched={manualTouched}
        setTouched={setManualTouched}
        onClose={requestCloseManual}
        onSubmit={onSubmitManual}
        onRaceChange={handleRaceChange}
        onClassChange={handleOccupationChange}
        onSelectClass={selectOccupation}
        onBackgroundChange={handleBackgroundChange}
        onDragonAncestryChange={handleDragonAncestryChange}
        onGiantAncestryChange={handleGiantAncestryChange}
        onElvenLineageChange={handleElvenLineageChange}
        onElvenLineageAbilityChange={handleElvenLineageAbilityChange}
        onGnomeLineageChange={handleGnomeLineageChange}
        onGnomeLineageAbilityChange={handleGnomeLineageAbilityChange}
        onTieflingLegacyChange={handleTieflingLegacyChange}
        onTieflingLegacyAbilityChange={handleTieflingLegacyAbilityChange}
      />
    </Modal>
    <Modal className="dnd-modal unsaved-character-modal" centered show={showUnsavedManualDialog} onHide={() => setShowUnsavedManualDialog(false)}>
      <Card className="dnd-background unsaved-character-modal__card">
        <Card.Body>
          <p className="character-select-kicker">Unsaved hero</p>
          <h2>Discard this character?</h2>
          <p>Your current character creation progress will be lost if you leave now.</p>
          <div className="unsaved-character-modal__actions">
            <Button variant="secondary" onClick={discardManualChanges}>Discard</Button>
            <Button variant="primary" onClick={() => setShowUnsavedManualDialog(false)}>Continue Editing</Button>
          </div>
        </Card.Body>
      </Card>
    </Modal>
       <Modal className="dnd-modal" centered show={showAbilitySkillModal} onHide={() => setShowAbilitySkillModal(false)}>
       <div className="text-center">
        <Card className="dnd-background">
          <Card.Title>Choose Bonus Options</Card.Title>
        <Card.Body>
        {form.race?.abilityChoices && abilitySelections.map((sel, idx) => (
          <Form.Group className="mb-2" key={`ability-${idx}`}>
            <Form.Label className="text-light">Ability Choice {idx + 1}</Form.Label>
            <Form.Select value={sel} onChange={(e) => {
              const arr = [...abilitySelections];
              arr[idx] = e.target.value;
              setAbilitySelections(arr);
            }}>
              <option value="" disabled>Select ability</option>
              {getAvailableAbilityOptions(idx).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          </Form.Group>
        ))}
        {form.race?.skillChoices && skillSelections.map((sel, idx) => (
          <Form.Group className="mb-2" key={`skill-${idx}`}>
            <Form.Label className="text-light">Skill Choice {idx + 1}</Form.Label>
            <Form.Select value={sel} onChange={(e) => {
              const arr = [...skillSelections];
              arr[idx] = e.target.value;
              setSkillSelections(arr);
            }}>
              <option value="" disabled>Select skill</option>
              {getAvailableSkillOptions(idx).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Form.Select>
          </Form.Group>
        ))}
        <div className="text-center">
          <Button variant="primary" onClick={handleAbilitySkillConfirm}>
            Confirm
          </Button>
          <Button className="ms-4" variant="secondary" onClick={() => setShowAbilitySkillModal(false)}>
            Close
          </Button>
        </div>
        </Card.Body>
        </Card>
        </div>
       </Modal>
      </div>

  );
}
