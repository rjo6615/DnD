# Spell data structure

The `Spell` type is shared between the client and server to ensure consistent data.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Name of the spell |
| `level` | number | Spell level |
| `school` | string | Magic school |
| `castingTime` | string | Time required to cast |
| `range` | string | Effective range |
| `components` | string[] | Components required |
| `duration` | string | Spell duration |
| `description` | string | Full description |
| `classes` | string[] | Classes that can use the spell |
| `higherLevels` | string | Optional text describing additional effects when cast with a higher-level slot |

The type definition lives in [`types/spell.d.ts`](../types/spell.d.ts) and is used by client components and server validation.

## Upcasting

Some spells can be **upcast** using a higher-level spell slot to enhance their effects. When this is possible, the `higherLevels`
field contains the rules text for those enhancements. For example:

```json
{
  "name": "Burning Hands",
  "level": 1,
  "damage": "3d6",
  "higherLevels": "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st."
}
```

Casting *Burning Hands* using a 3rd-level slot would therefore deal `5d6` fire damage and expend a 3rd-level spell slot.

## Data source and limitations

Spell records are derived from the D&D 5e System Reference Document. The data was curated from publicly available SRD resources and reformatted to match the fields above. Only information released under the SRD is included.

Due to the offline nature of this environment, the repository currently ships with a representative subset of spells rather than the complete SRD catalog. Additional spells can be incorporated following the same structure when a full data set is available.
