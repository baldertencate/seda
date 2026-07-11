# PDMX MusicXML Corpus Builder

This folder contains a self-contained pipeline for downloading the PDMX files we
need and building a deterministic 600-piece MusicXML/MXL corpus.

The default command downloads only:

- `PDMX.csv`
- `mxl.tar.gz`

It does not download PDMX PDFs, MIDI files, or render JSON.

## Quick Start

From the repository root:

```bash
bash scripts/pdmx_corpus/prepare_pdmx_corpus.sh
```

That command will:

1. Create a local Python environment at `data/pdmx/.venv`.
2. Install Python dependencies from `scripts/pdmx_corpus/requirements.txt`.
3. Download `PDMX.csv` and `mxl.tar.gz` from the official Zenodo record.
4. Verify the official MD5 checksums.
5. Extract `mxl.tar.gz` into `data/pdmx/mxl`.
6. Build the 600-piece corpus with `--seed 42`.

Default output:

```text
data/pdmx_corpus_600/
  manifest.csv
  manifest.json
  rejected_candidates.csv
  summary.md
  musicxml/
    keyboard/
    solo_melodic/
    chamber/
    vocal_choral/
    folk_traditional/
    mixed_other/
```

`data/` is ignored by git because the downloaded dataset and generated corpus are
large local artifacts.

## Reproducibility

The off-the-shelf command uses:

```text
target per category: 100
seed: 42
PDMX record: https://zenodo.org/records/15571083
PDMX.csv MD5: 30392ccf38bb63ce70e7afae70f9c88c
mxl.tar.gz MD5: 49ffd75ecf5489c0be6d41182eb11ff7
```

With the same PDMX record, script version, Python dependencies, and seed, users
should get the same selected corpus.

## Requirements

The wrapper expects these system tools:

- `python3`
- `curl`
- `tar`

Python packages are installed automatically into `data/pdmx/.venv`:

- `pandas`
- `music21`
- `tqdm`
- `python-slugify`

## Configuration

The wrapper can be customized with environment variables:

```bash
PDMX_DIR=/path/to/local/pdmx \
OUTPUT_DIR=/path/to/output_corpus \
PYTHON_BIN=python3.12 \
JOBS=8 \
CHUNK_MB=128 \
SEED=42 \
TARGET_PER_CATEGORY=100 \
bash scripts/pdmx_corpus/prepare_pdmx_corpus.sh
```

`JOBS` controls parallel range downloads. If Zenodo or your connection is
unhappy with parallel downloads, lower it:

```bash
JOBS=2 bash scripts/pdmx_corpus/prepare_pdmx_corpus.sh
```

## Manual Run

If you already have PDMX downloaded and extracted, you can skip the downloader
and run the builder directly:

```bash
python scripts/pdmx_corpus/build_pdmx_corpus.py \
  --pdmx-root /path/to/PDMX \
  --metadata /path/to/PDMX/PDMX.csv \
  --output-dir /path/to/output_corpus \
  --target-per-category 100 \
  --seed 42 \
  --deduplicated-column 'subset:deduplicated' \
  --no-license-conflict-column 'subset:no_license_conflict' \
  --all-valid-column 'subset:all_valid' \
  --mxl-path-column mxl
```

The script prints all available metadata columns at startup. For another PDMX
release, adjust the explicit column mappings if needed.

Optional MuseScore validation:

```bash
python scripts/pdmx_corpus/build_pdmx_corpus.py \
  --pdmx-root /path/to/PDMX \
  --metadata /path/to/PDMX/PDMX.csv \
  --output-dir /path/to/output_corpus \
  --target-per-category 100 \
  --seed 42 \
  --musescore-bin /path/to/mscore
```

## Output Manifests

The builder writes:

- `manifest.csv`
- `manifest.json`
- `summary.md`
- `rejected_candidates.csv`

Manifest rows include metadata when available:

- `corpus_id`
- `category`
- `title`
- `composer`
- `arranger`
- `publisher`
- `license`
- `license_url`
- `source_url`
- `pdmx_id`
- `pdmx_path`
- `local_path`
- `n_tracks`
- `track_names`
- `duration_seconds`
- `n_bars`
- `n_beats`
- `n_notes`
- `genres`
- `tags`
- `has_lyrics`
- `is_deduplicated`
- `no_license_conflict`
- `all_valid`
- `download_or_copy_date`

## Selection Rules

Rows are considered only when all three PDMX metadata flags are true:

- `subset:deduplicated`
- `subset:no_license_conflict`
- `subset:all_valid`

Boolean values are normalized from common encodings such as `true`, `1`, `yes`,
`false`, `0`, and `no`.

The script rejects candidates with:

- missing file paths
- missing files
- unclear or conflicting license metadata
- MusicXML parse failures
- no notes
- no measurable bars
- exact duplicate file hashes
- duplicate lightweight musical fingerprints

The lightweight fingerprint uses the first 100 pitched events, pitch classes,
intervals, rounded durations, part count, and bar count.

## Category Heuristics

Classification uses title, composer, track/instrument names, genres, tags,
lyrics metadata, and track counts.

Priority order:

1. `folk_traditional`
2. `vocal_choral`
3. `keyboard`
4. `solo_melodic`
5. `chamber`
6. `mixed_other`

The script keeps alternate category matches, so if a high-priority category is
already full, a piece can still be considered for another matching category.

Category term lists live near the top of `build_pdmx_corpus.py`:

- `KEYBOARD_TERMS`
- `SOLO_TERMS`
- `CHAMBER_TERMS`
- `VOCAL_TERMS`
- `FOLK_TERMS`

## Diversity

Sampling is randomized but reproducible with `--seed`.

Within each category, the script initially caps composers at 10 pieces. If that
prevents filling the category, it relaxes the cap to 20, then unlimited.

Candidates with more complete metadata and reasonable length/note counts are
preferred.

## Known Limitations

This script does not determine copyright status from scratch. It relies on PDMX
metadata and conservative filtering.

The classifier is heuristic. It is intentionally explicit and easy to edit, but
it will not be perfect for every score.

MuseScore validation is optional because MuseScore is not always installed in
data-processing environments.
