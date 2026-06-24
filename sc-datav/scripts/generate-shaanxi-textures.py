#!/usr/bin/env python3
"""
Generate Shaanxi province map textures aligned with sc-datav UV mapping.

Outputs (into src/assets/):
  - sc_map.png
  - sc_displacement_map.png
  - sc_normal_map.png
  - sc_normal_map1.png

Projection matches Inv/Sal/Fin:
  geoMercator().center(outline.centroid).translate([0, 0])  // default scale ~152.95
  geometry y = -mercator_y; UV u,v from province bbox
"""

from __future__ import annotations

import json
import math
import os
import shutil
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
BACKUP = ASSETS / "textures_backup_sichuan"

WIDTH, HEIGHT = 1617, 1384
CENTER = (108.887114, 35.263661)
SCALE = 152.94790031131143
TILE_SIZE = 256
ZOOM = 9

IMAGERY_URL = (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
)
TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "sc-datav-texture-gen/1.0"})


def mercator_xy(lon: float, lat: float) -> tuple[float, float]:
    """Return (x, y) in the same convention as d3.geoMercator()."""
    lon0, lat0 = CENTER
    x = SCALE * math.radians(lon - lon0)
    lat_r = math.radians(lat)
    lat0_r = math.radians(lat0)
    y_raw = SCALE * (
        math.log(math.tan(math.pi / 4 + lat_r / 2))
        - math.log(math.tan(math.pi / 4 + lat0_r / 2))
    )
    return x, -y_raw


def walk_coords(obj, visitor):
    if isinstance(obj[0], (int, float)):
        visitor(obj)
    else:
        for part in obj:
            walk_coords(part, visitor)


def compute_bbox(geojson: dict) -> dict:
    min_x = min_y = math.inf
    max_x = max_y = -math.inf

    def visit(coord):
        nonlocal min_x, min_y, max_x, max_y
        lon, lat = coord[0], coord[1]
        x, y = mercator_xy(lon, lat)
        px, py = x, -y  # geometry y, matches Three.js Shape UV space
        min_x = min(min_x, px)
        max_x = max(max_x, px)
        min_y = min(min_y, py)
        max_y = max(max_y, py)

    for feature in geojson["features"]:
        walk_coords(feature["geometry"]["coordinates"], visit)

    return {
        "min_x": min_x,
        "min_y": min_y,
        "max_x": max_x,
        "max_y": max_y,
        "w": max_x - min_x,
        "h": max_y - min_y,
    }


def lonlat_bounds(geojson: dict, pad: float = 0.02) -> tuple[float, float, float, float]:
    min_lon = min_lat = math.inf
    max_lon = max_lat = -math.inf

    def visit(coord):
        nonlocal min_lon, min_lat, max_lon, max_lat
        lon, lat = coord[0], coord[1]
        min_lon = min(min_lon, lon)
        max_lon = max(max_lon, lon)
        min_lat = min(min_lat, lat)
        max_lat = max(max_lat, lat)

    for feature in geojson["features"]:
        walk_coords(feature["geometry"]["coordinates"], visit)

    dlon = (max_lon - min_lon) * pad
    dlat = (max_lat - min_lat) * pad
    return min_lon - dlon, min_lat - dlat, max_lon + dlon, max_lat + dlat


def lon_to_tile_x(lon, z: int):
    return (lon + 180.0) / 360.0 * (2**z)


def lat_to_tile_y(lat, z: int):
    lat_r = np.radians(lat)
    return (1.0 - np.log(np.tan(lat_r) + 1.0 / np.cos(lat_r)) / math.pi) / 2.0 * (2**z)


def fetch_tile(url: str, z: int, x: int, y: int, retries: int = 3) -> Image.Image | None:
    for attempt in range(retries):
        try:
            r = SESSION.get(url.format(z=z, x=x, y=y), timeout=30)
            if r.status_code == 200:
                return Image.open(BytesIO(r.content)).convert("RGBA")
            if r.status_code == 404:
                return None
        except requests.RequestException:
            time.sleep(0.5 * (attempt + 1))
    return None


def build_mosaic(
    bounds: tuple[float, float, float, float],
    z: int,
    url_template: str,
    decode_mode: str = "rgb",
) -> tuple[np.ndarray, float, float, int, int]:
    """Return mosaic array, origin_x, origin_y (pixel offset), width, height."""
    min_lon, min_lat, max_lon, max_lat = bounds
    x0 = int(math.floor(lon_to_tile_x(min_lon, z)))
    x1 = int(math.floor(lon_to_tile_x(max_lon, z)))
    y0 = int(math.floor(lat_to_tile_y(max_lat, z)))
    y1 = int(math.floor(lat_to_tile_y(min_lat, z)))

    tiles_x = x1 - x0 + 1
    tiles_y = y1 - y0 + 1
    mosaic_w = tiles_x * TILE_SIZE
    mosaic_h = tiles_y * TILE_SIZE

    if decode_mode == "rgb":
        mosaic = np.zeros((mosaic_h, mosaic_w, 3), dtype=np.uint8)
    else:
        mosaic = np.zeros((mosaic_h, mosaic_w), dtype=np.float32)

    jobs = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    print(f"  tiles {len(jobs)} at z={z} ({tiles_x}x{tiles_y})")

    def worker(tile_xy):
        tx, ty = tile_xy
        img = fetch_tile(url_template, z, tx, ty)
        return tx, ty, img

    done = 0
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(worker, j) for j in jobs]
        for fut in as_completed(futures):
            tx, ty, img = fut.result()
            done += 1
            if done % 50 == 0 or done == len(jobs):
                print(f"    {done}/{len(jobs)}")
            if img is None:
                continue
            ox = (tx - x0) * TILE_SIZE
            oy = (ty - y0) * TILE_SIZE
            if decode_mode == "rgb":
                mosaic[oy : oy + TILE_SIZE, ox : ox + TILE_SIZE] = np.array(img.convert("RGB"))
            else:
                arr = np.array(img)
                r, g, b = arr[..., 0].astype(np.float32), arr[..., 1].astype(np.float32), arr[..., 2].astype(np.float32)
                height = (r * 256.0 + g + b / 256.0) - 32768.0
                mosaic[oy : oy + TILE_SIZE, ox : ox + TILE_SIZE] = height

    origin_x = x0 * TILE_SIZE
    origin_y = y0 * TILE_SIZE
    return mosaic, float(origin_x), float(origin_y), mosaic_w, mosaic_h


def sample_rgb(mosaic, origin_x, origin_y, z, lon, lat) -> np.ndarray:
    px = lon_to_tile_x(lon, z) * TILE_SIZE - origin_x
    py = lat_to_tile_y(lat, z) * TILE_SIZE - origin_y
    if px < 0 or py < 0 or px >= mosaic.shape[1] - 1 or py >= mosaic.shape[0] - 1:
        return np.array([20, 24, 32], dtype=np.uint8)
    x0, y0 = int(px), int(py)
    fx, fy = px - x0, py - y0
    c00 = mosaic[y0, x0].astype(np.float32)
    c10 = mosaic[y0, x0 + 1].astype(np.float32)
    c01 = mosaic[y0 + 1, x0].astype(np.float32)
    c11 = mosaic[y0 + 1, x0 + 1].astype(np.float32)
    c0 = c00 * (1 - fx) + c10 * fx
    c1 = c01 * (1 - fx) + c11 * fx
    return np.clip(c0 * (1 - fy) + c1 * fy, 0, 255).astype(np.uint8)


def sample_height(mosaic, origin_x, origin_y, z, lon, lat) -> float:
    px = lon_to_tile_x(lon, z) * TILE_SIZE - origin_x
    py = lat_to_tile_y(lat, z) * TILE_SIZE - origin_y
    if px < 0 or py < 0 or px >= mosaic.shape[1] - 1 or py >= mosaic.shape[0] - 1:
        return 0.0
    x0, y0 = int(px), int(py)
    fx, fy = px - x0, py - y0
    h00 = mosaic[y0, x0]
    h10 = mosaic[y0, x0 + 1]
    h01 = mosaic[y0 + 1, x0]
    h11 = mosaic[y0 + 1, x0 + 1]
    h0 = h00 * (1 - fx) + h10 * fx
    h1 = h01 * (1 - fx) + h11 * fx
    return float(h0 * (1 - fy) + h1 * fy)


def geom_y_to_row(py_top: int, bbox: dict) -> float:
    """Map image row (0=top) to geometry y for UV alignment (Three.js flipY)."""
    v = 1.0 - py_top / HEIGHT
    return bbox["min_y"] + v * bbox["h"]


def row_to_lonlat(px: int, py: int, bbox: dict) -> tuple[float, float]:
    u = px / (WIDTH - 1)
    gy = geom_y_to_row(py, bbox)
    gx = bbox["min_x"] + u * bbox["w"]
    my = -gy
    lon0, lat0 = CENTER
    lon = math.degrees(gx / SCALE + math.radians(lon0))
    lat0_r = math.radians(lat0)
    lat_r = 2 * math.atan(math.exp(my / SCALE + math.log(math.tan(math.pi / 4 + lat0_r / 2)))) - math.pi / 2
    lat = math.degrees(lat_r)
    return lon, lat


def lonlat_grid(bbox: dict) -> tuple[np.ndarray, np.ndarray]:
    px = np.arange(WIDTH, dtype=np.float64)
    py = np.arange(HEIGHT, dtype=np.float64)
    u = px / (WIDTH - 1)
    v = 1.0 - py / HEIGHT
    uu, vv = np.meshgrid(u, v)
    gx = bbox["min_x"] + uu * bbox["w"]
    gy = bbox["min_y"] + vv * bbox["h"]
    # gy = geometry y = -d3_mercator_y
    my_d3 = -gy
    lon0, lat0 = CENTER
    lon = np.degrees(gx / SCALE + math.radians(lon0))
    lat0_r = math.radians(lat0)
    lat = np.degrees(
        2
        * np.arctan(np.exp(-my_d3 / SCALE + math.log(math.tan(math.pi / 4 + lat0_r / 2))))
        - math.pi / 2
    )
    return lon, lat


def sample_field(mosaic, origin_x, origin_y, z, lon, lat, fallback: float) -> np.ndarray:
    px = lon_to_tile_x(lon, z) * TILE_SIZE - origin_x
    py = lat_to_tile_y(lat, z) * TILE_SIZE - origin_y
    h, w = mosaic.shape[:2]
    valid = (px >= 0) & (py >= 0) & (px < w - 1) & (py < h - 1)
    x0 = np.floor(px).astype(np.int32)
    y0 = np.floor(py).astype(np.int32)
    fx = (px - x0).astype(np.float32)
    fy = (py - y0).astype(np.float32)

    if mosaic.ndim == 3:
        out = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
        for c in range(3):
            c00 = mosaic[y0, x0, c]
            c10 = mosaic[y0, x0 + 1, c]
            c01 = mosaic[y0 + 1, x0, c]
            c11 = mosaic[y0 + 1, x0 + 1, c]
            c0 = c00 * (1 - fx) + c10 * fx
            c1 = c01 * (1 - fx) + c11 * fx
            out[..., c] = c0 * (1 - fy) + c1 * fy
        out[~valid] = fallback
        return np.clip(out, 0, 255).astype(np.uint8)

    h00 = mosaic[y0, x0]
    h10 = mosaic[y0, x0 + 1]
    h01 = mosaic[y0 + 1, x0]
    h11 = mosaic[y0 + 1, x0 + 1]
    h0 = h00 * (1 - fx) + h10 * fx
    h1 = h01 * (1 - fx) + h11 * fx
    out = (h0 * (1 - fy) + h1 * fy).astype(np.float32)
    out[~valid] = fallback
    return out


def generate_color_texture(mosaic, origin_x, origin_y, z, bbox) -> np.ndarray:
    lon, lat = lonlat_grid(bbox)
    return sample_field(mosaic, origin_x, origin_y, z, lon, lat, fallback=24.0)


def generate_height_field(mosaic, origin_x, origin_y, z, bbox) -> np.ndarray:
    lon, lat = lonlat_grid(bbox)
    return sample_field(mosaic, origin_x, origin_y, z, lon, lat, fallback=0.0)


def height_to_displacement(height: np.ndarray) -> np.ndarray:
    h = height.copy()
    valid = h[h != 0]
    if valid.size:
        lo, hi = np.percentile(valid, [2, 98])
        h = np.clip(h, lo, hi)
    else:
        lo, hi = h.min(), h.max()
    if hi - lo < 1:
        hi = lo + 1
    norm = (h - lo) / (hi - lo)
    gray = (norm * 255).astype(np.uint8)
    return np.stack([gray, gray, gray, np.full_like(gray, 255)], axis=-1)


def height_to_normal(height: np.ndarray, strength: float = 3.0) -> np.ndarray:
    h = height.astype(np.float32)
    # pad for borders
    hp = np.pad(h, 1, mode="edge")
    dx = (hp[1:-1, 2:] - hp[1:-1, :-2]) * strength
    dy = (hp[2:, 1:-1] - hp[:-2, 1:-1]) * strength
    nz = np.ones_like(dx) * 2.0
    length = np.sqrt(dx * dx + dy * dy + nz * nz)
    nx = (-dx / length * 0.5 + 0.5) * 255
    ny = (-dy / length * 0.5 + 0.5) * 255
    nz_c = (nz / length * 0.5 + 0.5) * 255
    normal = np.stack([nx, ny, nz_c], axis=-1).astype(np.uint8)
    alpha = np.full((HEIGHT, WIDTH, 1), 255, dtype=np.uint8)
    return np.concatenate([normal, alpha], axis=-1)


def backup_textures():
    BACKUP.mkdir(parents=True, exist_ok=True)
    for name in (
        "sc_map.png",
        "sc_normal_map.png",
        "sc_displacement_map.png",
        "sc_normal_map1.png",
    ):
        src = ASSETS / name
        if src.exists():
            shutil.copy2(src, BACKUP / name)
    print(f"Backed up originals to {BACKUP}")


def main():
    sc = json.loads((ASSETS / "sc.json").read_text())
    bbox = compute_bbox(sc)
    bounds = lonlat_bounds(sc)
    print("Bbox (projected):", bbox)
    print("Lon/lat bounds:", bounds)

    backup_textures()

    print("\n[1/4] Download satellite imagery...")
    rgb_mosaic, ox, oy, mw, mh = build_mosaic(bounds, ZOOM, IMAGERY_URL, "rgb")

    print("\n[2/4] Render sc_map.png...")
    color = generate_color_texture(rgb_mosaic, ox, oy, ZOOM, bbox)
    Image.fromarray(color).save(ASSETS / "sc_map.png", optimize=True)
    print(f"  saved sc_map.png {color.shape}")

    print("\n[3/4] Download elevation (Terrarium)...")
    elev_mosaic, eox, eoy, _, _ = build_mosaic(bounds, ZOOM, TERRARIUM_URL, "height")

    print("\n[4/4] Render displacement + normal maps...")
    height = generate_height_field(elev_mosaic, eox, eoy, ZOOM, bbox)
    disp = height_to_displacement(height)
    normal = height_to_normal(height, strength=4.0)
    Image.fromarray(disp, mode="RGBA").save(ASSETS / "sc_displacement_map.png", optimize=True)
    Image.fromarray(normal, mode="RGBA").save(ASSETS / "sc_normal_map.png", optimize=True)
    Image.fromarray(normal, mode="RGBA").save(ASSETS / "sc_normal_map1.png", optimize=True)
    print("  saved displacement + normal maps")

    print("\nDone. Restart dev server and hard-refresh browser to see textures.")


if __name__ == "__main__":
    main()
