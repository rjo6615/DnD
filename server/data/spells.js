/**
 * D&D 5e SRD Spells (SRD 5.2)
 * Source: https://gist.githubusercontent.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912/raw/b205fc6c5a4f1d2f1c0e1c63f51323cbd0565bfd/srd-5.2-spells.json
 * The JSON payload is stored in ../../data/srd-5.2-spells.json so the client and server share a single canonical dataset.
 */
/** @typedef {import('../../types/spell').Spell} Spell */

/** @type {Record<string, Spell>} */
const spells = require('../../data/srd-5.2-spells.json');

module.exports = spells;
