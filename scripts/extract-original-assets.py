#!/usr/bin/env python3
"""Extract Warpath's Win16 resources without executing the installer.

Requires Pillow for lossless PNG previews and the contact sheet.
See https://learn.microsoft.com/en-us/windows/win32/menurc/resource-file-formats
and https://devblogs.microsoft.com/oldnewthing/20091211-00/?p=15693.
"""
import argparse
import hashlib
import html
import io
import json
import math
from pathlib import Path
import struct
import wave
import zipfile

from PIL import Image, ImageDraw


def u16(data, offset):
    return struct.unpack_from('<H', data, offset)[0]


def ne_resources(data):
    if data[:2] != b'MZ':
        raise ValueError('Expected a DOS executable header')
    ne = struct.unpack_from('<I', data, 0x3c)[0]
    if data[ne:ne + 2] != b'NE':
        raise ValueError('Expected a Windows 16-bit NE executable')
    table = ne + u16(data, ne + 0x24)
    shift = u16(data, table)
    pos = table + 2
    end = ne + u16(data, ne + 0x26)

    def identifier(value):
        if value & 0x8000:
            return value & 0x7fff
        start = table + value
        length = data[start]
        return data[start + 1:start + 1 + length].decode('cp1252')

    while pos + 2 <= end:
        kind = u16(data, pos)
        if not kind:
            return
        count = u16(data, pos + 2)
        pos += 8
        for _ in range(count):
            if pos + 12 > end:
                raise ValueError('Truncated resource table')
            offset, size, flags, rid, _, _ = struct.unpack_from('<6H', data, pos)
            pos += 12
            offset <<= shift
            size <<= shift
            if offset + size > len(data):
                raise ValueError('Resource extends beyond executable')
            yield identifier(kind), identifier(rid), offset, flags, data[offset:offset + size]
    raise ValueError('Resource table has no terminator')


def dib_details(data, icon=False):
    header, width, height, planes, bits, compression = struct.unpack_from('<IiiHHI', data)
    if header != 40 or compression != 0 or width <= 0 or height <= 0:
        raise ValueError('Expected an uncompressed bottom-up BITMAPINFOHEADER')
    colors = struct.unpack_from('<I', data, 32)[0] or (1 << bits if bits <= 8 else 0)
    pixel_offset = header + colors * 4
    actual_height = height // 2 if icon else height
    pixel_size = ((width * bits + 31) // 32) * 4 * actual_height
    if icon:
        pixel_size += ((width + 31) // 32) * 4 * actual_height
    size = pixel_offset + pixel_size
    if size > len(data):
        raise ValueError('Truncated bitmap pixels')
    return width, actual_height, planes, bits, colors, pixel_offset, size


def extract(installer, output):
    # Refuse to overwrite a previous extraction or an unrelated directory.
    output.mkdir(parents=True, exist_ok=False)
    images, sounds, resources = [], [], []

    def write(relative, data):
        path = output / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    with zipfile.ZipFile(installer) as archive:
        archive_entries = []
        for entry in archive.infolist():
            archive_entries.append({'name': entry.filename, 'bytes': entry.file_size})
            if entry.is_dir():
                continue
            # Flatten just the selected files; never trust an archive path on disk.
            name = Path(entry.filename).name
            if entry.filename.upper().startswith('WAVE/') and name.lower().endswith('.wav'):
                data = archive.read(entry)
                relative = 'sounds/' + name.lower()
                write(relative, data)
                with wave.open(io.BytesIO(data)) as audio:
                    sounds.append({'file': relative, 'frames': audio.getnframes(),
                                   'sample_rate': audio.getframerate(),
                                   'channels': audio.getnchannels(),
                                   'bits': audio.getsampwidth() * 8,
                                   'seconds': audio.getnframes() / audio.getframerate(),
                                   'sha256': hashlib.sha256(data).hexdigest()})
            elif entry.filename.upper() in ('README.TXT', 'SETUP.INF', 'EXEC/WARPATH.EXE', 'EXEC/WARPATH.HLP'):
                write('source/' + name, archive.read(entry))
        executable = archive.read('EXEC/WARPATH.EXE')

    for index, (kind, rid, offset, flags, data) in enumerate(ne_resources(executable)):
        # The index keeps repeated IDs distinct; all original resource bytes survive.
        raw = f'raw/{index:03d}-type-{kind}-id-{rid}.bin'
        write(raw, data)
        record = {'type': kind, 'id': rid, 'offset': offset, 'bytes': len(data),
                  'flags': flags, 'raw': raw, 'sha256': hashlib.sha256(data).hexdigest()}
        resources.append(record)
        if kind not in (1, 2, 3):
            continue
        dib = data[4:] if kind == 1 else data
        width, height, planes, bits, colors, pixel_offset, size = dib_details(dib, kind != 2)
        dib = dib[:size]
        if kind == 2:
            relative = f'bitmaps/bitmap-{rid:03d}.bmp'
            payload = struct.pack('<2sIHHI', b'BM', 14 + size, 0, 0, 14 + pixel_offset) + dib
        else:
            relative = f'{"cursors/cursor" if kind == 1 else "icons/icon"}-{rid:03d}.{"cur" if kind == 1 else "ico"}'
            a, b = struct.unpack_from('<HH', data) if kind == 1 else (planes, bits)
            payload = struct.pack('<HHH', 0, 2 if kind == 1 else 1, 1)
            payload += struct.pack('<BBBBHHII', width % 256, height % 256,
                                   colors if colors < 256 else 0, 0, a, b, size, 22) + dib
        path = write(relative, payload)
        preview = str(Path(relative).with_suffix('.png'))
        # Pillow's CUR reader does not apply the transparency mask. Decode its
        # identical pixel payload through an ICO header for the PNG preview.
        if kind == 1:
            ico = struct.pack('<HHH', 0, 1, 1)
            ico += struct.pack('<BBBBHHII', width % 256, height % 256,
                               colors if colors < 256 else 0, 0, planes, bits, size, 22) + dib
            source = io.BytesIO(ico)
        else:
            source = path
        with Image.open(source) as image:
            image.convert('RGBA').save(output / preview)
        record.update({'file': relative, 'preview': preview, 'width': width, 'height': height})
        images.append(record)

    manifest = {'installer': installer.name, 'installer_sha256': hashlib.sha256(installer.read_bytes()).hexdigest(),
                'executable_sha256': hashlib.sha256(executable).hexdigest(),
                'archive_entries': archive_entries, 'resources': resources, 'sounds': sounds}
    write('manifest.json', (json.dumps(manifest, indent=2) + '\n').encode())
    columns, cell_width, cell_height = 8, 180, 150
    sheet = Image.new('RGB', (columns * cell_width, math.ceil(len(images) / columns) * cell_height), '#d5d5d5')
    draw = ImageDraw.Draw(sheet)
    for index, item in enumerate(images):
        x, y = index % columns * cell_width, index // columns * cell_height
        with Image.open(output / item['preview']) as image:
            scale = max(1, min(3, (cell_width - 12) // image.width, (cell_height - 35) // image.height))
            image = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
            sheet.paste(image, (x + (cell_width - image.width) // 2, y + 8), image)
        draw.text((x + 8, y + cell_height - 24), Path(item['file']).stem, fill='black')
    sheet.save(output / 'contact-sheet.png')
    cards = ''.join(f'<figure><a href="{i["file"]}"><img src="{i["preview"]}" alt="{html.escape(Path(i["file"]).stem)}"></a><figcaption>{Path(i["file"]).stem}<br>{i["width"]} × {i["height"]}</figcaption></figure>' for i in images)
    players = ''.join(f'<figure><figcaption>{Path(s["file"]).name} · {s["seconds"]:.2f}s</figcaption><audio controls preload="none" src="{s["file"]}"></audio></figure>' for s in sounds)
    page = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Original Warpath assets</title>
<style>body{{font:16px system-ui;background:#202328;color:#eee;margin:32px}}h1,h2{{font-weight:600}}.grid{{display:flex;flex-wrap:wrap;gap:12px}}figure{{margin:0;padding:12px;background:#34383f;border-radius:6px}}.images figure{{width:160px;text-align:center}}img{{image-rendering:pixelated;object-fit:contain;width:150px;height:112px;background:#aaa}}figcaption{{margin-top:8px}}a{{color:#b4d4ff}}audio{{width:280px;margin-top:8px}}</style>
<h1>Original Warpath assets</h1><p>Extracted from {html.escape(installer.name)} without running the installer. Original filenames and resource IDs are preserved.</p>
<p>{len(images)} images · {len(sounds)} sounds. <a href="contact-sheet.png">Contact sheet</a> · <a href="manifest.json">Extraction manifest</a> · <a href="source/README.TXT">Original readme</a></p>
<p>PNG previews preserve bitmap colors and icon transparency. Windows icons can also invert background pixels; that operation cannot be represented by PNG transparency. Original ICO/CUR files retain the masks.</p>
<h2>Images</h2><div class="grid images">{cards}</div><h2>Sounds</h2><div class="grid">{players}</div></html>'''
    write('index.html', page.encode())
    print(f'Extracted {len(images)} images, {len(sounds)} sounds, and {len(resources)} raw resources to {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('installer', type=Path, nargs='?', default=Path('wpsetup.exe'))
    parser.add_argument('--output', type=Path, default=Path('original-assets'))
    args = parser.parse_args()
    extract(args.installer, args.output)
