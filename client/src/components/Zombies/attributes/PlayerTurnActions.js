import React, {
  useState,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { Button, Modal, Card, Table } from "react-bootstrap";
import UpcastModal from './UpcastModal';
import sword from "../../../images/sword.png";
import proficiencyBonus from '../../../utils/proficiencyBonus';
import { normalizeEquipmentMap } from './equipmentNormalization';
import { normalizeWeapons } from './inventoryNormalization';

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

function formatDamageRolls(rolls) {
  return rolls
    .map(({ value, type }) => `${value}${type ? ` ${type}` : ''}`)
    .join(' + ');
}


const WEAPON_SLOT_KEYS = ['mainHand', 'offHand', 'ranged'];

function toTitleCase(str) {
  const small = new Set(['of', 'the']);
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) =>
      i !== 0 && small.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

export function calculateDamage(
  damageString,
  ability = 0,
  crit = false,
  roll = rollDice,
  extraDice,
  levelsAbove = 0
) {
  const parts = damageString.split(/\s+\+\s+/);
  const results = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    const [token, ...rest] = part.split(' ');
    const match = token.match(/^(\d+)(?:d(\d+)([+-]\d+)?)?$/);
    if (!match) {
      // eslint-disable-next-line no-console
      console.error('Invalid damage string');
      return null;
    }

    const type = rest.join(' ').trim();

    if (!match[2]) {
      const baseValue = parseInt(match[1], 10) + ability;
      results.push({ value: baseValue, type });
      continue;
    }

    const numberOfDiceValue = parseInt(match[1], 10);
    const sidesOfDiceValue = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || 0, 10);

    let damageSum = roll(numberOfDiceValue, sidesOfDiceValue).reduce(
      (partialSum, a) => partialSum + a,
      0
    );

    if (extraDice && levelsAbove > 0 && i === 0) {
      const totalExtra = extraDice.count * levelsAbove;
      const extraRolls = roll(totalExtra, extraDice.sides);
      damageSum += extraRolls.reduce((partialSum, a) => partialSum + a, 0);
    }

    if (crit) {
      const critRolls = roll(numberOfDiceValue, sidesOfDiceValue);
      damageSum += critRolls.reduce((partialSum, a) => partialSum + a, 0);
      if (extraDice && levelsAbove > 0 && i === 0) {
        const totalExtra = extraDice.count * levelsAbove;
        const critExtra = roll(totalExtra, extraDice.sides);
        damageSum += critExtra.reduce((partialSum, a) => partialSum + a, 0);
      }
    }

    results.push({ value: damageSum + modifier + ability, type });
  }

  const total = results.reduce((sum, r) => sum + r.value, 0);
  return { total, breakdown: formatDamageRolls(results) };
}

const PlayerTurnActions = React.forwardRef(
  (
    {
      form,
      strMod,
      dexMod,
      onCastSpell,
      onPassTurn = () => {},
      canPassTurn = true,
      isPassTurnInProgress = false,
      availableSlots = { regular: {}, warlock: {} },
      longRestCount = 0,
      shortRestCount = 0,
    },
    ref
  ) => {
  // -----------------------------------------------------------Modal for attacks------------------------------------------------------------------------
  const [showAttack, setShowAttack] = useState(false);
  const handleCloseAttack = () => setShowAttack(false);
  const handleShowAttack = () => setShowAttack(true);

  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    const updateFooterHeight = () => {
      const slots = document.querySelector('.spell-slot-container');
      const navbar = document.querySelector('.navbar.fixed-bottom');
      const slotsHeight = slots ? slots.offsetHeight : 0;
      const navbarHeight = navbar ? navbar.offsetHeight : 0;
      setFooterHeight(slotsHeight + navbarHeight);
    };
    updateFooterHeight();
    window.addEventListener('resize', updateFooterHeight);
    return () => window.removeEventListener('resize', updateFooterHeight);
  }, []);

//--------------------------------------------Critical status------------------------------------------------
const [isCritical, setIsCritical] = useState(false);
const [isFumble, setIsFumble] = useState(false);
  const equipmentProvided = useMemo(
    () => typeof form?.equipment === 'object' && form.equipment !== null,
    [form.equipment]
  );
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form.equipment),
    [form.equipment]
  );
  const equippedWeapons = useMemo(() => {
    if (equipmentProvided) {
      return WEAPON_SLOT_KEYS.map((slot) => {
        const weapon = normalizedEquipment[slot];
        if (!weapon) return null;
        if (weapon.source && weapon.source !== 'weapon') return null;
        const damage =
          typeof weapon.damage === 'string' ? weapon.damage.trim() : '';
        if (!damage) return null;
        return { slot, weapon };
      }).filter(Boolean);
    }

    const legacyWeapons = normalizeWeapons(form.weapon || [], {
      includeUnowned: true,
    });
    return legacyWeapons.map((weapon, index) => ({
      slot: `legacy-${index}`,
      weapon,
    }));
  }, [equipmentProvided, normalizedEquipment, form.weapon]);
  // --------------------------------Breaks down weapon damage into useable numbers--------------------------------
  const abilityForWeapon = (weapon) => {
    const category = weapon?.category;
    return typeof category === 'string' && category.toLowerCase().includes('ranged')
      ? dexMod
      : strMod;
  };

  const totalLevel = useMemo(
    () =>
      Array.isArray(form.occupation)
        ? form.occupation.reduce((total, el) => total + Number(el.Level), 0)
        : 0,
    [form.occupation]
  );

  const profBonus =
    form.proficiencyBonus ?? proficiencyBonus(totalLevel);

  const getAttackBonus = (weapon) =>
    profBonus +
    abilityForWeapon(weapon) +
    Number(weapon?.attackBonus ?? weapon?.bonus ?? 0);
    
  const formatDamageSegments = (damage, ability) =>
    damage
      .split(/\s+\+\s+/)
      .map((part, i, arr) => {
        const [token, ...rest] = part.trim().split(' ');
        const type = rest.join(' ').trim();
        return (
          <React.Fragment key={i}>
            <span className={type ? `damage-${type}` : ''}>
              {token}
              {ability !== undefined ? `+${ability}` : ''}
              {type ? ` ${type}` : ''}
            </span>
            {i < arr.length - 1 ? ' + ' : ''}
          </React.Fragment>
        );
      });

  const getDamageString = (weapon) => {
    const ability = abilityForWeapon(weapon);
    return formatDamageSegments(weapon.damage, ability);
  };

  const handleWeaponAttack = (weapon) => {
    const ability = abilityForWeapon(weapon);
    if (typeof weapon?.damage !== 'string' || !weapon.damage.trim()) return;
    const result = calculateDamage(weapon.damage, ability, isCritical);
    if (!result) return;
    updateDamageValueWithAnimation(
      result.total,
      result.breakdown,
      weapon.name
    );
  };

const [showUpcast, setShowUpcast] = useState(false);
const [pendingSpell, setPendingSpell] = useState(null);

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
    if (!value) return;
    if (onCastSpell) {
      onCastSpell({
        level,
        slotType,
        damage: value.total,
        breakdown: value.breakdown,
        castingTime: spell.castingTime,
        name: spell.name,
      });
      return;
    }
    updateDamageValueWithAnimation(value.total, value.breakdown, spell.name);
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
const [damageLog, setDamageLog] = useState([]);
const [showLog, setShowLog] = useState(false);

useEffect(() => {
  if (loading) {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1 second delay
    return () => clearTimeout(timer);
  }
}, [loading]);

const updateDamageValueWithAnimation = (newValue, breakdown, source) => {
  setLoading(true);
  setPulseClass('');
  setDamageValue(newValue);
  if (newValue !== undefined) {
    setDamageLog((prev) => {
      const entry = {
        total: newValue,
        breakdown,
        source: source ? toTitleCase(source) : undefined,
      };
      return [entry, { divider: true }, ...prev].slice(0, 10);
    });
  }
};

useImperativeHandle(ref, () => ({ updateDamageValueWithAnimation }));

const [pulseClass, setPulseClass] = useState('');

// Allow other components to display values in the damage circle
useEffect(() => {
  const handler = (e) => {
    const { value, breakdown, source, critical, fumble } = e.detail || {};
    updateDamageValueWithAnimation(value, breakdown, source);
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
  const passDisabled = !canPassTurn || isPassTurnInProgress;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Button
          style={{
            padding: '4px 12px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#fff',
            background: 'transparent',
            borderRadius: '8px',
            textShadow: '1px 1px 2px #000',
            cursor: passDisabled ? 'not-allowed' : 'pointer',
            opacity: passDisabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
            border: 'none',
          }}
          disabled={passDisabled}
          onMouseOver={(e) => {
            if (passDisabled) {
              return;
            }
            e.target.style.background = 'none';
            e.target.style.boxShadow =
              '0 0 16px rgba(0, 76, 255, 0.9), inset 0 0 8px rgba(255, 255, 255, 1)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = 'none';
            e.target.style.border = 'none';
          }}
          onClick={() => {
            if (passDisabled) {
              return;
            }
            onPassTurn();
          }}
        >
          Pass ➔
        </Button>
        <Button
          style={{
            padding: '4px 12px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#fff',
            background: 'transparent',
            borderRadius: '8px',
            textShadow: '1px 1px 2px #000',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: 'none',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'none';
            e.target.style.boxShadow =
              '0 0 16px rgba(0, 76, 255, 0.9), inset 0 0 8px rgba(255, 255, 255, 1)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = 'none';
            e.target.style.border = 'none';
          }}
          onClick={() => setShowLog(true)}
        >
          ⚔️ Log
        </Button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
        <div
          id="damageAmount"
          className={`${loading ? 'loading' : ''} ${pulseClass} ${
            isCritical ? 'critical-active' : ''
          } ${isFumble ? 'critical-failure' : ''}`}
          onClick={handleDamageClick}
        >
          <span
            id="damageValue"
            className={`${loading ? 'hidden' : ''} ${
              typeof damageValue === 'string' ? 'spell-cast-label' : ''
            }`}
          >
            {damageValue}
          </span>
          <div
            id="loadingSpinner"
            className={`spinner ${loading ? '' : 'hidden'}`}
          ></div>
        </div>
      </div>
      <Modal centered show={showLog} onHide={() => setShowLog(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Damage Log</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="list-unstyled mb-0">
            {damageLog.map((entry, idx) =>
              entry.divider ? (
                <li key={idx} className="roll-separator" />
              ) : (
                <li key={idx}>
                  <div>
                    {entry.source ? `${entry.source} (${entry.total})` : entry.total}
                  </div>
                  {entry.breakdown && (
                    <div>
                      {entry.breakdown.split(' + ').map((segment, i) => {
                        const match = segment.match(/(\d+)(?:\s+(\w+))?/);
                        const value = match ? match[1] : segment;
                        const type = match ? match[2] : '';
                        return (
                          <div key={i}>
                            -{' '}
                            <span className={type ? `damage-${type}` : ''}>
                              {value}
                              {type ? ` ${type}` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              )
            )}
          </ul>
        </Modal.Body>
      </Modal>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
          paddingBottom: `${footerHeight}px`,
        }}
      >
        <div className="attack-roll-controls">
          {/* Attack Button */}
          <button
            onClick={handleShowAttack}
            style={{
              width: '64px',
              height: '64px',
              backgroundImage: `url(${sword})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: 'none',
              transition: 'transform 0.2s ease',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            title="Attack"
          />
          <div className="attack-roll-controls__die">
            <div className="content">
              {showSparkles && (
                <div className="sparkle"></div>
              )}
              {showSparkles1 && (
                <div className="sparkle1"></div>
              )}
              <div
                onClick={handleRandomizeClick}
                className={`die ${rolling ? 'rolling' : ''}`}
                data-face={activeFace}
              >
                {faceElements}
              </div>
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
                  {equippedWeapons.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
                        No weapons equipped.
                      </td>
                    </tr>
                  ) : (
                    equippedWeapons.map(({ slot, weapon }) => (
                      <tr key={`${slot}-${weapon.name || slot}`}>
                        <td className="text-capitalize">{weapon.name || 'Unknown'}</td>
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
                    ))
                  )}
                </tbody>
              </Table>
            {Array.isArray(form.spells) && form.spells.some((s) => s?.damage) && (
              <>
                <Card.Title className="modal-title mt-4">Spells</Card.Title>
                <Table className="modern-table" striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Spell Name</th>
                      <th>Class</th>
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
                          <td>{spell.casterType || spell.caster || 'Unknown'}</td>
                          <td>{spell.level}</td>
                          <td>{formatDamageSegments(spell.damage)}</td>
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
