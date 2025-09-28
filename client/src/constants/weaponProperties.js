import { useEffect, useRef, useState } from 'react';
import apiFetch from '../utils/apiFetch';

export const WEAPON_PROPERTY_DESCRIPTIONS = {
  ammunition:
    'You can use a weapon that has the ammunition property to make a ranged attack only if you have ammunition to fire from the weapon. Each time you attack with the weapon, you expend one piece of ammunition. Drawing ammunition from a quiver or other container is part of the attack. At the end of a battle, you can recover half your expended ammunition by taking a minute to search the battlefield.',
  finesse:
    'When making an attack with a finesse weapon, you use your choice of Strength or Dexterity for the attack and damage rolls. You must use the same modifier for both rolls.',
  heavy:
    'Small creatures have disadvantage on attack rolls with heavy weapons, and Tiny creatures can’t use them at all.',
  light:
    'A light weapon is small and easy to handle, making it ideal for use when fighting with two weapons.',
  loading:
    'Because of the time required to load this weapon, you can fire only one piece of ammunition from it when you use an action, bonus action, or reaction to fire it, regardless of the number of attacks you can normally make.',
  reach:
    'This weapon adds 5 feet to your reach when you attack with it, as well as when determining your reach for opportunity attacks.',
  special:
    'A weapon with the special property has unusual rules governing its use, which are explained in the weapon’s description.',
  thrown:
    'If a weapon has the thrown property, you can throw the weapon to make a ranged attack. If the weapon is a melee weapon, you use the same ability modifier for that attack and damage roll that you would use for a melee attack with the weapon.',
  'two-handed': 'This weapon requires two hands to use.',
  versatile:
    'A versatile weapon can be used with one or two hands. A damage value in parentheses appears with the property—the damage when the weapon is used with two hands.',
  silvered:
    'Some monsters that are resistant or immune to nonmagical weapons are susceptible to silver weapons, but getting one silvered costs 100 gp.',
  improvised:
    'An improvised weapon is any object you can wield in one or two hands, such as a broken bottle, a chair, or a table leg. It deals 1d4 damage unless otherwise noted.',
  returning:
    'A weapon with the returning property flies back to your hand immediately after it is used to make a ranged attack.',
};

const PROPERTY_ALIAS_MAP = {
  ammunition: 'ammunition',
  range: 'ammunition',
  'range weapon': 'ammunition',
  finesse: 'finesse',
  heavy: 'heavy',
  light: 'light',
  loading: 'loading',
  reach: 'reach',
  special: 'special',
  thrown: 'thrown',
  'two handed': 'two-handed',
  'two-handed': 'two-handed',
  twohanded: 'two-handed',
  versatile: 'versatile',
  silvered: 'silvered',
  improvised: 'improvised',
  returning: 'returning',
};

const PROPERTY_LABEL_OVERRIDES = {
  'two-handed': 'Two-Handed',
};

const PAREN_PATTERN = /(\s*\([^)]*\))$/;

export function getWeaponPropertyKey(rawProperty) {
  if (!rawProperty) return '';
  const normalized = String(rawProperty).trim();
  if (!normalized) return '';
  const base = normalized.replace(PAREN_PATTERN, '').trim();
  const lower = base.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lower) return '';
  return PROPERTY_ALIAS_MAP[lower] || lower.replace(/\s+/g, '-');
}

function titleCaseLabel(label) {
  if (!label) return '';
  const parts = label.split(/([\s-]+)/);
  return parts
    .map((part) => {
      if (/^[\s-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

export function normalizeWeaponProperty(rawProperty) {
  if (!rawProperty) return null;
  const raw = String(rawProperty).trim();
  if (!raw) return null;
  const rangeMatch = raw.match(PAREN_PATTERN);
  const rangeText = rangeMatch ? rangeMatch[0].trim() : '';
  const baseText = rangeMatch ? raw.slice(0, -rangeMatch[0].length).trim() : raw;
  const key = getWeaponPropertyKey(baseText);
  if (!key) {
    return {
      key: '',
      label: baseText || raw,
      rangeText,
      description: null,
      raw,
    };
  }
  const canonicalBase = PROPERTY_LABEL_OVERRIDES[key] || titleCaseLabel(key.replace(/-/g, ' '));
  const label = rangeText ? `${canonicalBase} ${rangeText}` : canonicalBase;
  return {
    key,
    label,
    rangeText,
    description: WEAPON_PROPERTY_DESCRIPTIONS[key] || null,
    raw,
  };
}

export function normalizeWeaponProperties(properties) {
  if (!properties) return [];
  const list = Array.isArray(properties)
    ? properties
    : String(properties)
        .split(',')
        .map((prop) => prop.trim())
        .filter(Boolean);
  return list
    .map((prop) => normalizeWeaponProperty(prop))
    .filter(Boolean);
}

let weaponCatalogCache = null;
let weaponCatalogPromise = null;

export function useWeaponCatalog() {
  const [state, setState] = useState(() => ({
    catalog: weaponCatalogCache,
    error: null,
    loading: !weaponCatalogCache,
  }));
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (weaponCatalogCache) {
      setState({ catalog: weaponCatalogCache, error: null, loading: false });
      return;
    }

    if (!weaponCatalogPromise) {
      weaponCatalogPromise = apiFetch('/weapons')
        .then((res) => {
          if (!res.ok) {
            const error = new Error(`${res.status} ${res.statusText}`);
            error.status = res.status;
            error.statusText = res.statusText;
            throw error;
          }
          return res.json();
        })
        .then((data) => {
          weaponCatalogCache = data || {};
          return weaponCatalogCache;
        })
        .catch((error) => {
          weaponCatalogPromise = null;
          throw error;
        });
    }

    weaponCatalogPromise
      .then((data) => {
        if (!isMounted.current) return;
        setState({ catalog: data, error: null, loading: false });
      })
      .catch((error) => {
        if (!isMounted.current) return;
        setState({ catalog: null, error, loading: false });
      });
  }, []);

  return state;
}

export function resolveWeaponBaseName(weapon, catalog) {
  if (!weapon) return null;
  const lookupSource = catalog || weaponCatalogCache;
  if (!lookupSource) return null;
  const typeKey = typeof weapon.type === 'string' ? weapon.type.toLowerCase() : '';
  const nameKey = typeof weapon.name === 'string' ? weapon.name.toLowerCase() : '';
  if (typeKey && lookupSource[typeKey]) {
    return (
      lookupSource[typeKey].displayName ||
      lookupSource[typeKey].name ||
      lookupSource[typeKey].weaponName ||
      null
    );
  }
  if (nameKey && lookupSource[nameKey]) {
    return (
      lookupSource[nameKey].displayName ||
      lookupSource[nameKey].name ||
      lookupSource[nameKey].weaponName ||
      null
    );
  }
  return null;
}

