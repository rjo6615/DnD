import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Card, Button, Spinner, Form } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import FeatureModal from './FeatureModal';
import actionSurgeIcon from '../../../images/action-surge-icon.png';
import {
  WEAPON_MASTERY_LIST,
  getWeaponsForProficiency,
  resolveWeaponMasteryEntry,
  resolveWeaponMasteryEntryFromWeapon,
} from './weaponMasteryCatalog';
import { normalizeEquipmentMap } from './equipmentNormalization';
import { normalizeWeapons } from './inventoryNormalization';

const EQUIPPED_WEAPON_SLOTS = ['mainHand', 'offHand', 'ranged'];

const normalizeWeaponMasteryRecord = (record) => {
  if (!record || typeof record !== 'object') return {};
  const normalized = {};
  Object.entries(record).forEach(([featureKey, selections]) => {
    if (!Array.isArray(selections)) return;
    normalized[featureKey] = selections.map((value) => {
      const entry = resolveWeaponMasteryEntry(value);
      return entry?.key || '';
    });
  });
  return normalized;
};

export default function Features({
  form,
  showFeatures,
  handleCloseFeatures,
  onActionSurge,
  longRestCount,
  shortRestCount,
  onFeatureStateChange,
}) {
  const [features, setFeatures] = useState([]);
  const [modalFeature, setModalFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surgeUsed, setSurgeUsed] = useState(false);
  const [weaponMasterySelections, setWeaponMasterySelections] = useState(() =>
    normalizeWeaponMasteryRecord(form?.features?.weaponMastery)
  );

  const handleFeatureStateChange =
    typeof onFeatureStateChange === 'function'
      ? onFeatureStateChange
      : () => {};

  useEffect(() => {
    setWeaponMasterySelections(
      normalizeWeaponMasteryRecord(form?.features?.weaponMastery)
    );
  }, [form?.features?.weaponMastery]);

  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form?.equipment),
    [form?.equipment]
  );

  const normalizedWeapons = useMemo(
    () => normalizeWeapons(form?.weapon || [], { includeUnowned: true }),
    [form?.weapon]
  );

  const availableWeaponOptions = useMemo(() => {
    const optionMap = new Map();
    const addEntry = (entry) => {
      if (entry && !optionMap.has(entry.key)) {
        optionMap.set(entry.key, entry);
      }
    };

    EQUIPPED_WEAPON_SLOTS.forEach((slot) => {
      const equipped = normalizedEquipment?.[slot];
      const entry = resolveWeaponMasteryEntryFromWeapon(equipped);
      if (entry) addEntry(entry);
    });

    normalizedWeapons.forEach((weapon) => {
      const entry = resolveWeaponMasteryEntryFromWeapon(weapon);
      if (entry) addEntry(entry);
    });

    const occupations = Array.isArray(form?.occupation) ? form.occupation : [];
    occupations.forEach((occ) => {
      const proficiencyList = Array.isArray(occ?.weapons)
        ? occ.weapons
        : Array.isArray(occ?.proficiencies?.weapons)
        ? occ.proficiencies.weapons
        : [];
      proficiencyList.forEach((value) => {
        if (!value) return;
        const entries = getWeaponsForProficiency(value);
        if (entries.length) {
          entries.forEach(addEntry);
          return;
        }
        const entry = resolveWeaponMasteryEntry(value);
        if (entry) addEntry(entry);
      });
    });

    Object.values(weaponMasterySelections || {}).forEach((selections) => {
      (selections || []).forEach((value) => {
        const entry = resolveWeaponMasteryEntry(value);
        if (entry) addEntry(entry);
      });
    });

    if (!optionMap.size) {
      WEAPON_MASTERY_LIST.forEach(addEntry);
    }

    return Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [
    form?.occupation,
    normalizedEquipment,
    normalizedWeapons,
    weaponMasterySelections,
  ]);

  const weaponOptionElements = useMemo(
    () =>
      availableWeaponOptions.map((option) => (
        <option value={option.key} key={option.key}>
          {option.label}
        </option>
      )),
    [availableWeaponOptions]
  );

  const buildFeatureKey = (feat) =>
    [feat.class, feat.level, feat.name]
      .map((part) => String(part || '').toLowerCase())
      .join('::');

  const getMasterySelections = (featureKey, picks) => {
    const selections = weaponMasterySelections?.[featureKey] || [];
    return Array.from({ length: picks }, (_, idx) => selections[idx] || '');
  };

  const handleMasterySelectionChange = (featureKey, picks, index, value) => {
    const normalizedValue = resolveWeaponMasteryEntry(value)?.key || '';
    setWeaponMasterySelections((prev) => {
      const nextSelections = {
        ...prev,
        [featureKey]: Array.from({ length: picks }, (_, idx) =>
          idx === index
            ? normalizedValue
            : prev?.[featureKey]?.[idx] || ''
        ),
      };

      const hasSelected = nextSelections[featureKey].some(Boolean);
      if (!hasSelected) {
        delete nextSelections[featureKey];
      }

      handleFeatureStateChange((prevFeatureState = {}) => {
        const nextFeatureState = { ...prevFeatureState };
        const existingWeaponMastery = {
          ...(prevFeatureState.weaponMastery || {}),
        };

        if (hasSelected) {
          existingWeaponMastery[featureKey] = nextSelections[featureKey];
        } else {
          delete existingWeaponMastery[featureKey];
        }

        if (Object.keys(existingWeaponMastery).length > 0) {
          nextFeatureState.weaponMastery = existingWeaponMastery;
        } else {
          delete nextFeatureState.weaponMastery;
        }

        return nextFeatureState;
      });

      return nextSelections;
    });
  };

  useEffect(() => {
    if (!showFeatures) return;
    async function fetchFeatures() {
      setLoading(true);
      setError(null);
      const allFeatures = [];
      try {
        for (const occ of Array.isArray(form.occupation) ? form.occupation : []) {
          if (typeof occ !== 'object' || occ === null) continue;
          const displayName = occ.Name || occ.Occupation || occ.name || '';
          const className = displayName.toLowerCase();
          if (!className) continue;
          for (let lvl = 1; lvl <= (occ.Level || 1); lvl++) {
            const res = await apiFetch(`/classes/${className}/features/${lvl}`);
            if (!res.ok) continue;
            const data = await res.json();
            (data.features || []).forEach((f) =>
              allFeatures.push({ ...f, class: displayName, level: lvl })
            );
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setError('Unable to load class features');
      } finally {
        allFeatures.sort(
          (a, b) =>
            (a.class || '').localeCompare(b.class || '') ||
            (a.level || 0) - (b.level || 0)
        );
        setFeatures(allFeatures);
        setLoading(false);
      }
    }
    fetchFeatures();
  }, [form.occupation, showFeatures]);

  useEffect(() => {
    setSurgeUsed(false);
  }, [longRestCount, shortRestCount]);

  return (
    <>
      <Modal
        className="dnd-modal modern-modal"
        show={showFeatures}
        onHide={handleCloseFeatures}
        size="lg"
        centered
      >
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Features</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              {error && (
                <div className="text-danger mb-2">{error}</div>
              )}
              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" role="status" />
                </div>
              ) : features.length > 0 ? (
                <div className="feature-card-grid">
                  {features.map((feat, idx) => {
                    const featKey = `${feat.class}-${feat.level}-${idx}`;
                    const isActionSurge = feat.name?.includes('Action Surge');
                    const isWeaponMastery = Boolean(feat.mastery?.picks);
                    const featureKey = buildFeatureKey(feat);
                    const masterySelections = isWeaponMastery
                      ? getMasterySelections(featureKey, feat.mastery.picks)
                      : [];
                    return (
                      <div
                        className="feature-card"
                        key={featKey}
                        data-testid="feature-card"
                      >
                        <div className="feature-card-header">
                          <div>
                            <div className="feature-card-name">{feat.name}</div>
                            <div className="feature-card-meta">
                              <span>{feat.class}</span>
                              <span>Level {feat.level}</span>
                            </div>
                          </div>
                          <div className="feature-card-actions">
                            {isActionSurge ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${surgeUsed ? 'opacity-50' : ''}`}
                                onClick={() => {
                                  if (!surgeUsed) {
                                    onActionSurge?.();
                                    setSurgeUsed(true);
                                  }
                                }}
                                disabled={surgeUsed}
                              >
                                <img
                                  src={actionSurgeIcon}
                                  alt="Action Surge"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : (
                              <Button aria-label="use feature" variant="outline-light" size="sm">
                                Use
                              </Button>
                            )}
                            <Button
                              aria-label="view feature"
                              variant="link"
                              size="sm"
                              className="view-link-btn"
                              onClick={() => {
                                const selectedMasteries = masterySelections.filter(
                                  Boolean
                                );
                                const selectedEntries = selectedMasteries
                                  .map((selection) =>
                                    resolveWeaponMasteryEntry(selection)
                                  )
                                  .filter(Boolean);
                                setModalFeature({
                                  ...feat,
                                  masterySelections: selectedEntries,
                                });
                                setShowModal(true);
                              }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </Button>
                          </div>
                        </div>
                        <div className="feature-card-body">
                          {(feat.description || feat.desc) && (
                            <div className="mb-2">
                              {Array.isArray(feat.description || feat.desc)
                                ? (feat.description || feat.desc).join(' ')
                                : feat.description || feat.desc}
                            </div>
                          )}
                          {isWeaponMastery && (
                            <div className="weapon-mastery-card">
                              <div className="mb-2 fw-semibold">
                                Weapon Mastery selections available: {feat.mastery.picks}
                              </div>
                              <div className="d-flex flex-column gap-2">
                                {masterySelections.map((selection, selectionIdx) => (
                                  <Form.Select
                                    key={`${featureKey}-${selectionIdx}`}
                                    aria-label={`Select mastery option ${selectionIdx + 1}`}
                                    value={selection}
                                    onChange={(event) =>
                                      handleMasterySelectionChange(
                                        featureKey,
                                        feat.mastery.picks,
                                        selectionIdx,
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="">Choose a weapon</option>
                                    {weaponOptionElements}
                                  </Form.Select>
                                ))}
                              </div>
                              {masterySelections.filter(Boolean).length > 0 && (
                                <div className="mt-3 text-start">
                                  <div className="fw-semibold">Current selections</div>
                                  <ul className="mb-0">
                                    {masterySelections
                                      .filter(Boolean)
                                      .map((selection, selectionIdx) => {
                                        const option =
                                          resolveWeaponMasteryEntry(selection);
                                        if (!option) return null;
                                        return (
                                          <li
                                            key={`${featureKey}-${selection}-${selectionIdx}`}
                                          >
                                            <strong>{option.label}</strong> —{' '}
                                            <span className="fw-semibold">
                                              {option.masteryTitle}
                                            </span>
                                            <div>{option.masteryDescription}</div>
                                          </li>
                                        );
                                      })}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !error ? (
                <div className="text-center text-muted">No features found</div>
              ) : null}
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button
                className="action-btn close-btn"
                onClick={handleCloseFeatures}
              >
                Close
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </Modal>
      <FeatureModal
        show={showModal}
        onHide={() => setShowModal(false)}
        feature={modalFeature}
      />
    </>
  );
}
