export interface Weapon {
  /**
   * Weapon name, e.g. "Longsword".
   */
  name: string;
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
   * Cost as a string, e.g. "15 gp".
   */
  cost: string;
  /**
   * Whether the creature currently owns the weapon.
   */
  owned: boolean;
}
