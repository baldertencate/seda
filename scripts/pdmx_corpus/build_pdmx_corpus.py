#!/usr/bin/env python3
"""Build a curated MusicXML/MXL corpus from a local PDMX checkout."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import random
import re
import shutil
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    from slugify import slugify
except ImportError:  # pragma: no cover
    slugify = None

CATEGORIES = [
    "keyboard",
    "solo_melodic",
    "chamber",
    "vocal_choral",
    "folk_traditional",
    "mixed_other",
]

MANIFEST_FIELDS = [
    "corpus_id",
    "category",
    "title",
    "composer",
    "arranger",
    "publisher",
    "license",
    "license_url",
    "source_url",
    "pdmx_id",
    "pdmx_path",
    "local_path",
    "n_tracks",
    "track_names",
    "duration_seconds",
    "n_bars",
    "n_beats",
    "n_notes",
    "genres",
    "tags",
    "has_lyrics",
    "is_deduplicated",
    "no_license_conflict",
    "all_valid",
    "download_or_copy_date",
]

REJECT_FIELDS = ["pdmx_id", "title", "composer", "candidate_category", "reason", "path"]
TRUE_VALUES = {"true", "1", "yes", "y", "t"}
FALSE_VALUES = {"false", "0", "no", "n", "f"}

COLUMN_CANDIDATES = {
    "deduplicated": ["deduplicated", "is_deduplicated", "dedup", "is_dedup"],
    "no_license_conflict": [
        "no_license_conflict",
        "license_conflict_free",
        "has_no_license_conflict",
        "license_valid",
    ],
    "all_valid": ["all_valid", "valid", "is_valid", "valid_score", "musicxml_valid"],
    "path": [
        "mxl_path",
        "musicxml_path",
        "xml_path",
        "score_path",
        "path",
        "filepath",
        "file_path",
        "relpath",
    ],
    "mxl_path": ["mxl_path", "mxl", "mxl_file", "compressed_musicxml_path"],
    "musicxml_path": ["musicxml_path", "musicxml", "xml_path", "xml", "score_path"],
    "title": ["title", "work_title", "piece_title", "name"],
    "composer": ["composer", "composer_name", "composers", "artist_name", "artist", "creator"],
    "arranger": ["arranger", "arrangers"],
    "publisher": ["publisher"],
    "license": ["license", "license_name", "license_type"],
    "license_url": ["license_url", "license_uri"],
    "source_url": ["source_url", "url", "musescore_url", "source"],
    "pdmx_id": ["pdmx_id", "id", "score_id", "uid"],
    "n_tracks": ["n_tracks", "num_tracks", "tracks", "part_count", "n_parts"],
    "track_names": ["track_names", "tracks", "tracks_names", "instrument_names", "instruments", "parts"],
    "duration_seconds": ["duration_seconds", "song_length.seconds", "duration", "seconds"],
    "n_bars": ["n_bars", "song_length.bars", "bars", "measures", "n_measures"],
    "n_beats": ["n_beats", "song_length.beats", "beats"],
    "n_notes": ["n_notes", "notes", "note_count"],
    "genres": ["genres", "genre"],
    "tags": ["tags", "tag"],
    "has_lyrics": ["has_lyrics", "lyrics", "contains_lyrics"],
}

KEYBOARD_TERMS = ["piano", "keyboard", "harpsichord", "clavichord", "organ", "accordion", "celesta"]
SOLO_TERMS = [
    "violin",
    "viola",
    "cello",
    "double bass",
    "contrabass",
    "flute",
    "oboe",
    "clarinet",
    "bassoon",
    "saxophone",
    "trumpet",
    "horn",
    "trombone",
    "recorder",
    "mandolin",
    "guitar",
    "kamancheh",
]
CHAMBER_TERMS = [
    "quartet",
    "trio",
    "duet",
    "duo",
    "quintet",
    "sextet",
    "small ensemble",
    "sonata for",
    "piano trio",
    "string quartet",
]
VOCAL_TERMS = [
    "soprano",
    "alto",
    "tenor",
    "bass",
    "voice",
    "vocal",
    "choir",
    "chorus",
    "song",
    "hymn",
    "chorale",
    "aria",
    "lied",
    "mass",
    "motet",
]
FOLK_TERMS = [
    "folk",
    "traditional",
    "trad.",
    "anonymous",
    "national song",
    "dance",
    "reel",
    "jig",
    "hornpipe",
    "ballad",
    "carol",
    "hymn",
    "children",
]


@dataclass
class ColumnMap:
    columns: dict[str, str | None]


@dataclass
class Candidate:
    row: dict[str, Any]
    path: Path
    categories: list[str]
    primary_category: str
    quality_score: float


@dataclass
class ValidationResult:
    n_tracks: int
    track_names: list[str]
    duration_seconds: float | None
    n_bars: int | None
    n_beats: float | None
    n_notes: int
    has_lyrics: bool
    fingerprint: str


def normalize_bool(value: Any) -> bool | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if value == 1:
            return True
        if value == 0:
            return False
    text = str(value).strip().lower()
    if text in TRUE_VALUES:
        return True
    if text in FALSE_VALUES:
        return False
    return None


def clean_cell(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return str(value).strip()


def split_text(value: Any) -> list[str]:
    text = clean_cell(value)
    if not text:
        return []
    if text.startswith("[") and text.endswith("]"):
        text = text.strip("[]")
    return [part.strip(" '\"\t") for part in re.split(r"[;|,\n]", text) if part.strip(" '\"\t")]


def contains_any(text: str, terms: Iterable[str]) -> bool:
    return any(term in text for term in terms)


def filename_safe(value: str) -> str:
    fallback = re.sub(r"[^a-zA-Z0-9]+", "_", value.lower()).strip("_")
    if slugify is not None:
        return slugify(value, separator="_") or fallback or "unknown"
    return fallback or "unknown"


def truncate_slug(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    return value[:max_length].rstrip("_") or "unknown"


def find_column(columns: Iterable[str], candidates: Iterable[str], explicit: str | None = None) -> str | None:
    available = {column.lower(): column for column in columns}
    if explicit:
        if explicit in available.values():
            return explicit
        if explicit.lower() in available:
            return available[explicit.lower()]
        raise ValueError(f"Configured column '{explicit}' was not found.")
    for candidate in candidates:
        if candidate.lower() in available:
            return available[candidate.lower()]
    return None


def build_column_map(df: pd.DataFrame, args: argparse.Namespace) -> ColumnMap:
    explicit = {
        "deduplicated": args.deduplicated_column,
        "no_license_conflict": args.no_license_conflict_column,
        "all_valid": args.all_valid_column,
        "path": args.path_column,
        "mxl_path": args.mxl_path_column,
        "musicxml_path": args.musicxml_path_column,
    }
    mapped = {
        key: find_column(df.columns, candidates, explicit.get(key))
        for key, candidates in COLUMN_CANDIDATES.items()
    }
    missing = [key for key in ["deduplicated", "no_license_conflict", "all_valid"] if mapped[key] is None]
    if missing:
        raise ValueError(
            "Missing required metadata columns: "
            + ", ".join(missing)
            + ". Use the --*-column arguments to map this PDMX release."
        )
    return ColumnMap(mapped)


def load_metadata(path: Path) -> pd.DataFrame:
    import pandas as pd

    df = pd.read_csv(path, low_memory=False)
    print("Available metadata columns:")
    for column in df.columns:
        print(f"  - {column}")
    print(f"Loaded metadata: {len(df)} rows")
    return df


def row_value(row: dict[str, Any], columns: ColumnMap, field: str) -> Any:
    column = columns.columns.get(field)
    return row.get(column, "") if column else ""


def metadata_text(row: dict[str, Any], columns: ColumnMap) -> str:
    fields = ["title", "composer", "track_names", "genres", "tags"]
    return " ".join(clean_cell(row_value(row, columns, field)).lower() for field in fields)


def get_number(row: dict[str, Any], columns: ColumnMap, field: str) -> float | None:
    value = row_value(row, columns, field)
    if value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(number) else number


def resolve_musicxml_path(row: dict[str, Any], columns: ColumnMap, pdmx_root: Path) -> Path | None:
    raw_paths = [clean_cell(row_value(row, columns, field)) for field in ["mxl_path", "musicxml_path", "path"]]
    candidates: list[Path] = []
    for raw_path in raw_paths:
        if not raw_path:
            continue
        path = Path(raw_path).expanduser()
        candidates.append(path if path.is_absolute() else pdmx_root / path)
    candidates.sort(key=lambda path: 0 if path.suffix.lower() == ".mxl" else 1)
    for path in candidates:
        if path.exists() and path.suffix.lower() in {".mxl", ".musicxml", ".xml"}:
            return path
    for path in candidates:
        if path.exists() and path.is_file():
            return path
        if path.exists() and path.is_dir():
            for suffix in ("*.mxl", "*.musicxml", "*.xml"):
                matches = sorted(path.glob(suffix))
                if matches:
                    return matches[0]
    return None


def is_license_acceptable(row: dict[str, Any], columns: ColumnMap) -> bool:
    if normalize_bool(row_value(row, columns, "no_license_conflict")) is not True:
        return False
    license_text = clean_cell(row_value(row, columns, "license")).lower()
    if not license_text:
        return False
    conflict_terms = ["all rights reserved", "copyright", "non-commercial", "noncommercial", "unknown"]
    return not contains_any(license_text, conflict_terms)


def classify_piece(row: dict[str, Any], columns: ColumnMap) -> list[str]:
    text = metadata_text(row, columns)
    n_tracks = get_number(row, columns, "n_tracks")
    has_lyrics = normalize_bool(row_value(row, columns, "has_lyrics")) is True
    categories: list[str] = []
    if contains_any(text, FOLK_TERMS):
        categories.append("folk_traditional")
    if has_lyrics or contains_any(text, VOCAL_TERMS):
        categories.append("vocal_choral")
    if contains_any(text, KEYBOARD_TERMS):
        categories.append("keyboard")
    if contains_any(text, SOLO_TERMS) and (n_tracks is None or n_tracks <= 2):
        categories.append("solo_melodic")
    if contains_any(text, CHAMBER_TERMS) or (n_tracks is not None and 2 <= n_tracks <= 5 and not has_lyrics):
        categories.append("chamber")
    categories.append("mixed_other")
    ordered = []
    for category in categories:
        if category not in ordered:
            ordered.append(category)
    return ordered


def quality_score(row: dict[str, Any], columns: ColumnMap) -> float:
    score = 0.0
    for field in ["title", "composer", "track_names", "license", "source_url"]:
        if clean_cell(row_value(row, columns, field)):
            score += 1.0
    n_bars = get_number(row, columns, "n_bars")
    n_notes = get_number(row, columns, "n_notes")
    duration = get_number(row, columns, "duration_seconds")
    if n_bars is not None and 8 <= n_bars <= 500:
        score += 1.0
    if n_notes is not None and n_notes >= 20:
        score += 1.0
    if duration is not None and 20 <= duration <= 1800:
        score += 1.0
    return score


def compute_file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_musicxml(path: Path, musescore_bin: str | None = None) -> ValidationResult:
    from music21 import chord, converter, note

    score = converter.parse(path)
    parts = list(score.parts)
    if not parts:
        raise ValueError("score has no parts")
    pitched_events = []
    durations = []
    note_count = 0
    has_lyrics = False
    for event in score.recurse().notes:
        if isinstance(event, note.Note):
            note_count += 1
            pitched_events.append(event.pitch.midi)
            durations.append(round(float(event.duration.quarterLength), 3))
            if event.lyric:
                has_lyrics = True
        elif isinstance(event, chord.Chord):
            note_count += len(event.pitches)
            root = event.root()
            if root is not None:
                pitched_events.append(root.midi)
                durations.append(round(float(event.duration.quarterLength), 3))
    if note_count == 0:
        raise ValueError("score has no notes")
    measures = list(score.recurse().getElementsByClass("Measure"))
    if not measures:
        raise ValueError("score has no measurable bars")
    if musescore_bin:
        output = path.with_suffix(".validation.pdf")
        try:
            subprocess.run(
                [musescore_bin, str(path), "-o", str(output)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=60,
            )
        finally:
            output.unlink(missing_ok=True)
    track_names = [
        str(part.partName or part.partAbbreviation)
        for part in parts
        if part.partName or part.partAbbreviation
    ]
    first = pitched_events[:100]
    fingerprint_payload = {
        "pitch_mod": [pitch % 12 for pitch in first],
        "intervals": [(b - a) % 12 for a, b in zip(first, first[1:])],
        "durations": durations[:100],
        "n_tracks": len(parts),
        "n_bars": len(measures),
    }
    fingerprint = hashlib.sha256(json.dumps(fingerprint_payload, sort_keys=True).encode()).hexdigest()
    return ValidationResult(
        n_tracks=len(parts),
        track_names=track_names,
        duration_seconds=float(score.highestTime) if score.highestTime is not None else None,
        n_bars=len(measures),
        n_beats=float(score.highestTime) if score.highestTime is not None else None,
        n_notes=note_count,
        has_lyrics=has_lyrics,
        fingerprint=fingerprint,
    )


def reject_row(
    rejected: list[dict[str, str]],
    row: dict[str, Any],
    columns: ColumnMap,
    category: str,
    reason: str,
    path: Path | None = None,
) -> None:
    rejected.append(
        {
            "pdmx_id": clean_cell(row_value(row, columns, "pdmx_id")),
            "title": clean_cell(row_value(row, columns, "title")),
            "composer": clean_cell(row_value(row, columns, "composer")),
            "candidate_category": category,
            "reason": reason,
            "path": str(path or ""),
        }
    )


def build_candidates(
    df: pd.DataFrame,
    columns: ColumnMap,
    pdmx_root: Path,
    rejected: list[dict[str, str]],
) -> list[Candidate]:
    candidates = []
    primary_counts = Counter()
    for row in df.to_dict(orient="records"):
        categories = classify_piece(row, columns)
        primary_counts[categories[0]] += 1
        path = resolve_musicxml_path(row, columns, pdmx_root)
        if path is None:
            reject_row(rejected, row, columns, categories[0], "missing file")
            continue
        candidates.append(
            Candidate(
                row=row,
                path=path,
                categories=categories,
                primary_category=categories[0],
                quality_score=quality_score(row, columns),
            )
        )
    print("Candidates by heuristic category:")
    for category in CATEGORIES:
        print(f"  {category}: {primary_counts[category]}")
    return candidates


def make_manifest_row(
    corpus_id: str,
    category: str,
    candidate: Candidate,
    columns: ColumnMap,
    local_path: Path,
    validation: ValidationResult,
    copy_date: str,
) -> dict[str, Any]:
    row = candidate.row
    track_names = validation.track_names or split_text(row_value(row, columns, "track_names"))
    return {
        "corpus_id": corpus_id,
        "category": category,
        "title": clean_cell(row_value(row, columns, "title")),
        "composer": clean_cell(row_value(row, columns, "composer")),
        "arranger": clean_cell(row_value(row, columns, "arranger")),
        "publisher": clean_cell(row_value(row, columns, "publisher")),
        "license": clean_cell(row_value(row, columns, "license")),
        "license_url": clean_cell(row_value(row, columns, "license_url")),
        "source_url": clean_cell(row_value(row, columns, "source_url")),
        "pdmx_id": clean_cell(row_value(row, columns, "pdmx_id")),
        "pdmx_path": str(candidate.path),
        "local_path": str(local_path),
        "n_tracks": int(get_number(row, columns, "n_tracks") or validation.n_tracks),
        "track_names": "; ".join(track_names),
        "duration_seconds": get_number(row, columns, "duration_seconds") or validation.duration_seconds,
        "n_bars": int(get_number(row, columns, "n_bars") or validation.n_bars or 0),
        "n_beats": get_number(row, columns, "n_beats") or validation.n_beats,
        "n_notes": int(get_number(row, columns, "n_notes") or validation.n_notes),
        "genres": clean_cell(row_value(row, columns, "genres")),
        "tags": clean_cell(row_value(row, columns, "tags")),
        "has_lyrics": normalize_bool(row_value(row, columns, "has_lyrics"))
        if row_value(row, columns, "has_lyrics") != ""
        else validation.has_lyrics,
        "is_deduplicated": normalize_bool(row_value(row, columns, "deduplicated")),
        "no_license_conflict": normalize_bool(row_value(row, columns, "no_license_conflict")),
        "all_valid": normalize_bool(row_value(row, columns, "all_valid")),
        "download_or_copy_date": copy_date,
    }


def stable_filename(index: int, row: dict[str, Any], columns: ColumnMap, source_path: Path) -> str:
    composer = truncate_slug(
        filename_safe(clean_cell(row_value(row, columns, "composer")) or "unknown_composer"),
        48,
    )
    title = truncate_slug(
        filename_safe(clean_cell(row_value(row, columns, "title")) or "unknown_title"),
        96,
    )
    return f"{index:04d}__{composer}__{title}{source_path.suffix.lower() or '.mxl'}"


def select_category_samples(
    candidates: list[Candidate],
    columns: ColumnMap,
    output_dir: Path,
    target_per_category: int,
    rng: random.Random,
    musescore_bin: str | None,
    rejected: list[dict[str, str]],
) -> list[dict[str, Any]]:
    from tqdm import tqdm

    selected: list[dict[str, Any]] = []
    selected_keys = set()
    file_hashes = set()
    fingerprints = set()
    copy_date = datetime.now(timezone.utc).date().isoformat()
    corpus_index = 1
    for category in CATEGORIES:
        category_candidates = [candidate for candidate in candidates if category in candidate.categories]
        rng.shuffle(category_candidates)
        category_candidates.sort(key=lambda candidate: candidate.quality_score, reverse=True)
        category_count = 0
        for composer_limit in (10, 20, None):
            composer_counts = Counter(
                row["composer"].lower() or "unknown"
                for row in selected
                if row["category"] == category
            )
            for candidate in tqdm(category_candidates, desc=f"Selecting {category}"):
                if category_count >= target_per_category:
                    break
                row = candidate.row
                candidate_key = clean_cell(row_value(row, columns, "pdmx_id")) or str(candidate.path)
                if candidate_key in selected_keys:
                    continue
                composer = clean_cell(row_value(row, columns, "composer")).lower() or "unknown"
                if composer_limit is not None and composer_counts[composer] >= composer_limit:
                    continue
                if not is_license_acceptable(row, columns):
                    reject_row(rejected, row, columns, category, "license conflict", candidate.path)
                    selected_keys.add(candidate_key)
                    continue
                try:
                    file_hash = compute_file_hash(candidate.path)
                except OSError as error:
                    reject_row(rejected, row, columns, category, f"missing file: {error}", candidate.path)
                    selected_keys.add(candidate_key)
                    continue
                if file_hash in file_hashes:
                    reject_row(rejected, row, columns, category, "duplicate file hash", candidate.path)
                    selected_keys.add(candidate_key)
                    continue
                try:
                    validation = validate_musicxml(candidate.path, musescore_bin)
                except Exception as error:  # noqa: BLE001
                    reason = "no notes" if "no notes" in str(error).lower() else "parse failure"
                    reject_row(rejected, row, columns, category, f"{reason}: {error}", candidate.path)
                    selected_keys.add(candidate_key)
                    continue
                if validation.fingerprint in fingerprints:
                    reject_row(rejected, row, columns, category, "duplicate musical fingerprint", candidate.path)
                    selected_keys.add(candidate_key)
                    continue
                category_dir = output_dir / "musicxml" / category
                category_dir.mkdir(parents=True, exist_ok=True)
                local_path = category_dir / stable_filename(corpus_index, row, columns, candidate.path)
                shutil.copy2(candidate.path, local_path)
                corpus_id = f"{category}-{category_count + 1:04d}"
                selected.append(
                    make_manifest_row(corpus_id, category, candidate, columns, local_path, validation, copy_date)
                )
                selected_keys.add(candidate_key)
                file_hashes.add(file_hash)
                fingerprints.add(validation.fingerprint)
                composer_counts[composer] += 1
                category_count += 1
                corpus_index += 1
            if category_count >= target_per_category:
                break
        if category_count < target_per_category:
            print(f"Warning: selected only {category_count}/{target_per_category} for {category}.", file=sys.stderr)
    return selected


def write_manifest(output_dir: Path, selected: list[dict[str, Any]]) -> None:
    with (output_dir / "manifest.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=MANIFEST_FIELDS)
        writer.writeheader()
        writer.writerows(selected)
    with (output_dir / "manifest.json").open("w", encoding="utf-8") as file:
        json.dump(selected, file, indent=2, ensure_ascii=False)


def write_rejections(output_dir: Path, rejected: list[dict[str, str]]) -> None:
    with (output_dir / "rejected_candidates.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=REJECT_FIELDS)
        writer.writeheader()
        writer.writerows(rejected)


def write_summary(output_dir: Path, selected: list[dict[str, Any]], rejected: list[dict[str, str]]) -> str:
    category_counts = Counter(row["category"] for row in selected)
    license_counts = Counter(row["license"] or "unknown" for row in selected)
    composer_counts = Counter(row["composer"] or "unknown" for row in selected)
    track_counts = Counter()
    for row in selected:
        track_counts.update(split_text(row["track_names"]))
    rejection_counts = Counter(row["reason"].split(":")[0] for row in rejected)
    lines = [
        "# PDMX Corpus Summary",
        "",
        f"Total selected: {len(selected)}",
        "",
        "## Counts by category",
    ]
    lines.extend(f"{category}: {category_counts[category]}" for category in CATEGORIES)
    lines.extend(["", "## Counts by license"])
    lines.extend(f"{license_name}: {count}" for license_name, count in license_counts.most_common())
    lines.extend(["", "## Top composers"])
    lines.extend(f"{composer}: {count}" for composer, count in composer_counts.most_common(20))
    lines.extend(["", "## Instrument / track-name overview"])
    lines.extend(f"{track}: {count}" for track, count in track_counts.most_common(30))
    lines.extend(["", "## Rejected candidates", f"Total rejected: {len(rejected)}"])
    lines.extend(f"- {reason}: {count}" for reason, count in rejection_counts.most_common())
    summary = "\n".join(lines) + "\n"
    (output_dir / "summary.md").write_text(summary, encoding="utf-8")
    return summary


def filter_metadata(df: pd.DataFrame, columns: ColumnMap) -> pd.DataFrame:
    mask = (
        df[columns.columns["deduplicated"]].map(normalize_bool).eq(True)
        & df[columns.columns["no_license_conflict"]].map(normalize_bool).eq(True)
        & df[columns.columns["all_valid"]].map(normalize_bool).eq(True)
    )
    filtered = df[mask].copy()
    print(f"After deduplicated/no-license-conflict/all-valid filter: {len(filtered)} rows")
    return filtered


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdmx-root", required=True, type=Path)
    parser.add_argument("--metadata", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--target-per-category", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--musescore-bin")
    parser.add_argument("--deduplicated-column")
    parser.add_argument("--no-license-conflict-column")
    parser.add_argument("--all-valid-column")
    parser.add_argument("--path-column")
    parser.add_argument("--mxl-path-column")
    parser.add_argument("--musicxml-path-column")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rng = random.Random(args.seed)
    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    for category in CATEGORIES:
        (output_dir / "musicxml" / category).mkdir(parents=True, exist_ok=True)
    df = load_metadata(args.metadata.expanduser().resolve())
    try:
        columns = build_column_map(df, args)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2
    rejected: list[dict[str, str]] = []
    filtered = filter_metadata(df, columns)
    candidates = build_candidates(filtered, columns, args.pdmx_root.expanduser().resolve(), rejected)
    selected = select_category_samples(
        candidates,
        columns,
        output_dir,
        args.target_per_category,
        rng,
        args.musescore_bin,
        rejected,
    )
    write_manifest(output_dir, selected)
    write_rejections(output_dir, rejected)
    summary = write_summary(output_dir, selected, rejected)
    print("\nSelected:")
    for category in CATEGORIES:
        print(f"  {category}: {sum(1 for row in selected if row['category'] == category)}")
    print()
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
