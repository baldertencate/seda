#!/usr/bin/env python3
"""Download the PDMX files needed for the local MusicXML corpus build."""

from __future__ import annotations

import argparse
import hashlib
import math
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PdmxAsset:
    filename: str
    url: str
    size: int
    md5: str


ASSETS = [
    PdmxAsset(
        filename="PDMX.csv",
        url="https://zenodo.org/api/records/15571083/files/PDMX.csv/content",
        size=225_399_738,
        md5="30392ccf38bb63ce70e7afae70f9c88c",
    ),
    PdmxAsset(
        filename="mxl.tar.gz",
        url="https://zenodo.org/api/records/15571083/files/mxl.tar.gz/content",
        size=1_894_335_797,
        md5="49ffd75ecf5489c0be6d41182eb11ff7",
    ),
]


def md5_for(path: Path) -> str:
    digest = hashlib.md5(usedforsecurity=False)
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_curl(asset: PdmxAsset, start: int, end: int, output_path: Path) -> None:
    if output_path.exists() and output_path.stat().st_size == end - start + 1:
        return

    subprocess.run(
        [
            "curl",
            "-L",
            "--fail",
            "--retry",
            "5",
            "-r",
            f"{start}-{end}",
            "-o",
            str(output_path),
            asset.url,
        ],
        check=True,
    )

    expected_size = end - start + 1
    actual_size = output_path.stat().st_size
    if actual_size != expected_size:
        raise RuntimeError(
            f"{output_path} has {actual_size} bytes, expected {expected_size} bytes"
        )


def assemble(asset: PdmxAsset, part_paths: list[Path], target_path: Path) -> None:
    with target_path.open("wb") as output_file:
        for part_path in part_paths:
            with part_path.open("rb") as input_file:
                for chunk in iter(lambda: input_file.read(1024 * 1024), b""):
                    output_file.write(chunk)


def download_asset(asset: PdmxAsset, output_dir: Path, jobs: int, chunk_mb: int) -> None:
    target_path = output_dir / asset.filename
    if target_path.exists():
        actual_md5 = md5_for(target_path)
        if actual_md5 == asset.md5:
            print(f"{asset.filename}: already downloaded and verified")
            return
        print(f"{asset.filename}: existing file failed MD5, re-downloading")

    chunk_dir = output_dir / "chunks" / asset.filename
    chunk_dir.mkdir(parents=True, exist_ok=True)
    chunk_size = chunk_mb * 1024 * 1024
    n_chunks = math.ceil(asset.size / chunk_size)
    ranges = []
    for index in range(n_chunks):
        start = index * chunk_size
        end = min(asset.size - 1, (index + 1) * chunk_size - 1)
        ranges.append((index, start, end, chunk_dir / f"part{index:03d}"))

    print(f"{asset.filename}: downloading {asset.size:,} bytes in {n_chunks} chunks")
    with ThreadPoolExecutor(max_workers=jobs) as executor:
        futures = [
            executor.submit(run_curl, asset, start, end, part_path)
            for _, start, end, part_path in ranges
        ]
        for finished, future in enumerate(as_completed(futures), start=1):
            future.result()
            print(f"{asset.filename}: chunk {finished}/{n_chunks} complete")

    assemble(asset, [part_path for _, _, _, part_path in ranges], target_path)
    actual_md5 = md5_for(target_path)
    if actual_md5 != asset.md5:
        raise RuntimeError(
            f"{asset.filename}: MD5 mismatch. Expected {asset.md5}, got {actual_md5}"
        )
    print(f"{asset.filename}: verified {actual_md5}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("data/pdmx"))
    parser.add_argument("--jobs", type=int, default=8)
    parser.add_argument("--chunk-mb", type=int, default=128)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.jobs < 1:
        raise ValueError("--jobs must be at least 1")
    if args.chunk_mb < 1:
        raise ValueError("--chunk-mb must be at least 1")

    output_dir = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        download_asset(asset, output_dir, args.jobs, args.chunk_mb)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
