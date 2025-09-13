export interface Weapon {
  /**
   * Weapon name, e.g. "Longsword".
   */
  name: string;
  /**
   * Canonical weapon key used for proficiency mapping.
   */
  type?: string;
  /**
   * Weapon category such as "simple melee" or "martial ranged".
   */
  category: string;
  /**
   * Damage dice and type, e.g. "1d8 slashing".
   */
  damage: string;
  /**
   * List of properties from the SRD, e.g. ["versatile", "heavy"].
   */
  properties: string[];
  /**
   * Weight in pounds.
   */
  weight: number;
  /**
   * Cost value in gold pieces.
   */
  cost: number;
  /**
   * Additional attack bonus provided by the weapon.
   */
  attackBonus?: number;
  /**
   * Whether the creature currently owns the weapon.
   */
  owned: boolean;
}
