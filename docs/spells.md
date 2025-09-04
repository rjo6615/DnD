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

The type definition lives in [`types/spell.d.ts`](../types/spell.d.ts) and is used by client components and server validation.

## Data source and limitations

Spell records are derived from the D&D 5e System Reference Document. The data was curated from publicly available SRD resources and reformatted to match the fields above. Only information released under the SRD is included.

Due to the offline nature of this environment, the repository currently ships with a representative subset of spells rather than the complete SRD catalog. Additional spells can be incorporated following the same structure when a full data set is available.
