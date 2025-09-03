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
