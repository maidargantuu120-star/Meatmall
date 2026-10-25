"""Builds the delivery-app style order alert: bell jingle + energetic Mongolian brand call-out.

Setup (once, any virtualenv):  pip install edge-tts imageio-ffmpeg
usage: python build_alert.py <voice> <out.mp3> <workdir>

  python design/sounds/build_alert.py mn-MN-BataaNeural client/public/sounds/new-order-mn.mp3 build/alert
  python design/sounds/build_alert.py mn-MN-YesuiNeural design/sounds/new-order-mn-female.mp3 build/alert

Voices: mn-MN-BataaNeural (male, site default), mn-MN-YesuiNeural (female).
Edit LINES / STYLE / notes below to change the wording, tone or jingle.
"""
import asyncio
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg

VOICE, OUT, WORK = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
WORK.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Brand call-out + message, kept short like delivery-app alerts
LINES = {
    "a": "Мийт Мол! Захиалга орж ирлээ!",
}
# Bright, upbeat delivery: faster, higher, louder
STYLE = dict(rate="+15%", pitch="+20Hz", volume="+30%")


async def make_voices():
    for key, text in LINES.items():
        await edge_tts.Communicate(text, VOICE, **STYLE).save(str(WORK / f"{VOICE}-{key}.mp3"))


asyncio.run(make_voices())

# Jingle: C6 -> E6 -> G6 -> C7 bell notes (fundamental + soft octave), fast exp decay
notes = [(1046.5, 0.12), (1318.5, 0.12), (1568.0, 0.12), (2093.0, 0.5)]
filters = []
labels = []
for i, (freq, dur) in enumerate(notes):
    hold = dur * 0.35  # ring a moment before decaying, so the chime reads as loud as the voice
    filters.append(
        f"sine=f={freq}:d={dur}:sample_rate=48000,volume=0.85[f{i}];"
        f"sine=f={freq * 2}:d={dur}:sample_rate=48000,volume=0.25[o{i}];"
        f"[f{i}][o{i}]amix=inputs=2:normalize=0,"
        f"afade=t=in:st=0:d=0.005,afade=t=out:st={hold:.3f}:d={dur - hold:.3f}:curve=exp[n{i}]"
    )
    labels.append(f"[n{i}]")
jingle = ";".join(filters) + ";" + "".join(labels) + f"concat=n={len(notes)}:v=0:a=1[jingle]"

# Trim the TTS padding at both ends (reverse trick trims the tail)
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-45dB,"
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
)
graph = (
    jingle + ";"
    "anullsrc=r=48000:cl=mono:d=0.08[gap];"
    "anullsrc=r=48000:cl=mono:d=0.2[tail];"
    f"[0:a]aformat=sample_rates=48000:channel_layouts=mono,{TRIM}[va];"
    "[jingle][gap][va][tail]concat=n=4:v=0:a=1,"
    "loudnorm=I=-14:TP=-1.5:LRA=7[out]"
)

subprocess.run(
    [
        FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(WORK / f"{VOICE}-a.mp3"),
        "-filter_complex", graph, "-map", "[out]",
        "-ar", "48000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
        str(OUT),
    ],
    check=True,
)
print(f"{OUT.name}: {OUT.stat().st_size // 1024} KB")
