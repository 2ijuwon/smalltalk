"""Generate bundled speech with Piper and estimated word cues for continuous speech."""
import json
import math
import struct
import os
import re
import wave
from pathlib import Path

from piper import PiperVoice

root = Path(__file__).resolve().parents[1]
src = root / "src"
out = src / "audio"
out.mkdir(exist_ok=True)
voice_dir = Path(os.environ["TEMP"]) / "smalltalk-voice"
voice = PiperVoice.load(voice_dir / "en_US-ljspeech-medium.onnx")
words = re.findall(r"entry\('([^']+)'", (src / "data.js").read_text(encoding="utf-8"))
app = (src / "app.js").read_text(encoding="utf-8")
talk = app.split("const smallTalks = {")[1].split("\n};")[0]
dialogue = (src / "slime-dialogue.js").read_text(encoding="utf-8-sig").split("const intents")[0]
phrases = re.findall(r"\['([^']+)',", talk + dialogue)
manifest = {}

def save(text):
    name = f"{len(manifest)}.wav"
    chunks = list(voice.synthesize(text))
    duration = sum(len(chunk.audio_int16_bytes) / (2 * chunk.sample_rate) for chunk in chunks)
    with wave.open(str(out / name), "wb") as wav:
        wav.setparams((1, 2, voice.config.sample_rate, 0, "NONE", "not compressed"))
        for chunk in chunks:
            wav.writeframesraw(chunk.audio_int16_bytes)
    manifest[text] = [name, [0]]
    return duration

for phrase in dict.fromkeys(phrases):
    duration = save(phrase)
    if phrase in talk:
        weights = [
            max(1, sum(len(phonemes) for phonemes in voice.phonemize(word)))
            for word in phrase.split()
        ]
        manifest[phrase][1] = [
            round(duration * sum(weights[:i]) / sum(weights), 4)
            for i in range(len(weights))
        ]

tokens = {word.lower() for phrase in phrases for word in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", phrase)}
for word in sorted(set(words) | tokens):
    save(word)

(src / "speech-clips.js").write_text(
    "export const speechClips = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8",
)
print(f"Generated {len(manifest)} speech files")

# Short PCM effects play through the same media path as pronunciation.
effects = {
    "surface": (320,), "tap": (560,), "word": (740,), "place": (620,),
    "correct": (660, 880), "retry": (330, 262), "hit": (210, 140),
    "finish": (523, 659, 784),
}
rate = 22050
for name, notes in effects.items():
    frames = bytearray()
    for frequency in notes:
        length = int(rate * (0.065 if len(notes) == 1 else 0.085))
        for sample in range(length):
            phase = sample * frequency / rate
            triangle = 4 * abs(phase - math.floor(phase + .5)) - 1
            envelope = min(1, sample / 125) * (1 - sample / length) ** 2
            peak = .26 if name == "surface" else .43
            frames.extend(struct.pack("<h", int(32767 * peak * triangle * envelope)))
    with wave.open(str(out / f"fx-{name}.wav"), "wb") as wav:
        wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        wav.writeframes(frames)
