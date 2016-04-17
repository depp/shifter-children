# Copyright 2016 Dietrich Epp.
#
# This file is part of Kitten Teleporter.  The Kitten Teleporter source
# code is distributed under the terms of the MIT license.
# See LICENSE.txt for details.
"""Rectangle bin packing."""
import collections

Rect = collections.namedtuple('Rect', 'x y w h')
Packing = collections.namedtuple('Packing', 'width height rects')

def _rect_key(r):
    # Widest rects, then tallest rects, then lowest index rects
    return -r[0], -r[1], r[2]

def _try_pack(size, rects, result):
    """Try to pack rectangles in the given bounds.

    size: (width, height)
    rects: array of (width, height, index)
    result: array to store result

    The (x, y) for each rect is stored in the rect's index in the
    result array.  Returns True if successful, False otherwise.
    """
    width, height = size
    node = [(0, 0)]
    for sx, sy, idx in rects:
        if not sx or not sy:
            result[idx] = Rect(0, 0, 0, 0)
            continue
        maxx = width - sx
        bestx = -1
        besty = height + 1 - sy
        first = -1
        last = -1
        for i, (x, y) in enumerate(node):
            if x + sx > width:
                break
            if y >= besty:
                continue
            for j in range(i + 1, len(node)):
                jx, jy = node[j]
                if x + sx <= jx:
                    break
                y = max(y, jy)
            else:
                j = len(node)
            if y >= besty:
                continue
            first = i
            last = j
            bestx = x
            besty = y
        if first < 0:
            return False
        result[idx] = Rect(bestx, besty, sx, sy)
        x0 = bestx
        x1 = bestx + sx
        y0 = besty
        y1 = besty + sy
        nnode = []
        if first == 0 or node[first - 1][1] != y1:
            nnode.append((x0, y1))
        if x1 < width and (last == len(node) or node[last][0] != x1):
            nnode.append((x1, y0))
        node[first:last] = nnode
    return True

def _ilog2(x):
    """Compute the ceiling of the base-2 logarithm of a number."""
    i = 0
    while x > (1 << i):
        i += 1
    return i

def pack(rects, *, min_size=(16, 16), max_size=(2048, 2048)):
    """Find a packing for the given rectangles.

    The rects should be an array of (width, height) sizes.  This will
    return a Packing object, or None if packing fails.  Each rectangle
    the resulting packing will correspond to the input rectangle with
    the same array index.
    """
    rects2 = [(x, y, i) for i, (x, y) in enumerate(rects)]
    rects2.sort(key=_rect_key)
    minw, minh = min_size
    maxw, maxh = max_size
    maxa = maxw * maxh
    minw = max(minw, max(x for x, y, i in rects2))
    minh = max(minh, max(y for x, y, i in rects2))
    mina = max(minw * minh, sum(x * y for x, y, i in rects2))
    result = [None] * len(rects2)
    for a in range(_ilog2(mina), _ilog2(maxa) * 2):
        sizes = []
        if not (a & 1):
            sizes.append(a // 2)
        for i in reversed(range(0, (a + 1) // 2)):
            sizes.append(a - i)
            sizes.append(i)
        sizes = [(1 << i, 1 << (a - i)) for i in sizes]
        for w, h in sizes:
            if minw <= w <= maxw and minh <= h <= maxh:
                if _try_pack((w, h), rects2, result):
                    return Packing(w, h, result)
    return None

if __name__ == '__main__':
    # Test for node coalescing edge cases
    def test1():
        size = 4 * 16, 8 * 16
        rects = [(4, 8, i) for i in range(256)]
        result = [None] * 256
        success = _try_pack(size, rects, result)
        assert success
        for i, r in enumerate(result):
            assert r.x == 4 * (i & 15)
            assert r.y == 8 * (i // 16)
        print('test1: success')
    test1()

    # Test using random rects
    def test2(rsz, count):
        import random
        rects = [(random.randint(1, rsz), random.randint(1, rsz))
                 for i in range(count)]
        p = pack(rects)
        assert p is not None
        rarea = sum(r.w * r.h for r in p.rects)
        parea = p.width * p.height
        print('Packed into {0.width}x{0.height} (eff: {1:0.4f})'
              .format(p, rarea / parea))
        for i, r in enumerate(p.rects):
            for j, q in enumerate(p.rects):
                if i == j:
                    continue
                if (r.x < q.x + q.w and q.x < r.x + r.w and
                    r.y < q.y + q.h and q.y < r.y + r.h):
                    print('Collision: {} {}'.format(r, q))
                    assert False
        print('test2: success')
    test2(50, 100)
    test2(50, 1000)
