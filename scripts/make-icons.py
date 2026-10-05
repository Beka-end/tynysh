#!/usr/bin/env python3
"""
Рисует иконки приложения из одного места. Запуск: python3 scripts/make-icons.py

Зачем скрипт, а не картинки руками: цвет приложения меняется в globals.css,
и иконки должны меняться вместе с ним. Пока они лежали готовыми файлами,
смена палитры оставляла на телефоне иконку старого цвета.

Внешних библиотек нет нарочно — PNG собирается из zlib и struct, чтобы
скрипт работал в любом окружении без установки пакетов.
"""

import struct
import zlib

BLUE = (0x2E, 0x6F, 0xA8)   # --color-tynysh
WHITE = (0xFF, 0xFF, 0xFF)
SS = 4                       # сглаживание: рисуем крупнее и ужимаем

SIZES = {
    "public/icon-32.png": 32,
    "public/icon-192.png": 192,
    "public/icon-512.png": 512,
    "public/apple-touch-icon.png": 180,
}


def rounded_square(x, y, size, radius):
    """Точка внутри квадрата со скруглёнными углами?"""
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def letter_t(x, y, size):
    """Буква «t»: стойка, перекладина и загиб вправо внизу."""
    stem_w = size * 0.115
    stem_x0 = size * 0.42
    stem_x1 = stem_x0 + stem_w
    top = size * 0.22
    bottom = size * 0.70

    # перекладина
    if size * 0.30 <= x <= size * 0.62 and size * 0.36 <= y <= size * 0.36 + stem_w:
        return True
    # стойка
    if stem_x0 <= x <= stem_x1 and top <= y <= bottom:
        return True
    # загиб: четверть кольца вправо от низа стойки
    r_out = size * 0.145
    r_in = r_out - stem_w
    cx, cy = stem_x1, bottom - r_out
    if x >= cx and y >= cy:
        d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
        if r_in <= d <= r_out:
            return True
    return False


def render(size):
    big = size * SS
    radius = big * 0.23
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = 0
            hits = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = px * SS + sx + 0.5
                    y = py * SS + sy + 0.5
                    if not rounded_square(x, y, big, radius):
                        continue  # за пределами скруглённого квадрата — прозрачно
                    colour = WHITE if letter_t(x, y, big) else BLUE
                    r += colour[0]
                    g += colour[1]
                    b += colour[2]
                    hits += 1
            total = SS * SS
            alpha = round(255 * hits / total)
            if hits == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((round(r / hits), round(g / hits), round(b / hits), alpha))
        rows.append(bytes(row))
    return rows


def write_png(path, rows, size):
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


for path, size in SIZES.items():
    write_png(path, render(size), size)
    print("нарисовано", path, f"{size}×{size}")
