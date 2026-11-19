"""Generate bundled speech with Piper and word cues from Piper phoneme durations."""
import json
import math
import struct
import os
import re
import wave
from pathlib import Path

from piper import PiperVoice
import onnx

root = Path(__file__).resolve().parents[1]
src = root / "src"
out = src / "audio"
out.mkdir(exist_ok=True)
voice_dir = Path(os.environ["TEMP"]) / "smalltalk-voice"
source_model = voice_dir / "en_US-ljspeech-medium.onnx"
aligned_model = voice_dir / "en_US-ljspeech-duration.onnx"
model = onnx.load(source_model)
# This voice computes duration frames internally but exports only waveform data.
duration = next(node.output[0] for node in model.graph.node if node.name == "/Ceil")
model.graph.output.append(onnx.helper.make_tensor_value_info(
    duration, onnx.TensorProto.FLOAT, [1, 1, None],
))
onnx.save(model, aligned_model)
voice = PiperVoice.load(aligned_model, config_path=source_model.with_suffix(".onnx.json"))
words = re.findall(r"entry\('([^']+)'", (src / "data.js").read_text(encoding="utf-8"))
examples = re.findall(r"entry\('[^']+', '[^']+', '[^']+', '([^']+)'", (src / "data.js").read_text(encoding="utf-8"))
app = (src / "app.js").read_text(encoding="utf-8")
talk = app.split("const smallTalks = {")[1].split("\n};")[0]
dialogue = (src / "slime-dialogue.js").read_text(encoding="utf-8-sig").split("const intents")[0]
phrases = re.findall(r"\['([^']+)',", talk + dialogue)
manifest = {}

def save(text, timed=False):
    name = f"{len(manifest)}.wav"
    cues = []
    elapsed = 0
    with wave.open(str(out / name), "wb") as wav:
        wav.setparams((1, 2, voice.config.sample_rate, 0, "NONE", "not compressed"))
        for chunk in voice.synthesize(text, include_alignments=timed):
            if timed:
                sample = elapsed
                start_word = True
                for alignment in chunk.phoneme_alignments[1:-1]:
                    if alignment.phoneme.isspace():
                        start_word = True
                    elif start_word:
                        cues.append(round(sample / chunk.sample_rate, 4))
                        start_word = False
                    sample += alignment.num_samples
            pcm = chunk.audio_int16_bytes
            wav.writeframesraw(pcm)
            elapsed += len(pcm) // 2
    if timed and len(cues) != len(text.split()):
        raise ValueError(f"Unexpected word alignment: {text!r}: {cues}")
    manifest[text] = [name, cues or [0]]

for phrase in dict.fromkeys(phrases + examples):
    save(phrase, timed=phrase in talk)

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
    "finish": (523, 659, 784), "over": (523, 698, 784),
    "record": (660, 880, 1046, 1319), "boss": (155, 196, 134),
    "watch": (740, 440, 260), "heal": (520, 740, 980), "bomb": (240, 160, 90),
    "loot": (550, 700, 960), "lesson": (523, 659, 784, 1046),
    "review": (440, 587, 784), "talk": (440, 587), "goodbye": (587, 440),
    "launch": (220, 880),
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
