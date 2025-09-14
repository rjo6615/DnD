export interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  classes: string[];
  /**
   * Parsed damage string including dice and type (e.g., "8d6 fire").
   */
  damage?: string;
  /**
   * Damage type parsed from the description (e.g., "fire").
   */
  damageType?: string;
  /**
   * Additional effects when the spell is cast using a higher-level slot.
   */
  higherLevels?: string;
  /**
   * Damage dice replacements at key character levels for cantrips.
   */
  scaling?: { 5: string; 11: string; 17: string };
}
