#!/usr/bin/env python3
"""Prepare the extracted Win16 artwork for the Phaser remake (requires Pillow)."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
from PIL import Image

ICONS = {
    'portrait-player': 37, 'portrait-enemy-1': 38, 'portrait-enemy-2': 39, 'portrait-enemy-3': 40,
    'icon-laser': 6, 'icon-torpedo': 5, 'icon-mine': 7, 'icon-hot-torpedo': 8,
    'icon-nuclear': 9, 'icon-bio': 10, 'icon-mine2': 17, 'icon-populate': 26,
    'icon-invest': 24, 'icon-buy': 18, 'shield': 20, 'icon-cloak': 32,
    'icon-sun': 22, 'icon-warp': 33, 'icon-anti-bio': 23, 'cargo': 62,
    'energy': 56, 'charge': 57, 'people': 26, 'planet': 23, 'money': 24,
    'farming': 65, 'education': 29, 'industry': 64, 'mining': 16, 'spaceport': 63,
}
# Resource IDs describe source artwork, not planet classes in the 1994 game.
PLANETS = {'barren': 18, 'continental': 14, 'desert': 20, 'forest': 22,
           'gaia': 24, 'gasgiant': 27, 'ice': 17, 'jungle': 25,
           'ocean': 15, 'tundra': 26, 'volcanic': 19}


def prepare(source, output):
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'source_installer_sha256': json.loads((source / 'manifest.json').read_text())['installer_sha256'], 'files': {}}

    def save(name, image, origin, conversion):
        image.save(output / name)
        manifest['files'][name] = {'source': origin, 'conversion': conversion,
                                   'sha256': hashlib.sha256((source / origin).read_bytes()).hexdigest()}

    def icon(rid):
        return Image.open(source / f'icons/icon-{rid:03d}.png').convert('RGBA')

    def fit(image, size):
        image = image.crop(image.getbbox())
        scale = min(size[0] / image.width, size[1] / image.height)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
        result = Image.new('RGBA', size)
        result.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
        return result

    for name, rid in ICONS.items():
        save(name + '.png', icon(rid), f'icons/icon-{rid:03d}.png', 'Original RGBA icon preview; no resizing')
    for name, rid, size in [('ship', 53, (50, 43)), ('ship2', 54, (50, 43)),
                            ('ship3', 55, (50, 43)), ('ship4', 48, (50, 43)),
                            ('torpedo', 5, (25, 25)), ('hot-torpedo', 8, (27, 25)),
                            ('mine', 7, (66, 68)), ('nuke', 9, (20, 20))]:
        save(name + '.png', fit(icon(rid), size), f'icons/icon-{rid:03d}.png', 'Crop transparent padding and fit with nearest-neighbor scaling')
    shutil.copyfile(source / 'cursors/cursor-001.cur', output / 'cursor.cur')
    manifest['files']['cursor.cur'] = {'source': 'cursors/cursor-001.cur', 'conversion': 'Byte-for-byte copy'}

    # Project the original square texture onto a small rotating globe. Keep the
    # source palette; these are new animation frames, not recovered original ones.
    for name, rid in PLANETS.items():
        origin = f'bitmaps/bitmap-{rid:03d}.png'
        texture = Image.open(source / origin).convert('RGBA')
        sheet = Image.new('RGBA', (72 * 19, 69))
        for frame in range(19):
            globe = Image.new('RGBA', (32, 32))
            for y in range(32):
                for x in range(32):
                    nx, ny = (x - 15.5) / 15.5, (y - 15.5) / 15.5
                    radius = nx * nx + ny * ny
                    if radius > 1:
                        continue
                    nz = math.sqrt(1 - radius)
                    u = (math.atan2(nx, nz) / (2 * math.pi) + frame / 19) % 1
                    v = math.asin(ny) / math.pi + 0.5
                    globe.putpixel((x, y), texture.getpixel((int(u * texture.width) % texture.width, min(texture.height - 1, int(v * texture.height)))))
            globe = globe.resize((64, 64), Image.Resampling.NEAREST)
            sheet.alpha_composite(globe, (frame * 72 + 4, 2))
            if frame == 0:
                save(f'planet-{name}.png', globe, origin, 'First frame of globe projection, original palette')
        save(f'planet-{name}-sprite.png', sheet, origin, '19 globe-projection frames in 72x69 cells, nearest-neighbor scaling')

    explosion = icon(19)
    for name, count, width, height in [('explosion', 19, 64, 64), ('explosion1', 65, 64, 64),
                                      ('explosion2', 65, 64, 64), ('explosion3', 65, 64, 64),
                                      ('explosion4', 65, 64, 64), ('nuclear-explosion', 16, 126, 124)]:
        sheet = Image.new('RGBA', (width * count, height))
        for frame in range(count):
            t = frame / (count - 1)
            size = max(2, round(min(width, height) * (0.2 + 0.8 * t)))
            burst = fit(explosion, (size, size))
            burst.putalpha(burst.getchannel('A').point(lambda a: round(a * (1 - t))))
            sheet.alpha_composite(burst, (frame * width + (width - size) // 2, (height - size) // 2))
        save(name + '-sprite.png', sheet, 'icons/icon-019.png', f'{count} expanding/fading frames adapted from the explosion icon')
    (output / 'sounds').mkdir(exist_ok=True)
    for sound in sorted((source / 'sounds').glob('*.wav')):
        shutil.copyfile(sound, output / 'sounds' / sound.name)
        manifest['files']['sounds/' + sound.name] = {'source': 'sounds/' + sound.name, 'conversion': 'Byte-for-byte PCM WAV copy'}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Prepared {len(manifest["files"])} files in {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('original-assets'))
    parser.add_argument('--output', type=Path, default=Path('app/static/assets/original'))
    args = parser.parse_args()
    prepare(args.source, args.output)
