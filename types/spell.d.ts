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
   * Additional effects when the spell is cast using a higher-level slot.
   */
  higherLevels?: string;
}
