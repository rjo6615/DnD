export interface Class {
  /**
   * Class name, e.g. "Wizard".
   */
  name: string;
  /**
   * Hit die value, e.g. 8 for a d8.
   */
  hitDie: number;
  /**
   * Proficiency details for the class.
   */
  proficiencies: {
    /** Armor types the class is proficient with. */
    armor: string[];
    /** Weapon types the class is proficient with. */
    weapons: string[];
    /** Tool proficiencies granted by the class. */
    tools: string[];
    /** Saving throws the class is proficient in. */
    savingThrows: string[];
    /** Skill choices available at 1st level. */
    skills: {
      count: number;
      options: string[];
    };
  };
  /**
   * Whether the class grants spellcasting at 1st level.
   */
  spellcasting: boolean;
}
