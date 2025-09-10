# DnD

## Description

This project was used to further our understanding and to utilize many of the tools we were taught in class. We used MongoDb, Express, React, Nodejs, and Regex. The goal of the app is to be able to play a game of D&D as a player and have all the needed info presented to you in a concise and easily understood manner. We want for some things to really stream lined like character creation so players spend less time setting up and more time playing. 

## Acess

The landing page can be accessed following this link

https://dndhelperapp-1b8e93a876a7.herokuapp.com/

The Url of the Github repository is here

https://github.com/rjo6615/DnD

## Usage

to use this on your own

Example gif is listed below:

![Example](./client/public/images/Gif-for-Dnd.gif)

During a player's turn, the interface provides an Attack button and a **Bonus Action** slot labeled "B" next to the damage display for quick access to bonus actions.

## Deployment

Run `npm run build` to generate the production build of the client. The `npm start` script runs this build step before launching the server so deployments always serve the latest assets from `client/build`.

## Environment Variables

The server uses a `config.env` file for configuration. Ensure the following variable is set:

| Variable | Description |
|----------|-------------|
| `CLIENT_ORIGINS` | Comma-separated list of client application URLs allowed to make cross-origin requests, e.g., `http://localhost,http://example.com`. |

### Client Environment Variables

When running the React client separately from the server, configure the API base URL by setting a `REACT_APP_API_URL` environment variable. It must point to the origin of the server so the client can reach the backend.

For local development, create a `.env` file in the `client` directory with a value such as:

```
REACT_APP_API_URL=http://localhost:5000
```

Update the URL to match your server's address in other environments.


## API Error Format

All API errors are returned as JSON objects with a single `message` property. For example:

```
{
  "message": "Description of the error"
}
```

Clients should rely on this structure when handling error responses.

## Character Progression

Characters gain feats instead of automatic ability score increases. Feats are earned at specific levels depending on class:

- **All classes:** Levels 4, 8, 12, 16, and 19
- **Fighter:** Additional feats at levels 6 and 14
- **Rogue:** Additional feat at level 10

Ability scores do not automatically increase at any level. To improve statistics, choose feats that grant ability bonuses.
Most feats may only be selected once per character; however, the **Stat Increase** feat can be taken multiple times.

## Feats Endpoint

Use `GET /feats` to retrieve all available feats.

Use `POST /feats/add` with a JSON body to create a new feat. Supported fields include:

- `featName` (string, required)
- `notes` (string, optional)
- `abilityIncreaseOptions` (array of objects, optional) each with:
  - `abilities` (array of strings)
  - `amount` (integer)
  - Example: `[{ "abilities": ["str", "con"], "amount": 1 }]`
- Numeric bonuses such as ability scores (`str`, `dex`, `con`, `int`, `wis`, `cha`), `initiative`, `ac`, `speed`, `hpMaxBonus`, and `hpMaxBonusPerLevel`
- Skill bonuses (`acrobatics`, `animalHandling`, `arcana`, `athletics`, `deception`, `history`, `insight`, `intimidation`, `investigation`, `medicine`, `nature`, `perception`, `performance`, `persuasion`, `religion`, `sleightOfHand`, `stealth`, `survival`)

## Character Feats Endpoint

Use `PUT /characters/:id/feats` with a JSON body like `{ "feat": ["Feat1"] }` to
append new feats to a character. Each request adds feats to the existing list
rather than replacing the current feats.

Use `DELETE /characters/:id/feats` with a JSON body like `{ "feat": "Cleave" }`
to remove a feat from a character.

`PUT` appends feats, while `DELETE` removes them.

## Support
For help with this webpage please contact
|Name | Email |
|-----------|---------------------------|
|Robert Obernier| robertjobernier@gmail.com |
|John Ifert| john.ifert.miller@gmail.com |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
