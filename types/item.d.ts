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
   * Whether the creature currently owns the item.
   */
  owned: boolean;
}
