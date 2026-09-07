"""Remove the border-connected white video background, retaining interior whites.

Usage: python make-cat-transparent.py FFMPEG INPUT_VIDEO OUTPUT_DIRECTORY
Requires Pillow and numpy. Original media are never modified.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def remove_background(rgb):
    pixels = np.asarray(rgb).astype(np.float32)
    low = pixels.min(axis=2)
    high = pixels.max(axis=2)
    near_white = (low > 232) & ((high - low) < 24)
    # Close narrow breaks in the outline before finding exterior white. This
    # protects bright chest/neck fur that otherwise connects to the background.
    outline = Image.fromarray(np.where(near_white, 0, 255).astype(np.uint8))
    outline = outline.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13))
    connected = Image.fromarray(255 - np.asarray(outline)).copy()
    # Only remove white connected to the exterior. White paws, chest and wheel
    # details surrounded by the subject are deliberately protected.
    for point in [(0, 0), (rgb.width - 1, 0), (0, rgb.height - 1), (rgb.width - 1, rgb.height - 1)]:
        if connected.getpixel(point) == 255:
            ImageDraw.floodfill(connected, point, 128)
    background = np.asarray(connected) == 128
    # Protect the wheel silhouettes while removing the pale studio floor.
    # Their dark, neutral rims form connected components with light interiors.
    wheel_pixels = (low < 150) & ((high - low) < 30)
    wheel_pixels[:int(rgb.height * .58)] = False
    visited = np.zeros(low.shape, dtype=bool)
    protected = Image.new('L', rgb.size)
    draw = ImageDraw.Draw(protected)
    for y, x in zip(*np.where(wheel_pixels)):
        if visited[y, x]:
            continue
        points, pending = [], [(int(x), int(y))]
        visited[y, x] = True
        while pending:
            px, py = pending.pop()
            points.append((px, py))
            for nx, ny in [(px-1, py), (px+1, py), (px, py-1), (px, py+1)]:
                if 0 <= nx < rgb.width and 0 <= ny < rgb.height and wheel_pixels[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    pending.append((nx, ny))
        if len(points) < 25:
            continue
        rows = {}
        for px, py in points:
            rows.setdefault(py, []).append(px)
        for py, columns in rows.items():
            draw.line((min(columns), py, max(columns), py), fill=255)
    safe_wheels = np.asarray(protected.filter(ImageFilter.MaxFilter(3))) > 0
    floor = (np.arange(rgb.height)[:, None] > rgb.height * .77) & (low > 100) & ((high-low) < 80) & ~safe_wheels
    background |= floor
    # Discard detached remnants of the original floor and compression specks.
    remaining = Image.fromarray((~background * 255).astype(np.uint8)).copy()
    largest = np.zeros(low.shape, dtype=bool)
    while True:
        ys, xs = np.where(np.asarray(remaining) == 255)
        if not len(xs):
            break
        ImageDraw.floodfill(remaining, (int(xs[0]), int(ys[0])), 128)
        component = np.asarray(remaining) == 128
        if component.sum() > largest.sum():
            largest = component
        remaining = Image.fromarray(np.where(component, 0, np.asarray(remaining)).astype(np.uint8)).copy()
    background = ~largest
    exterior = Image.fromarray((background * 255).astype(np.uint8))
    edge = np.asarray(exterior.filter(ImageFilter.MaxFilter(5))) > 0
    alpha = np.ones(low.shape, dtype=np.float32)
    alpha[edge] = np.clip((255 - low[edge]) / 80, 0, 1)
    alpha[background] = 0
    # Remove the original white contribution in anti-aliased boundary pixels,
    # so the cat does not acquire a pale fringe on dark backgrounds.
    divisor = np.maximum(alpha[..., None], 1 / 255)
    foreground = np.clip((pixels - 255 * (1 - alpha[..., None])) / divisor, 0, 255)
    foreground[alpha == 0] = 0
    rgba = np.dstack([foreground.astype(np.uint8), np.rint(alpha * 255).astype(np.uint8)])
    assert rgba[0, 0, 3] == 0, 'Exterior background must be transparent'
    assert np.count_nonzero(rgba[:, :, 3] == 255) > 1000, 'Subject must retain opaque detail'
    return Image.fromarray(rgba)


def main():
    executable, source, destination = sys.argv[1:]
    target = Path(destination)
    target.mkdir(parents=True, exist_ok=True)
    width, height = 256, 202
    decoded = subprocess.run([
        executable, '-v', 'error', '-i', source,
        '-vf', f'scale={width}:{height}:flags=lanczos',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ], check=True, capture_output=True).stdout
    frame_size = width * height * 3
    frames = [remove_background(Image.frombytes('RGB', (width, height), decoded[offset:offset + frame_size]))
              for offset in range(0, len(decoded), frame_size)]
    # Forward/reverse makes both ends continuous without inventing new poses.
    loop = frames + frames[-2:0:-1]
    durations = [round((i + 1) * 1000 / 24) - round(i * 1000 / 24) for i in range(len(loop))]
    frames[0].save(target / 'cat-transparent-poster.webp', lossless=True)
    loop[0].save(target / 'cat-transparent.webp', save_all=True,
                 append_images=loop[1:], duration=durations, loop=0,
                 quality=86, method=4, minimize_size=False, allow_mixed=False)
    # A review board uses selected source frames over two deliberately different
    # surfaces. It is a local QA artifact, not a public portfolio image.
    board = Image.new('RGB', (width * 5, height * 2))
    for column, index in enumerate([0, len(frames) // 4, len(frames) // 2, len(frames) * 3 // 4, len(frames) - 1]):
        for row, color in enumerate(['#191919', '#e3e4df']):
            cell = Image.new('RGBA', (width, height), color)
            cell.alpha_composite(frames[index])
            board.paste(cell.convert('RGB'), (column * width, row * height))
    inspection = target.parent.parent / 'outputs'
    inspection.mkdir(exist_ok=True)
    board.save(inspection / 'cat-transparency-review.jpg', quality=92)
    with Image.open(target / 'cat-transparent.webp') as result:
        print(json.dumps({'frames': result.n_frames, 'size': result.size,
                          'mode': result.mode, 'bytes': (target / 'cat-transparent.webp').stat().st_size,
                          'duration_ms': sum(durations)}))


if __name__ == '__main__':
    main()
