from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "generate_og_images.py"
spec = importlib.util.spec_from_file_location("generate_og_images", MODULE_PATH)
assert spec and spec.loader
og = importlib.util.module_from_spec(spec)
spec.loader.exec_module(og)


def test_save_if_changed_preserves_mtime_for_identical_pixels(tmp_path: Path) -> None:
    path = tmp_path / "og.png"
    image = Image.new("RGB", (16, 16), "purple")

    assert og.save_if_changed(image, path) is True
    before = path.stat().st_mtime_ns

    assert og.save_if_changed(image, path) is False
    assert path.stat().st_mtime_ns == before


def test_save_if_changed_writes_when_pixels_change(tmp_path: Path) -> None:
    path = tmp_path / "og.png"
    assert og.save_if_changed(Image.new("RGB", (16, 16), "purple"), path) is True
    before = path.read_bytes()

    assert og.save_if_changed(Image.new("RGB", (16, 16), "orange"), path) is True
    assert path.read_bytes() != before


def test_save_if_changed_force_rewrites_identical_pixels(tmp_path: Path) -> None:
    path = tmp_path / "og.png"
    image = Image.new("RGB", (16, 16), "purple")

    assert og.save_if_changed(image, path) is True
    before = path.stat().st_mtime_ns

    assert og.save_if_changed(image, path, force=True) is True
    assert path.stat().st_mtime_ns >= before
