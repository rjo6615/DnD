#!/usr/bin/env python3
"""Generate spell data from the Player Handbook docx."""
from __future__ import annotations

import io
import json
import re
import zipfile
from collections import OrderedDict
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOCX_PATH = ROOT / "docs" / "rules" / "playerHandbook.docx"
OUTPUT_PATH = ROOT / "server" / "data" / "spells.js"

NAMESPACE = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
FIELD_PATTERN = re.compile(
    r"(Casting Time|Range|Component(?:s)?|Duration):\s*([^:]+?)(?=(?:Casting Time|Range|Component(?:s)?|Duration):|$)"
)
HYPHEN_SPLIT_RE = re.compile(r"(\w)-\s+(\w)")
DURATION_STARTERS = (
    "Concentration",
    "Up to",
    "Instantaneous",
    "Special",
    "Until",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "12",
    "24",
    "30",
)


def read_paragraphs() -> list[str]:
    with zipfile.ZipFile(DOCX_PATH) as zf:
        data = zf.read("word/document.xml")
    paragraphs: list[str] = []
    for event, elem in ET.iterparse(io.BytesIO(data), events=("end",)):
        if elem.tag == f"{NAMESPACE}p":
            texts = [node.text or "" for node in elem.iter() if node.tag == f"{NAMESPACE}t"]
            text = "".join(texts).strip()
            if text:
                paragraphs.append(text)
            elem.clear()
    return paragraphs


def clean_text(value: str) -> str:
    previous = None
    result = value
    while previous != result:
        previous = result
        result = HYPHEN_SPLIT_RE.sub(r"\1\2", result)
    result = re.sub(r"\s+", " ", result).strip()
    return result


def normalize_casting_time(value: str) -> str:
    value = clean_text(value)
    replacements = [
        ("Action (Overgrowth)", "1 action (Overgrowth)"),
        ("Action", "1 action"),
        ("Bonus Action", "1 bonus action"),
        (
            "Bonus Action, which you take immediately after hitting a creature with a weapon",
            "1 bonus action, which you take immediately after hitting a creature with a weapon",
        ),
        (
            "Reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself",
            "1 reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself",
        ),
        (
            "Reaction, which you take when you are hit by an attack roll or targeted by the Magic Missile spell",
            "1 reaction, which you take when you are hit by an attack roll or targeted by the Magic Missile spell",
        ),
        (
            "Reaction, which you take when you or a creature you can see within 60 feet of you falls",
            "1 reaction, which you take when you or a creature you can see within 60 feet of you falls",
        ),
        (
            "Reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components",
            "1 reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components",
        ),
        ("Action or Ritual", "1 action or ritual"),
        ("1 minute or Ritual", "1 minute (ritual)"),
        ("10 minutes or Ritual", "10 minutes (ritual)"),
    ]
    for target, replacement in replacements:
        if value.startswith(target):
            return value.replace(target, replacement, 1)
    return value


def split_components(value: str) -> list[str]:
    value = clean_text(value)
    parts: list[str] = []
    buffer: list[str] = []
    depth = 0
    for char in value:
        if char == "(":
            depth += 1
        elif char == ")" and depth:
            depth -= 1
        if char == "," and depth == 0:
            part = "".join(buffer).strip()
            if part:
                parts.append(part)
            buffer.clear()
            continue
        buffer.append(char)
    tail = "".join(buffer).strip()
    if tail:
        parts.append(tail)
    return parts


def normalize_name(name: str) -> str:
    stripped = name.strip()
    letters = [c for c in stripped if c.isalpha()]
    upper = sum(1 for c in letters if c.isupper())
    if letters and upper / len(letters) > 0.8:
        words = stripped.split()
        stripped = " ".join(w.capitalize() for w in words)
    stripped = stripped.replace("’S", "’s").replace("'S", "'s")
    return stripped


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-")


def split_duration(value: str) -> tuple[str, str]:
    duration = clean_text(value)
    extra = ""
    for idx in range(1, len(duration)):
        if duration[idx - 1] == " " and duration[idx].isupper():
            potential = duration[: idx - 1].strip()
            if potential and any(potential.startswith(prefix) for prefix in DURATION_STARTERS):
                extra = duration[idx:].strip()
                duration = potential
                break
    return duration, extra


def extract_spells(paragraphs: list[str]) -> OrderedDict[str, dict]:
    start = next(i for i, text in enumerate(paragraphs) if text.strip() == "Spell Descriptions") + 1
    end = next(i for i in range(start, len(paragraphs)) if paragraphs[i].startswith("Rules Glossary"))

    def is_info(line: str) -> bool:
        if line.startswith("Level "):
            return True
        return bool(re.match(r"^[A-Za-z’'\- ]+ Cantrip", line))

    def is_spell_name(idx: int) -> bool:
        if idx + 1 >= end:
            return False
        line = paragraphs[idx]
        if not line or ":" in line:
            return False
        return is_info(paragraphs[idx + 1])

    spells: OrderedDict[str, dict] = OrderedDict()
    i = start
    while i < end:
        if not is_spell_name(i):
            i += 1
            continue
        raw_name = paragraphs[i]
        name = normalize_name(raw_name)
        i += 1
        info = clean_text(paragraphs[i])
        i += 1
        if info.startswith("Level "):
            match = re.match(r"Level\s+(\d+)\s+([^(]+)(?:\s*\(([^)]+)\))?", info)
            if not match:
                raise ValueError(f"Unparsed level line for {name!r}: {info!r}")
            level = int(match.group(1))
            school = clean_text(match.group(2))
            classes = [clean_text(part) for part in match.group(3).split(",")] if match.group(3) else []
        else:
            match = re.match(r"([^()]+)\s+Cantrip(?:\s*\(([^)]+)\))?", info)
            if not match:
                raise ValueError(f"Unparsed cantrip line for {name!r}: {info!r}")
            level = 0
            school = clean_text(match.group(1))
            classes = [clean_text(part) for part in match.group(2).split(",")] if match.group(2) else []
        classes = [cls for cls in (c.strip() for c in classes) if cls]

        field_lines: list[str] = []
        while i < end:
            line = paragraphs[i].strip()
            if not line:
                i += 1
                continue
            field_lines.append(line)
            i += 1
            blob = " ".join(field_lines)
            temp_fields = {}
            for match in FIELD_PATTERN.finditer(blob):
                key = match.group(1)
                if key.startswith("Component"):
                    key = "Components"
                temp_fields[key] = clean_text(match.group(2))
            fields = temp_fields
            if len(fields) >= 4:
                break
        if len(fields) < 4:
            raise ValueError(f"Missing fields for {name!r}: {field_lines!r}")

        extra_intro: list[str] = []
        matches = list(FIELD_PATTERN.finditer(" ".join(field_lines)))
        if matches:
            tail = clean_text(" ".join(field_lines)[matches[-1].end():])
            if tail:
                extra_intro.append(tail)

        duration_value, duration_extra = split_duration(fields["Duration"])
        fields["Duration"] = duration_value
        if duration_extra:
            extra_intro.append(duration_extra)

        description_parts: list[str] = extra_intro
        while i < end:
            line = paragraphs[i].strip()
            if not line:
                i += 1
                continue
            if is_spell_name(i):
                break
            description_parts.append(line)
            i += 1

        cleaned_parts: list[str] = []
        higher_levels = None
        markers = ["Using a Higher-Level Spell Slot.", "Cantrip Upgrade."]
        for part in description_parts:
            if not part.strip():
                continue
            cleaned = clean_text(part)
            if higher_levels is None:
                for marker in markers:
                    if cleaned.startswith(marker):
                        higher_levels = cleaned[len(marker) :].strip().lstrip("-: .")
                        cleaned = ""
                        break
            if cleaned:
                cleaned_parts.append(cleaned)
        description = "\n\n".join(cleaned_parts)

        spell_data = {
            "name": name,
            "level": level,
            "school": school,
            "castingTime": normalize_casting_time(fields["Casting Time"]),
            "range": clean_text(fields["Range"]),
            "components": split_components(fields["Components"]),
            "duration": clean_text(fields["Duration"]),
            "description": description,
            "classes": classes,
        }
        if higher_levels:
            spell_data["higherLevels"] = higher_levels

        slug = slugify(name)
        if slug in spells:
            raise ValueError(f"Duplicate slug {slug!r} for {name!r}")
        spells[slug] = spell_data
    return spells


def write_output(spells: OrderedDict[str, dict]) -> None:
    header = """/**\n * D&D Player Handbook spell list\n * Source: docs/rules/playerHandbook.pdf (pp. 107-175)\n * Generated via scripts/generate_spells_from_docx.py\n */\n"""
    content = json.dumps(spells, indent=2, ensure_ascii=False)
    OUTPUT_PATH.write_text(
        f"{header}\nconst spells = {content};\n\nmodule.exports = spells;\n",
        encoding="utf-8",
    )


def main() -> None:
    paragraphs = read_paragraphs()
    spells = extract_spells(paragraphs)
    write_output(spells)
    print(f"Wrote {len(spells)} spells to {OUTPUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
