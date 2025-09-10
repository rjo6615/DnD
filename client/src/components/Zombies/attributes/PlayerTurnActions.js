import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import { Button, Modal, Card, Table } from "react-bootstrap";
import UpcastModal from './UpcastModal';
import sword from "../../../images/sword.png";

// Dice rolling helper used by calculateDamage and component actions
function rollDice(numberOfDiceValue, sidesOfDiceValue) {
  if (numberOfDiceValue <= 0 || sidesOfDiceValue <= 0) {
    return "Both the number of dice and sides must be greater than zero.";
  }

  const results = [];
  for (let i = 0; i < numberOfDiceValue; i++) {
    // Generate a random number between 1 and sidesOfDiceValue (inclusive)
    const result = Math.floor(Math.random() * sidesOfDiceValue) + 1;
    results.push(result);
  }

  return results;
}

export function calculateDamage(
  damageString,
  ability = 0,
  crit = false,
  roll = rollDice,
  extraDice,
  levelsAbove = 0
) {
  const cleanString = damageString.split(' ')[0];
  const match = cleanString.match(/^(\d+)(?:d(\d+)([+-]\d+)?)?$/);
  if (!match) {
    // eslint-disable-next-line no-console
    console.error('Invalid damage string');
    return null;
  }

  if (!match[2]) {
    // Flat damage: ignore crit flag and simply add ability modifier once
    const baseValue = parseInt(match[1], 10);
    return baseValue + ability;
  }

  const numberOfDiceValue = parseInt(match[1], 10);
  const sidesOfDiceValue = parseInt(match[2], 10);
  const modifier = parseInt(match[3] || 0, 10);

  // Roll the initial set of dice
  const diceRolls = roll(numberOfDiceValue, sidesOfDiceValue);
  let damageSum = diceRolls.reduce((partialSum, a) => partialSum + a, 0);

  // Roll any extra dice from upcasting
  if (extraDice && levelsAbove > 0) {
    const totalExtra = extraDice.count * levelsAbove;
    const extraRolls = roll(totalExtra, extraDice.sides);
    damageSum += extraRolls.reduce((partialSum, a) => partialSum + a, 0);
  }

  // On a critical hit, roll an additional set of dice and add to the total
  if (crit) {
    const critRolls = roll(numberOfDiceValue, sidesOfDiceValue);
    damageSum += critRolls.reduce((partialSum, a) => partialSum + a, 0);
    if (extraDice && levelsAbove > 0) {
      const totalExtra = extraDice.count * levelsAbove;
      const critExtra = roll(totalExtra, extraDice.sides);
      damageSum += critExtra.reduce((partialSum, a) => partialSum + a, 0);
    }
  }

  // Add numeric modifier and ability modifier once
  return damageSum + modifier + ability;
}

const PlayerTurnActions = React.forwardRef(
  (
    {
      form,
      strMod,
      atkBonus,
      dexMod,
      headerHeight = 0,
      onCastSpell,
      availableSlots = { regular: {}, warlock: {} },
    },
    ref
  ) => {
  // -----------------------------------------------------------Modal for attacks------------------------------------------------------------------------
  const [showAttack, setShowAttack] = useState(false);
  const handleCloseAttack = () => setShowAttack(false);
  const handleShowAttack = () => setShowAttack(true);

  const FOOTER_HEIGHT = 80;
  const damageRef = useRef(null);
  const [damageHeight, setDamageHeight] = useState(0);

  useEffect(() => {
    if (damageRef.current) {
      const style = getComputedStyle(damageRef.current);
      const margins = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
      setDamageHeight(damageRef.current.offsetHeight + margins);
    }
  }, []);

//--------------------------------------------Critical status------------------------------------------------
const [isCritical, setIsCritical] = useState(false);
const [isFumble, setIsFumble] = useState(false);
  // --------------------------------Breaks down weapon damage into useable numbers--------------------------------
  const abilityForWeapon = (weapon) =>
    weapon.category?.toLowerCase().includes('ranged') ? dexMod : strMod;

  const getAttackBonus = (weapon) => atkBonus + abilityForWeapon(weapon);

  const getDamageString = (weapon) => {
    const ability = abilityForWeapon(weapon);
    const dice = weapon.damage.split(' ')[0];
    return `${dice}+${ability}`;
  };

  const handleWeaponAttack = (weapon) => {
    const ability = abilityForWeapon(weapon);
    const damageValue = calculateDamage(weapon.damage, ability, isCritical);
    if (damageValue === null) return;
    updateDamageValueWithAnimation(damageValue);
  };

  const [showUpcast, setShowUpcast] = useState(false);
  const [pendingSpell, setPendingSpell] = useState(null);

  const totalLevel = useMemo(
    () =>
      Array.isArray(form.occupation)
        ? form.occupation.reduce((total, el) => total + Number(el.Level), 0)
        : 0,
    [form.occupation]
  );

  const applyUpcast = (spell, level, crit, slotType) => {
    const diff = level - (spell.level || 0);
    let extra;
    if (diff > 0 && spell.higherLevels) {
      const incMatch = spell.higherLevels.match(/(\d+)d(\d+)/);
      if (incMatch) {
        extra = {
          count: parseInt(incMatch[1], 10),
          sides: parseInt(incMatch[2], 10),
        };
      }
    }
    if (spell.scaling) {
      if (totalLevel >= 17 && spell.scaling[17]) spell.damage = spell.scaling[17];
      else if (totalLevel >= 11 && spell.scaling[11]) spell.damage = spell.scaling[11];
      else if (totalLevel >= 5 && spell.scaling[5]) spell.damage = spell.scaling[5];
    }
    const value = calculateDamage(
      spell.damage,
      0,
      crit || isCritical,
      rollDice,
      extra,
      diff > 0 ? diff : 0
    );
    if (value === null) return;
    updateDamageValueWithAnimation(value);
    if (slotType) onCastSpell?.(slotType, level);
    else onCastSpell?.(level);
  };

  const handleSpellsButtonClick = (spell, crit = false) => {
    if (!spell?.damage) return;
    if (spell.higherLevels) {
      setPendingSpell({ spell, crit: crit || isCritical });
      setShowUpcast(true);
      return;
    }
    applyUpcast(spell, spell.level, crit || isCritical);
  };

const handleDamageClick = () => {
  setIsCritical((prev) => !prev);
  setIsFumble(false);
};

// Spells may come from different caster types (e.g., Wizard, Cleric). Before
// rendering the spell table, group spells by caster type and sort each group by
// level so they display in a predictable order.
const sortedSpells = useMemo(() => {
  if (!Array.isArray(form.spells)) return [];
  const groups = (form.spells || []).reduce((acc, spell) => {
    if (!spell) return acc;
    const caster = spell.casterType || spell.caster || 'Unknown';
    if (!acc[caster]) acc[caster] = [];
    acc[caster].push(spell);
    return acc;
  }, {});
  return Object.keys(groups)
    .sort()
    .flatMap((caster) =>
      groups[caster].sort((a, b) => (a.level || 0) - (b.level || 0))
    );
}, [form.spells]);

// -----------------------------------------Dice roller for damage-------------------------------------------------------------------
const opacity = 0.85;
// Calculate RGBA color with opacity
const rgbaColor = `rgba(${parseInt(form.diceColor.slice(1, 3), 16)}, ${parseInt(form.diceColor.slice(3, 5), 16)}, ${parseInt(form.diceColor.slice(5, 7), 16)}, ${opacity})`;

// Apply the calculated RGBA color to the element
document.documentElement.style.setProperty('--dice-face-color', rgbaColor);

const [loading, setLoading] = useState(false);
const [damageValue, setDamageValue] = useState(0);

useEffect(() => {
  if (loading) {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1 second delay
    return () => clearTimeout(timer);
  }
}, [loading]);

const updateDamageValueWithAnimation = (newValue) => {
  setLoading(true);
  setPulseClass('');
  setDamageValue(newValue);
};

useImperativeHandle(ref, () => ({ updateDamageValueWithAnimation }));

const [pulseClass, setPulseClass] = useState('');

// Allow other components to display values in the damage circle
useEffect(() => {
  const handler = (e) => {
    const { value, critical, fumble } = e.detail || {};
    const num = Number(value);
    if (!Number.isNaN(num)) {
      updateDamageValueWithAnimation(num);
    }
    setIsCritical(!!critical && !fumble);
    setIsFumble(!!fumble);
  };
  window.addEventListener('damage-roll', handler);
  return () => window.removeEventListener('damage-roll', handler);
}, []);

useEffect(() => {
  if (!loading) {
    const cls = isCritical ? 'pulse-gold' : isFumble ? 'pulse-red' : 'pulse';
    setPulseClass(cls);
    const timer = setTimeout(() => {
      setPulseClass('');
      setIsCritical(false);
      setIsFumble(false);
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [loading]);
//-------------------------------------------D20 Dice Roller--------------------------------------------------------------------------
const [sides] = useState(20);
const [initialSide] = useState(1);
const [timeoutId, setTimeoutId] = useState(null);
const [animationDuration] = useState('3000ms');
const [activeFace, setActiveFace] = useState(null);
const [rolling, setRolling] = useState(false);
const face = Math.floor(Math.random() * sides) + initialSide;

const randomFace = () => {
  return face === activeFace ? randomFace() : face;
};

const rollTo = (face) => {
  clearTimeout(timeoutId);
  setActiveFace(face);
  setRolling(false);

  if (face === 20 || face === 1) {
    showSparklesEffect({ x: 100 / 2, y: 100 / 2 });
    setTimeout(() => {
      showSparklesEffect();
    }, 5000);
  }
};

const handleRandomizeClick = (e) => {
  e.preventDefault(); // Prevent page refresh
  setRolling(true);
  clearTimeout(timeoutId);

  const newTimeoutId = setTimeout(() => {
    setRolling(false);
    rollTo(randomFace());
  }, parseInt(animationDuration, 10));

  setTimeoutId(newTimeoutId);
};

useEffect(() => {
  // Cleanup effect
  return () => clearTimeout(timeoutId);
}, [timeoutId]);

const faceElements = [];
for (let i = 1; i <= 20; i++) {
  faceElements.push(
    <figure className={`face face-${i}`} key={i}></figure>
  );
}
const [showSparkles, setShowSparkles] = useState(false);
const [showSparkles1, setShowSparkles1] = useState(false);

// Create a function to display sparkles
const showSparklesEffect = () => {
  if (face === 20) {
    setShowSparkles(true);
    setTimeout(() => {
      setShowSparkles(false);
    }, 2000);
  } else if (face === 1) {
    setShowSparkles1(true);
    setTimeout(() => {
      setShowSparkles1(false);
    }, 2000);
  }
};
//-------------------------------------------------------------Display-----------------------------------------------------------------------------------------
  return (
    <div>
      <div
        id="damageAmount"
        ref={damageRef}
        className={`mt-3 ${loading ? 'loading' : ''} ${pulseClass} ${isCritical ? 'critical-active' : ''} ${isFumble ? 'critical-failure' : ''}`}
        style={{ margin: "0 auto" }}
        onClick={handleDamageClick}
      >
        <span
          id="damageValue"
          className={`${loading ? 'hidden' : ''} ${typeof damageValue === 'string' ? 'spell-cast-label' : ''}`}
        >
          {damageValue}
        </span>
        <div id="loadingSpinner" className={`spinner ${loading ? '' : 'hidden'}`}></div>
      </div>
      
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: `calc(100vh - ${FOOTER_HEIGHT + headerHeight + damageHeight}px)`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
          {/* Attack Button */}
          <button
            onClick={handleShowAttack}
            style={{
              width: "64px",
              height: "64px",
              backgroundImage: `url(${sword})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: "none",
              transition: "transform 0.2s ease",
              cursor: "pointer",
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            title="Attack"
          />
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="content">
            {showSparkles && (
              <div className="sparkle"></div>
            )}
            {showSparkles1 && (
              <div className="sparkle1"></div>
            )}
            <div onClick={handleRandomizeClick}
    className={`die ${rolling ? 'rolling' : ''}`} data-face={activeFace}>
      {faceElements}
    </div>
          </div>
        </div>
      </div>
{/* Attack Modal */}

      <Modal size="lg" className="dnd-modal modern-modal" centered show={showAttack} onHide={handleCloseAttack}>
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Attacks</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Title className="modal-title">Weapons</Card.Title>
              <Table className="modern-table" striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Weapon Name</th>
                    <th>Attack Bonus</th>
                    <th>Damage</th>
                    <th>Attack</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(form.weapon) &&
                    form.weapon.map((weapon) => (
                      <tr key={weapon.name}>
                        <td className="text-capitalize">{weapon.name}</td>
                        <td>{getAttackBonus(weapon)}</td>
                        <td>{getDamageString(weapon)}</td>
                        <td>
                          <Button
                            onClick={() => {
                              handleWeaponAttack(weapon);
                              handleCloseAttack();
                            }}
                            variant="link"
                            aria-label="roll"
                          >
                            <i className="fa-solid fa-dice-d20"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            {Array.isArray(form.spells) && form.spells.some((s) => s?.damage) && (
              <>
                <Card.Title className="modal-title mt-4">Spells</Card.Title>
                <Table className="modern-table" striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Spell Name</th>
                      <th>Level</th>
                      <th>Damage</th>
                      <th>Casting Time</th>
                      <th>Range</th>
                      <th>Duration</th>
                      <th>Attack</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSpells
                      .filter((s) => s && s.damage)
                      .map((spell, idx) => (
                        <tr key={idx}>
                          <td>{spell.name}</td>
                          <td>{spell.level}</td>
                          <td>{spell.damage}</td>
                          <td>{spell.castingTime}</td>
                          <td>{spell.range}</td>
                          <td>{spell.duration}</td>
                          <td>
                            <Button
                              onClick={() => {
                                handleSpellsButtonClick(spell);
                                handleCloseAttack();
                              }} 
                              variant="link"
                              aria-label="roll"                 
                            >
                              <i className="fa-solid fa-dice-d20"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </>
            )}
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="close-btn" variant="secondary" onClick={handleCloseAttack}>
                Close
              </Button>
            </Card.Footer>
        </Card>
      </Modal>
      <UpcastModal
        show={showUpcast}
        onHide={() => setShowUpcast(false)}
        baseLevel={pendingSpell?.spell?.level}
        slots={availableSlots}
        onSelect={(lvl, type) => {
          if (pendingSpell) {
            applyUpcast(pendingSpell.spell, lvl, pendingSpell.crit, type);
            setPendingSpell(null);
          }
          setShowUpcast(false);
        }}
      />
    </div>
  );
});

export default PlayerTurnActions;
