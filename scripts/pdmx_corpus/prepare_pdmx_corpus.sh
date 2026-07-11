#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PDMX_DIR="${PDMX_DIR:-${REPO_ROOT}/data/pdmx}"
OUTPUT_DIR="${OUTPUT_DIR:-${REPO_ROOT}/data/pdmx_corpus_600}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
JOBS="${JOBS:-8}"
CHUNK_MB="${CHUNK_MB:-128}"
SEED="${SEED:-42}"
TARGET_PER_CATEGORY="${TARGET_PER_CATEGORY:-100}"

cd "${REPO_ROOT}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download PDMX." >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required to extract mxl.tar.gz." >&2
  exit 1
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "${PYTHON_BIN} is required. Set PYTHON_BIN=/path/to/python if needed." >&2
  exit 1
fi

mkdir -p "${PDMX_DIR}"

echo "Creating Python environment in ${PDMX_DIR}/.venv"
"${PYTHON_BIN}" -m venv "${PDMX_DIR}/.venv"
"${PDMX_DIR}/.venv/bin/pip" install --upgrade pip
"${PDMX_DIR}/.venv/bin/pip" install -r "${SCRIPT_DIR}/requirements.txt"

echo "Downloading and verifying PDMX.csv and mxl.tar.gz"
"${PDMX_DIR}/.venv/bin/python" "${SCRIPT_DIR}/download_pdmx_assets.py" \
  --output-dir "${PDMX_DIR}" \
  --jobs "${JOBS}" \
  --chunk-mb "${CHUNK_MB}"

if [ ! -d "${PDMX_DIR}/mxl" ]; then
  echo "Extracting ${PDMX_DIR}/mxl.tar.gz"
  tar -xzf "${PDMX_DIR}/mxl.tar.gz" -C "${PDMX_DIR}"
else
  echo "${PDMX_DIR}/mxl already exists; skipping extraction"
fi

echo "Building deterministic ${TARGET_PER_CATEGORY} x 6 corpus in ${OUTPUT_DIR}"
"${PDMX_DIR}/.venv/bin/python" "${SCRIPT_DIR}/build_pdmx_corpus.py" \
  --pdmx-root "${PDMX_DIR}" \
  --metadata "${PDMX_DIR}/PDMX.csv" \
  --output-dir "${OUTPUT_DIR}" \
  --target-per-category "${TARGET_PER_CATEGORY}" \
  --seed "${SEED}" \
  --deduplicated-column "subset:deduplicated" \
  --no-license-conflict-column "subset:no_license_conflict" \
  --all-valid-column "subset:all_valid" \
  --mxl-path-column "mxl"

echo
echo "Done."
echo "Corpus: ${OUTPUT_DIR}"
echo "Summary: ${OUTPUT_DIR}/summary.md"
