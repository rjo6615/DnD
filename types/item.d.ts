export interface Item {
  /**
   * Item name, e.g. "Rope, hempen (50 feet)".
   */
  name: string;
  /**
   * Item category such as "adventuring gear", "tool", or "mount".
   */
  category: string;
  /**
   * Weight in pounds. Use 0 for negligible weight.
   */
  weight: number;
  /**
   * Cost as a string, e.g. "5 gp".
   */
  cost: string;
  /**
   * Optional list of SRD properties, may be empty.
   */
  properties?: string[];
  /**
   * Optional rarity string such as "Common" or "Very Rare".
   */
  rarity?: string;
  /**
   * Optional healing string describing HP regained when used.
   */
  healing?: string;
  /**
   * Optional notes about the item.
   */
  notes?: string;
  /**
   * Ability score bonuses granted by the item.
   */
  statBonuses?: Record<string, number>;
  /**
   * Skill bonuses granted by the item.
   */
  skillBonuses?: Record<string, number>;
  /**
   * Whether the creature currently owns the item.
   */
  owned: boolean;
}
