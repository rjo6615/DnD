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
   * Armor class description, e.g. "16" or "12 + Dex modifier".
   */
  ac: string;
  /**
   * List of properties from the SRD, e.g. ["stealth disadvantage"].
   */
  properties: string[];
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
