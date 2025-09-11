export interface Item {
  /**
   * Item name, e.g. "Rope, hempen (50 feet)".
   */
  name: string;
  /**
   * Canonical item key used for lookup.
   */
  type?: string;
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
   * Optional notes or description for custom items.
   */
  notes?: string;
  /**
   * Ability score modifiers granted by the item.
   */
  stats?: Record<string, number>;
  /**
   * Skill modifiers granted by the item.
   */
  skills?: Record<string, number>;
  /**
   * Whether the creature currently owns the item.
   */
  owned: boolean;
}
