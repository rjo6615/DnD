export interface Armor {
  /**
   * Armor name, e.g. "Chain Mail".
   */
  name: string;
  /**
   * Canonical armor key used for proficiency mapping.
   */
  type?: string;
  /**
   * Armor category such as "light", "medium", "heavy", or "shield".
   */
  category: string;
  /**
   * Armor class bonus provided by the armor (base AC minus 10).
   */
  acBonus: number;
  /**
   * Maximum Dexterity modifier allowed, or null for no limit.
   */
  maxDex?: number | null;
  /**
   * Required strength score to wear the armor, or null if none.
   */
  strength?: number | null;
  /**
   * Whether the armor imposes disadvantage on Stealth checks.
   */
  stealth?: boolean;
  /**
   * Weight in pounds.
   */
  weight: number;
  /**
   * Cost as a string, e.g. "50 gp".
   */
  cost: string;
  /**
   * Whether the creature currently owns the armor.
   */
  owned: boolean;
}
