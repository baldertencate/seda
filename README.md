# Ear Trainer

Mobile-first musical ear-training PWA built with React, TypeScript, Vite,
VexFlow, and Tone.js.

## PDMX MusicXML Corpus

The repo includes a reproducible pipeline for downloading the PDMX MusicXML
assets and building the deterministic 600-piece corpus used for exercise
generation experiments.

From the repository root:

```bash
bash scripts/pdmx_corpus/prepare_pdmx_corpus.sh
```

The pipeline installs its own Python dependencies into `data/pdmx/.venv`,
downloads and verifies `PDMX.csv` plus `mxl.tar.gz`, extracts the MXL files, and
builds a 600-piece corpus with seed `42`.

Full instructions live in
[scripts/pdmx_corpus/README.md](scripts/pdmx_corpus/README.md).

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
