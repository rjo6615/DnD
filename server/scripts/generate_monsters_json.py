import json
import re
import zipfile
from pathlib import Path
from unicodedata import normalize

DOC_PATH = Path(__file__).resolve().parents[2] / 'docs' / 'rules' / 'playerHandbook.docx'
OUTPUT_PATH = Path(__file__).resolve().parents[1] / 'data' / 'monsters.json'

SECTION_TITLES = {
    'Traits',
    'Actions',
    'Bonus Actions',
    'Reactions',
    'Legendary Actions',
    'Lair Actions',
    'Regional Effects',
}
SIZE_PATTERN = re.compile(r'^(Tiny|Small|Medium|Large|Huge|Gargantuan) ')
CLEAN_HYPHEN_RE = re.compile(r'(\w)[\u2010\u2011\u2012\u2013\u2014\u2015-]\s+(\w)')
DAMAGE_ENTRY_RE = re.compile(r'(?:Hit|Failure|Success|Critical Hit):[^()]*\(([^)]+)\)\s*([A-Za-z ]+?) damage', re.IGNORECASE)
ATTACK_BONUS_RE = re.compile(r'(?:Attack Roll|Weapon Attack):\s*\+?(-?\d+)')
SAVING_THROW_RE = re.compile(r'Saving Throw:?\s*([A-Z][a-z]+)\s*DC\s*(\d+)', re.IGNORECASE)
SKILL_ENTRY_RE = re.compile(r'([A-Za-z ]+)\s*([+-]\d+)')
ABILITY_SAVE_RE = re.compile(r'([A-Z][a-z]+)\s*([+-]\d+)')
PASSIVE_PERCEPTION_RE = re.compile(r'Passive Perception\s*(\d+)', re.IGNORECASE)
SENSE_ENTRY_RE = re.compile(r'([A-Za-z][A-Za-z ]*?)\s*(\d+\s*ft\.?|\d+\s*miles?|\d+)', re.IGNORECASE)
CHALLENGE_RE = re.compile(r'^CR\s*([^\s(]+)\s*(?:\(([^)]*)\))?')
XP_RE = re.compile(r'XP\s*([\d,]+)')
PB_RE = re.compile(r'PB\s*([+-]?\d+)')
SAVE_MAP = {
    'Strength': 'str',
    'Dexterity': 'dex',
    'Constitution': 'con',
    'Intelligence': 'int',
    'Wisdom': 'wis',
    'Charisma': 'cha',
}


def load_paragraphs(doc_path: Path):
    with zipfile.ZipFile(doc_path) as zf:
        with zf.open('word/document.xml') as doc:
            from xml.etree import ElementTree as ET

            tree = ET.parse(doc)
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    paragraphs = []
    for para in tree.getroot().iter(ns + 'p'):
        text = ''.join(node.text or '' for node in para.iter(ns + 't'))
        text = normalize('NFKC', text)
        if text:
            text = text.replace('\u2014', '-')
        paragraphs.append(text)
    return paragraphs


def slugify(name: str) -> str:
    text = normalize('NFKD', name)
    text = ''.join(ch for ch in text if not ord(ch) > 127 or ch.isalnum() or ch in "-' ")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", '-', text)
    text = text.strip('-')
    return text


def clean_text(text: str) -> str:
    if not text:
        return ''
    text = text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2012', '-').replace('\u2212', '-')
    text = CLEAN_HYPHEN_RE.sub(r'\1\2', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_speed(text: str) -> dict:
    if not text.startswith('Speed '):
        return {}
    value = text[len('Speed ') :].strip()
    parts = [part.strip() for part in value.split(',') if part.strip()]
    speeds = {}
    for part in parts:
        tokens = part.split(' ', 1)
        if tokens and tokens[0][0].isdigit():
            key = 'walk'
            speeds[key] = part
            continue
        if len(tokens) != 2:
            continue
        key = tokens[0].lower()
        speeds[key] = tokens[1].strip()
    return speeds


def parse_skill_line(text: str) -> dict:
    text = text.replace('Skills ', '').strip()
    skills = {}
    for match in SKILL_ENTRY_RE.finditer(text):
        name = match.group(1).strip().lower().replace(' ', '_')
        value = int(match.group(2))
        skills[name] = value
    return skills


def parse_saving_throws(text: str) -> dict:
    text = text.replace('Saving Throws ', '').strip()
    saves = {}
    for match in ABILITY_SAVE_RE.finditer(text):
        ability = match.group(1).strip()
        if ability in SAVE_MAP:
            saves[SAVE_MAP[ability]] = int(match.group(2))
    return saves


def parse_list(text: str) -> list:
    if not text:
        return []
    items = []
    for part in re.split(r'[;,]', text):
        part = part.strip()
        if not part or part == '—':
            continue
        if part.lower() == 'none':
            continue
        items.append(part)
    return items


def parse_senses(text: str) -> dict:
    value = text.replace('Senses ', '').strip()
    senses = {}
    passive_match = PASSIVE_PERCEPTION_RE.search(value)
    if passive_match:
        senses['passive_perception'] = int(passive_match.group(1))
        value = PASSIVE_PERCEPTION_RE.sub('', value)
    for match in SENSE_ENTRY_RE.finditer(value):
        key = match.group(1).strip().lower().replace(' ', '_')
        val = match.group(2).strip()
        senses[key] = val
    summary = value.strip(' ;,')
    if summary:
        summary = re.sub(r'\s+', ' ', summary)
        summary = summary.strip(' ;,')
    if summary:
        senses['summary'] = summary
    return senses


def parse_languages(text: str) -> str:
    value = text.replace('Languages ', '').strip()
    if value in {'—', 'None'}:
        return ''
    return value


def parse_cr_line(text: str):
    m = CHALLENGE_RE.match(text)
    if not m:
        return None, None, None
    cr_raw = m.group(1).strip()
    xp = None
    pb = None
    details = m.group(2) or ''
    xp_match = XP_RE.search(details)
    if xp_match:
        xp = int(xp_match.group(1).replace(',', ''))
    pb_match = PB_RE.search(details)
    if pb_match:
        pb = int(pb_match.group(1))
    def parse_cr(value: str):
        if '/' in value:
            num, den = value.split('/', 1)
            return float(num) / float(den)
        try:
            return float(value)
        except ValueError:
            return None
    return parse_cr(cr_raw), xp, pb


def parse_actions(lines):
    entries = []
    current = None
    for raw in lines:
        line = clean_text(raw)
        if not line:
            continue
        if SIZE_PATTERN.match(line):
            break
        if re.match(r"^[A-Z][A-Za-z0-9'\- ]+$", line) and '.' not in line:
            break
        m = re.match(r'^([A-Z][^.]*)\.\s*(.*)$', line)
        heading = False
        if m:
            candidate = re.sub(r'\([^)]*\)', '', m.group(1)).strip()
            words = [re.sub(r'[^A-Za-z0-9]', '', word) for word in candidate.split()]
            if words and all(word[:1].isupper() or word[:1].isdigit() for word in words if word):
                heading = True
            if candidate.lower().startswith(('success', 'failure', 'hit', 'miss', 'critical')):
                heading = False
        if m and heading:
            if current:
                entries.append(current)
            name = m.group(1).strip()
            desc = m.group(2).strip()
            current = {'name': name, 'desc': desc}
        else:
            if current:
                current['desc'] = (current['desc'] + ' ' + line).strip()
    if current:
        entries.append(current)
    for entry in entries:
        desc = entry.get('desc', '')
        attack_match = ATTACK_BONUS_RE.search(desc)
        if attack_match:
            try:
                entry['attack_bonus'] = int(attack_match.group(1))
            except ValueError:
                pass
        damages = []
        for match in DAMAGE_ENTRY_RE.finditer(desc):
            dice = match.group(1).strip()
            dice = dice.replace(' ', '')
            dtype = match.group(2).strip().lower()
            if dice:
                damages.append({'damage_dice': dice, 'damage_type': {'name': dtype}})
        if damages:
            entry['damage'] = damages
            if len(damages) == 1:
                entry['damage_dice'] = damages[0]['damage_dice']
                entry['damage_type'] = damages[0]['damage_type']
    return entries


def parse_monster_block(block):
    cleaned_block = [line for line in block if line]
    if not cleaned_block:
        return None
    name = cleaned_block[0].strip()
    # locate size line
    size_idx = None
    for idx, line in enumerate(cleaned_block[1:], start=1):
        if SIZE_PATTERN.match(line.strip()):
            size_idx = idx
            break
    if size_idx is None:
        return None
    size_line = clean_text(cleaned_block[size_idx])
    size_part, _, alignment_part = size_line.partition(',')
    size_tokens = size_part.split(' ', 1)
    size = size_tokens[0].strip()
    type_part = size_tokens[1].strip() if len(size_tokens) > 1 else ''
    subtype = None
    type_lower = type_part.lower()
    if '(' in type_part and ')' in type_part:
        base, _, rest = type_part.partition('(')
        subtype = rest.rstrip(')').strip()
        type_part = base.strip()
    alignment = clean_text(alignment_part)
    # parse AC, HP, Speed
    ac_value = None
    hit_points = None
    hit_dice = None
    speed = {}
    ability_scores = {}
    ability_mods = {}
    saving_throws = {}
    skills = {}
    senses = {}
    languages = ''
    challenge = None
    xp = None
    pb = None
    damage_resistances = []
    damage_immunities = []
    damage_vulnerabilities = []
    condition_immunities = []
    traits = []
    actions = []
    bonus_actions = []
    reactions = []
    legendary_actions = []
    lair_actions = []
    regional_effects = []

    idx = size_idx + 1
    while idx < len(cleaned_block):
        line = cleaned_block[idx].strip()
        if line.startswith('AC '):
            m = re.search(r'AC\s*(\d+)', line)
            if m:
                ac_value = int(m.group(1))
        elif line.startswith('HP '):
            m = re.search(r'HP\s*(\d+)', line)
            if m:
                hit_points = int(m.group(1))
            dice_match = re.search(r'\(([^)]+)\)', line)
            if dice_match:
                hit_dice = dice_match.group(1).strip()
        elif line.startswith('Speed '):
            speed = parse_speed(line)
        elif line.startswith('MOD '):
            idx += 1
            ability_index = 0
            while ability_index < 6 and idx < len(cleaned_block):
                entry = cleaned_block[idx].strip()
                name_match = re.match(r'^(STR|DEX|CON|INT|WIS|CHA)(?:\s+(\d+))?$', entry)
                if not name_match:
                    break
                ability = name_match.group(1)
                if name_match.group(2):
                    score = int(name_match.group(2))
                else:
                    idx += 1
                    score = int(cleaned_block[idx].strip())
                idx += 1
                mod_text = cleaned_block[idx].strip().replace('−', '-')
                idx += 1
                save_text = cleaned_block[idx].strip().replace('−', '-')
                ability_scores[ability.lower()] = score
                try:
                    ability_mods[ability.lower()] = int(mod_text)
                except ValueError:
                    ability_mods[ability.lower()] = None
                try:
                    saving_throws[ability.lower()] = int(save_text)
                except ValueError:
                    saving_throws[ability.lower()] = None
                ability_index += 1
                idx += 1
            continue
        elif line.startswith('Saving Throws '):
            saving_throws.update(parse_saving_throws(line))
        elif line.startswith('Skills '):
            skills.update(parse_skill_line(line))
        elif line.startswith('Senses '):
            senses.update(parse_senses(line))
        elif line.startswith('Languages '):
            languages = parse_languages(line)
        elif line.startswith('Resistances '):
            damage_resistances.extend(parse_list(line.replace('Resistances ', '')))
        elif line.startswith('Damage Resistances '):
            damage_resistances.extend(parse_list(line.replace('Damage Resistances ', '')))
        elif line.startswith('Immunities '):
            parts = [part.strip() for part in line.replace('Immunities ', '').split(';') if part.strip()]
            if parts:
                damage_immunities.extend(parse_list(parts[0]))
                if len(parts) > 1:
                    condition_immunities.extend(parse_list(parts[1]))
        elif line.startswith('Damage Immunities '):
            damage_immunities.extend(parse_list(line.replace('Damage Immunities ', '')))
        elif line.startswith('Condition Immunities '):
            condition_immunities.extend(parse_list(line.replace('Condition Immunities ', '')))
        elif line.startswith('Vulnerabilities '):
            damage_vulnerabilities.extend(parse_list(line.replace('Vulnerabilities ', '')))
        elif line.startswith('Damage Vulnerabilities '):
            damage_vulnerabilities.extend(parse_list(line.replace('Damage Vulnerabilities ', '')))
        elif line.startswith('CR '):
            challenge, xp, pb = parse_cr_line(line)
        elif line in SECTION_TITLES:
            section = line
            idx += 1
            section_lines = []
            while idx < len(cleaned_block):
                next_line = cleaned_block[idx].strip()
                if next_line in SECTION_TITLES:
                    break
                if SIZE_PATTERN.match(next_line):
                    break
                if (
                    idx + 2 < len(cleaned_block)
                    and cleaned_block[idx + 1].strip() == next_line
                    and SIZE_PATTERN.match(cleaned_block[idx + 2].strip())
                ):
                    break
                if (
                    idx + 3 < len(cleaned_block)
                    and cleaned_block[idx + 1].strip() == ''
                    and cleaned_block[idx + 2].strip() == next_line
                    and SIZE_PATTERN.match(cleaned_block[idx + 3].strip())
                ):
                    break
                section_lines.append(cleaned_block[idx])
                idx += 1
            if section == 'Traits':
                traits = parse_actions(section_lines)
            elif section == 'Actions':
                actions = parse_actions(section_lines)
            elif section == 'Bonus Actions':
                bonus_actions = parse_actions(section_lines)
            elif section == 'Reactions':
                reactions = parse_actions(section_lines)
            elif section == 'Legendary Actions':
                legendary_actions = parse_actions(section_lines)
            elif section == 'Lair Actions':
                lair_actions = parse_actions(section_lines)
            elif section == 'Regional Effects':
                regional_effects = parse_actions(section_lines)
            continue
        idx += 1

    prof_saves = []
    for ability, value in list(saving_throws.items()):
        mod = ability_mods.get(ability)
        if value is None or value == mod:
            continue
        prof_saves.append({'name': ability.upper(), 'value': value})

    monster = {
        'index': slugify(name),
        'name': name,
        'size': size,
        'type': type_part.lower(),
        'alignment': alignment if alignment != '—' else '',
        'armor_class': ac_value,
        'hit_points': hit_points,
        'hit_dice': hit_dice,
        'speed': speed,
        'strength': ability_scores.get('str'),
        'dexterity': ability_scores.get('dex'),
        'constitution': ability_scores.get('con'),
        'intelligence': ability_scores.get('int'),
        'wisdom': ability_scores.get('wis'),
        'charisma': ability_scores.get('cha'),
        'saving_throws': prof_saves,
        'skills': skills or None,
        'senses': senses or None,
        'languages': languages,
        'challenge_rating': challenge,
        'xp': xp,
        'proficiency_bonus': pb,
        'damage_vulnerabilities': damage_vulnerabilities or None,
        'damage_resistances': damage_resistances or None,
        'damage_immunities': damage_immunities or None,
        'condition_immunities': condition_immunities or None,
        'special_abilities': traits or None,
        'actions': actions or None,
        'bonus_actions': bonus_actions or None,
        'reactions': reactions or None,
        'legendary_actions': legendary_actions or None,
        'lair_actions': lair_actions or None,
        'regional_effects': regional_effects or None,
    }
    if subtype:
        monster['subtype'] = subtype.lower()
    return monster


def extract_monster_blocks(paragraphs):
    start = paragraphs.index('Monsters A–Z') + 1
    monsters = []
    i = start
    while i < len(paragraphs) - 5:
        line = paragraphs[i].strip()
        if not line or line in SECTION_TITLES:
            i += 1
            continue
        # look for size pattern
        if i + 2 < len(paragraphs) and paragraphs[i + 1].strip() == line and SIZE_PATTERN.match(paragraphs[i + 2].strip()):
            name = line
            block_start = i
            i += 2
        elif i + 3 < len(paragraphs) and paragraphs[i + 1].strip() == '' and paragraphs[i + 2].strip() == line and SIZE_PATTERN.match(paragraphs[i + 3].strip()):
            name = line
            block_start = i
            i += 3
        else:
            i += 1
            continue
        j = i
        while j < len(paragraphs) - 5:
            next_line = paragraphs[j].strip()
            if next_line and next_line not in SECTION_TITLES:
                if j + 2 < len(paragraphs) and paragraphs[j + 1].strip() == next_line and SIZE_PATTERN.match(paragraphs[j + 2].strip()):
                    break
                if j + 3 < len(paragraphs) and paragraphs[j + 1].strip() == '' and paragraphs[j + 2].strip() == next_line and SIZE_PATTERN.match(paragraphs[j + 3].strip()):
                    break
            j += 1
        block = paragraphs[block_start:j]
        monsters.append(block)
        i = j
    return monsters


def main():
    paragraphs = load_paragraphs(DOC_PATH)
    monster_blocks = extract_monster_blocks(paragraphs)
    results = []
    monsters = {}
    for block in monster_blocks:
        monster = parse_monster_block(block)
        if not monster:
            continue
        index = monster['index']
        results.append({'index': index, 'name': monster['name'], 'url': f'/api/monsters/{index}'})
        monsters[index] = monster
    results.sort(key=lambda entry: entry['name'])
    data = {'results': results, 'monsters': monsters}
    OUTPUT_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
