from __future__ import annotations

import json
import re
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = REPO_ROOT.parent
CATALOG_ROOT = REPO_ROOT / "assets" / "catalog"
CATALOG_JS = REPO_ROOT / "js" / "catalog-images.js"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Order here is the survey order. Each entry points to the authoritative source
# folder. W03 intentionally uses the LV8-branded replacement instead of the
# original HOKA image.
COLLECTIONS = [
    ("men-storm-shell-set", "men1", "M01", None),
    ("men-signal-panel-shell", "men2", "M02", None),
    ("men-air-panel-track-set", "men3", "M03", None),
    ("men-pace-short", "men4", "M04", None),
    ("men-blue-yoke-shell-set", "men5-v1", "M05", "V1"),
    ("men-graphite-yoke-shell-set", "men5-v2", "M05", "V2"),
    ("men-minimal-black-shell-set", "men5-v3", "M05", "V3"),
    ("men-wide-hooded-sweat-set", "men6", "M06", None),
    ("women-sand-stripe-track-set", "women1", "W01", None),
    ("women-wide-motion-set", "women2", "W02", None),
    ("women-pace-essential-tee", "women3", "W03", "__LV8_BRANDED__"),
    ("women-asymmetric-modest-top", "women4", "W04", None),
    ("women-piped-track-set", "women5", "W05", None),
    ("women-air-street-set", "women6", "W06", None),
    ("women-oversized-crew", "women7-v1", "W07", "V1"),
    ("women-half-zip-crew", "women7-v2", "W07", "V2"),
    ("women-full-zip-crew", "women7-v3", "W07", "V3"),
    ("women-modest-colorblock-set", "women8", "W08", None),
    ("women-modest-zip-set", "women9", "W09", None),
    ("women-navy-piped-track-set", "women10", "W10", None),
    ("women-taupe-piped-hoodie-set", "women11", "W11", None),
    ("women-sage-motion-hoodie-set", "women12", "W12", None),
    ("women-lilac-panel-track-set", "women13", "W13", None),
]


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", path.name)]


def image_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        raise FileNotFoundError(f"Missing source folder: {directory}")
    return sorted(
        (path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS),
        key=natural_key,
    )


def collection_files(folder: str, variant: str | None) -> list[Path]:
    base = SOURCE_ROOT / folder
    if variant == "__LV8_BRANDED__":
        branded = base / "lv8-logo" / "1.png"
        remaining = [base / f"{number}.webp" for number in range(2, 8)]
        paths = [branded, *remaining]
        missing = [path for path in paths if not path.is_file()]
        if missing:
            raise FileNotFoundError(f"Missing W03 final image(s): {', '.join(map(str, missing))}")
        return paths
    return image_files(base / variant if variant else base)


def safe_reset_catalog() -> None:
    catalog = CATALOG_ROOT.resolve()
    repo = REPO_ROOT.resolve()
    if catalog.parent != (repo / "assets").resolve() or catalog.name != "catalog":
        raise RuntimeError(f"Refusing to reset unexpected path: {catalog}")
    if CATALOG_ROOT.exists():
        shutil.rmtree(CATALOG_ROOT)
    CATALOG_ROOT.mkdir(parents=True)


def normalized_image(source: Path) -> Image.Image:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        has_alpha = image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info)
        return image.convert("RGBA" if has_alpha else "RGB")


def save_variant(image: Image.Image, destination: Path, max_size: int, quality: int) -> None:
    output = image.copy()
    output.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, "WEBP", quality=quality, method=6, optimize=True)


def optimize_one(source: Path, full_path: Path, thumb_path: Path) -> None:
    image = normalized_image(source)
    save_variant(image, full_path, 1280, 78)
    save_variant(image, thumb_path, 360, 70)


def web_path(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def main() -> None:
    safe_reset_catalog()
    catalog: dict[str, dict[str, list[str]]] = {}
    jobs: list[tuple[Path, Path, Path]] = []

    for style_id, destination_folder, source_folder, variant in COLLECTIONS:
        sources = collection_files(source_folder, variant)
        if not sources:
            raise RuntimeError(f"No images found for {style_id}")
        full_paths: list[str] = []
        thumb_paths: list[str] = []
        for index, source in enumerate(sources, start=1):
            full_path = CATALOG_ROOT / destination_folder / f"{index}.webp"
            thumb_path = CATALOG_ROOT / destination_folder / "thumbs" / f"{index}.webp"
            jobs.append((source, full_path, thumb_path))
            full_paths.append(web_path(full_path))
            thumb_paths.append(web_path(thumb_path))
        catalog[style_id] = {"images": full_paths, "thumbnails": thumb_paths}

    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(lambda job: optimize_one(*job), jobs))

    serialized = json.dumps(catalog, ensure_ascii=False, indent=2)
    CATALOG_JS.write_text(
        "window.LV8_CATALOG_IMAGES = Object.freeze(" + serialized + ");\n",
        encoding="utf-8",
    )

    source_bytes = sum(source.stat().st_size for source, _, _ in jobs)
    output_files = list(CATALOG_ROOT.rglob("*.webp"))
    output_bytes = sum(path.stat().st_size for path in output_files)
    print(
        f"Optimized {len(jobs)} images across {len(COLLECTIONS)} styles: "
        f"{source_bytes / 1024 / 1024:.1f} MB source -> {output_bytes / 1024 / 1024:.1f} MB full + thumbnails."
    )


if __name__ == "__main__":
    main()
