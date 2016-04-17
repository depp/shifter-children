# Copyright 2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
"""Generate font files for this project."""
import os
from . import font

FULL1_CHARSET = font.ASCII_PRINT + "“”‘’–—…‹›«»×©"

if __name__ == '__main__':
    join = os.path.join
    adir = join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'assets')
    fdir = join(adir, 'fonts')
    s = font.FontSet()
    s.add(
        charset=FULL1_CHARSET,
        size=64,
        margin=4,
        path=join(fdir, 'almendra/Almendra-Regular.ttf'),
    )
    s.add(
        charset=FULL1_CHARSET,
        size=32,
        margin=2,
        path=join(fdir, 'patrickhand/PatrickHand-Regular.ttf'),
    )
    s.save(
        image_path=join(adir, 'images', 'fonts.png'),
        json_path=join(adir, 'images', 'fonts.json'),
    )
