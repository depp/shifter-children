# Copyright 2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
"""Bitmap font generator.

This will generate a bitmap font from input font files.  This uses the
Python FreeType module (freetype-py).  Rather than using config files,
this should be called directly from Python code.
"""
import collections
import freetype
import json
import numpy
import PIL.Image
from . import rectpack

ASCII_PRINT = ''.join(chr(x) for x in range(32, 127))

class AlphaStyle(object):
    """Base style type."""
    def _init_face(self, face, size):
        face.set_char_size(round(size * 64))
    def _get_glyph(self, face, c, idx):
        gidx = face.get_char_index(c)
        face.load_glyph(gidx)
        bitmap = face.glyph.bitmap
        arr = (numpy.array(bitmap.buffer, dtype=numpy.uint8)
               .reshape(bitmap.rows, bitmap.width))
        return _Glyph(
            c,
            int((face.glyph.advance.x + 64 / 2) / 64),
            face.glyph.bitmap_left,
            face.glyph.bitmap_top,
            arr,
            idx,
            gidx)

_Glyph = collections.namedtuple('_Glyph', 'chr advance bx by arr idx gidx')
_Font = collections.namedtuple('_Font', 'glyphs margin info')

class FontSet(object):
    """A set of fonts to render to a bitmap."""
    __slots__ = ['_depth', '_fonts', '_rects']

    def __init__(self, *, depth=8):
        self._depth = depth
        self._fonts = []
        self._rects = []

    def add(self, *, name=None, size, path,
            margin=1, charset=ASCII_PRINT, style=AlphaStyle()):
        """Add an alpha mask font to the font set.

        size: Font size, in pixels (floats are okay)
        path: Path to the font file
        margin: Margin on all sides of each glyph
        charset: Set of characters to include
        style: Style for bitmap rendering
        """
        charset = sorted(set(charset))
        if not all(isinstance(c, str) and len(c) == 1 for c in charset):
            raise TypeError('invalid character set')
        face = freetype.Face(path)
        style._init_face(face, size)
        info = {}
        if name is None:
            info['name'] = face.family_name.decode('ASCII')
        else:
            info['name'] = name
        info['bold'] = bool(face.style_flags & freetype.FT_STYLE_FLAG_BOLD)
        info['italic'] = bool(face.style_flags & freetype.FT_STYLE_FLAG_ITALIC)
        info['size'] = size
        m = face.size
        info['ascender'] = (m.ascender + 32) >> 6
        info['descender'] = (m.descender + 32) >> 6
        info['height'] = (m.height + 32) >> 6
        glyphs = []
        for i, c in enumerate(charset, len(self._rects)):
            g = style._get_glyph(face, c, i)
            glyphs.append(g)
            self._rects.append((
                g.arr.shape[1] + margin * 2,
                g.arr.shape[0] + margin * 2,
            ))
        kern = []
        for nx, gx in enumerate(glyphs):
            gkern = []
            for ny, gy in enumerate(glyphs):
                kx = face.get_kerning(gx.chr, gy.chr,
                                      freetype.FT_KERNING_DEFAULT).x >> 6
                if not kx:
                    continue
                gkern.append('{},{}'.format(ny, kx))
            if gkern:
                kern.append('{},{}'.format(nx, ','.join(gkern)))
        if kern:
            info['kern'] = ':'.join(kern)
        self._fonts.append(_Font(glyphs, margin, info))

    def save(self, *, image_path, json_path):
        """Save the font set to the given image and json files."""
        pack = rectpack.pack(self._rects)
        if not pack:
            raise Exception('font packing failed')
        data = []
        a = numpy.zeros((pack.height, pack.width), dtype=numpy.uint8)
        for font in self._fonts:
            gdata = []
            for g in font.glyphs:
                r = pack.rects[g.idx]
                x = r.x + font.margin
                y = r.y + font.margin
                a[y:y+g.arr.shape[0],x:x+g.arr.shape[1]] = g.arr
                gdata.extend([
                    # Advance
                    g.advance,
                    # Size x, y
                    g.arr.shape[1], g.arr.shape[0],
                    # Pen offset x, y
                    g.bx, g.by,
                    # Texture location x, y
                    x, y,
                ])
            fdata = dict(font.info)
            fdata.update(
                char=''.join(g.chr for g in font.glyphs),
                glyph=','.join(str(n) for n in gdata),
            )
            data.append(fdata)
        print('Fonts: {}'.format(len(self._fonts)))
        print('Glyphs: {}'.format(len(self._rects)))
        print('Writing data to {}'.format(json_path))
        with open(json_path, 'w') as fp:
            json.dump(data, fp, indent=2, sort_keys=True)
        print('Writing image to {}'.format(image_path))
        img = PIL.Image.fromarray(a)
        img.save(image_path)
