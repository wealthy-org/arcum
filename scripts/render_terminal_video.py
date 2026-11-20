#!/usr/bin/env python3
"""
Arcum Protocol — terminal session renderer
==========================================
Turns artifacts/video/session.json (produced by scripts/arcum_deploy_demo.py)
into a deterministic MP4 that looks like a macOS terminal recording.

Why a renderer instead of a screen capture: the same session script always
produces the same frames, at a fixed 1178x882, with no window-manager noise,
no notification popups, and no dependency on a visible desktop session.

Usage:
  python scripts/render_terminal_video.py                       # full render
  python scripts/render_terminal_video.py --fps 30 --out x.mp4
  python scripts/render_terminal_video.py --preview 12          # 12s stills only
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import re

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "artifacts" / "video"
SESSION = VIDEO_DIR / "session.json"

W, H = 1178, 882
TITLEBAR_H = 34
PAD_X, PAD_Y = 26, 14
FONT_SIZE = 13
LINE_H = 17

BG = (11, 13, 11)
TITLE_BG = (24, 26, 24)
TITLE_FG = (150, 152, 148)
TERM_FG = (222, 224, 218)

PALETTE = {
    0: TERM_FG,
    37: (198, 200, 194),
    90: (112, 116, 110),
    91: (255, 106, 92),
    92: (128, 240, 140),
    93: (240, 214, 118),
    94: (112, 168, 255),
    96: (110, 232, 232),
    97: (255, 255, 255),
}

SGR_RE = re.compile(r"\x1b\[([0-9;]*)m")


def pick_font(bold: bool) -> ImageFont.FreeTypeFont:
    candidates = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/courbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf"]
    )
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, FONT_SIZE)
    return ImageFont.load_default()


FONT_R = pick_font(False)
FONT_B = pick_font(True)
TITLE_FONT = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 12)
CELL_W = FONT_R.getlength("M")
COLS = int((W - 2 * PAD_X) / CELL_W)
ROWS = int((H - TITLEBAR_H - PAD_Y) / LINE_H)


def parse_runs(text: str) -> list[tuple[str, int, bool]]:
    """Split an ANSI-coded string into (text, colour, bold) runs."""
    runs: list[tuple[str, int, bool]] = []
    colour, bold = 0, False
    pos = 0
    for m in SGR_RE.finditer(text):
        if m.start() > pos:
            runs.append((text[pos : m.start()], colour, bold))
        codes = [c for c in m.group(1).split(";") if c != ""] or ["0"]
        for code in codes:
            n = int(code)
            if n == 0:
                colour, bold = 0, False
            elif n == 1:
                bold = True
            elif n == 22:
                bold = False
            elif n in PALETTE:
                colour = n
            elif 30 <= n <= 39:
                colour = n
            elif 90 <= n <= 97:
                colour = n
        pos = m.end()
    if pos < len(text):
        runs.append((text[pos:], colour, bold))
    return [r for r in runs if r[0]]


def wrap_runs(runs: list[tuple[str, int, bool]], width: int) -> list[list[tuple[str, int, bool]]]:
    lines: list[list[tuple[str, int, bool]]] = [[]]
    used = 0
    for text, colour, bold in runs:
        for ch in text:
            if used >= width:
                lines.append([])
                used = 0
            if lines[-1] and lines[-1][-1][1:] == (colour, bold):
                lines[-1][-1] = (lines[-1][-1][0] + ch, colour, bold)
            else:
                lines[-1].append((ch, colour, bold))
            used += 1
    return lines


def build_timeline(ops: list[dict], fps: int, scale: float = 1.0) -> tuple[list[tuple[float, str, object]], float]:
    events: list[tuple[float, str, object]] = []
    t = 0.0
    for op in ops:
        kind = op["op"]
        dt = float(op.get("dt", 0.0)) * scale
        if kind == "clear":
            events.append((t, "clear", None))
        elif kind == "wait":
            # explicit holds scale far less than output pace, otherwise pauses dominate
            t += (dt / scale) * min(scale, 1.6)
        elif kind == "line":
            events.append((t, "line", parse_runs(op["text"])))
            t += dt
        elif kind == "burst":
            # whole block lands in the same frame: real CLI output dump, not a teleprompter
            for raw in op["lines"]:
                events.append((t, "line", parse_runs(raw)))
            t += dt
        elif kind == "type":
            runs = parse_runs(op["text"])
            for text, colour, bold in runs:
                for ch in text:
                    events.append((t, "char", (ch, colour, bold)))
                    t += dt
            events.append((t, "eol", None))
            t += 0.08
    return events, t


def render(ops: list[dict], facts: dict, out_path: Path, fps: int, preview: float | None, scale: float = 1.0) -> None:
    events, total = build_timeline(ops, fps, scale)
    if preview:
        total = min(total, preview)
    total += 1.2  # tail hold
    frames = int(total * fps) + 1

    buffer: list[list[tuple[str, int, bool]]] = []
    current: list[tuple[str, int, bool]] = []
    ev_idx = 0

    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(fps),
        "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(out_path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    title = "arcum — deploy · arcum-deploy.sh — 147x48"

    try:
        for f in range(frames):
            now = f / fps
            while ev_idx < len(events) and events[ev_idx][0] <= now:
                _, kind, payload = events[ev_idx]
                if kind == "clear":
                    buffer.clear()
                    current = []
                elif kind == "line":
                    buffer.extend(wrap_runs(payload, COLS))
                elif kind == "char":
                    ch, colour, bold = payload
                    if current and current[-1][1:] == (colour, bold):
                        current[-1] = (current[-1][0] + ch, colour, bold)
                    else:
                        current.append((ch, colour, bold))
                elif kind == "eol":
                    buffer.append(current)
                    current = []
                ev_idx += 1

            img = Image.new("RGB", (W, H), BG)
            d = ImageDraw.Draw(img)

            # window chrome
            d.rectangle([0, 0, W, TITLEBAR_H], fill=TITLE_BG)
            for i, col in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
                cx = 18 + i * 20
                d.ellipse([cx - 6, TITLEBAR_H // 2 - 6, cx + 6, TITLEBAR_H // 2 + 6], fill=col)
            d.text((W // 2 - TITLE_FONT.getlength(title) / 2, 9), title, font=TITLE_FONT, fill=TITLE_FG)
            blink = (int(now * 1.6) % 2) == 0
            if blink:
                d.ellipse([W - 30, TITLEBAR_H // 2 - 5, W - 20, TITLEBAR_H // 2 + 5], fill=(220, 60, 60))
                d.text((W - 96, 9), "rec", font=TITLE_FONT, fill=(210, 90, 90))
            d.line([0, TITLEBAR_H, W, TITLEBAR_H], fill=(46, 50, 46))

            visible = (buffer + ([current] if current else []))[-ROWS:]
            y = TITLEBAR_H + PAD_Y
            for ln in visible:
                x = PAD_X
                for text, colour, bold in ln:
                    font = FONT_B if bold else FONT_R
                    d.text((x, y), text, font=font, fill=PALETTE.get(colour, TERM_FG))
                    x += len(text) * CELL_W
                y += LINE_H

            # cursor
            if current:
                cx = PAD_X + len("".join(r[0] for r in current)) * CELL_W
                cy = TITLEBAR_H + PAD_Y + (len(visible) - 1) * LINE_H
                if blink:
                    d.rectangle([cx, cy + 1, cx + CELL_W, cy + LINE_H - 2], fill=(150, 240, 160))

            proc.stdin.write(img.tobytes())
            if f % 200 == 0:
                print(f"  frame {f}/{frames} ({now:0.1f}s)", flush=True)
    finally:
        proc.stdin.close()
        proc.wait()

    print(f"video written: {out_path} ({total:0.1f}s @ {fps}fps)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--out", default=str(VIDEO_DIR / "arcum-deploy-demo.mp4"))
    ap.add_argument("--preview", type=float, default=None, help="render only first N seconds")
    ap.add_argument("--scale", type=float, default=3.2, help="pacing multiplier (1.0 = raw script timing)")
    args = ap.parse_args()

    if not SESSION.exists():
        print(f"missing session: {SESSION}\nrun scripts/arcum_deploy_demo.py first")
        return 1

    data = json.loads(SESSION.read_text(encoding="utf-8"))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    render(data["ops"], data.get("facts", {}), out, args.fps, args.preview, args.scale)
    return 0


if __name__ == "__main__":
    sys.exit(main())