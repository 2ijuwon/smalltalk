"""Generate bundled speech with Piper and word cues from Piper phoneme durations."""
import json
import math
import struct
import os
import re
import random
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
content = root / "content"
vocabulary = json.loads((content / "vocabulary.json").read_text(encoding="utf-8-sig"))
small_talk = json.loads((content / "small-talk.json").read_text(encoding="utf-8-sig"))
words = [item["word"] for item in vocabulary]
examples = [item["example"] for item in vocabulary]
talk = {item["english"] for item in small_talk}
dialogue = (src / "slime-dialogue.js").read_text(encoding="utf-8-sig").split("const intents")[0]
phrases = list(dict.fromkeys(
    [item["english"] for item in small_talk] + re.findall(r"\['([^']+)',", dialogue)
))
manifest_path = src / "speech-clips.js"
previous = {}
if manifest_path.exists():
    previous = json.loads(manifest_path.read_text(encoding="utf-8").split(" = ", 1)[1].strip().removesuffix(";"))
manifest = {}
next_id = max((int(file.stem) for file in out.glob("*.wav") if file.stem.isdecimal()), default=-1) + 1

def save(text, timed=False):
    global next_id
    cached = previous.get(text)
    expected_cues = len(text.split()) if timed else 1
    if cached and len(cached[1]) >= expected_cues and (out / cached[0]).is_file():
        manifest[text] = cached
        return
    name = f"{next_id}.wav"
    next_id += 1
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
    if word not in manifest:
        save(word)

manifest_path.write_text(
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
    "launch": (220, 880), "letter": (1046,), "chime": (659, 988, 1319),
}
rate = 22050
for name, notes in effects.items():
    frames = bytearray()
    duration = 0.04 if name == "letter" else 0.065 if len(notes) == 1 else 0.085
    length = int(rate * duration)
    for frequency in notes:
        for sample in range(length):
            phase = sample * frequency / rate
            triangle = 4 * abs(phase - math.floor(phase + .5)) - 1
            envelope = min(1, sample / 125) * (1 - sample / length) ** 2
            peak = .26 if name in ("surface", "letter") else .43
            frames.extend(struct.pack("<h", int(32767 * peak * triangle * envelope)))
    with wave.open(str(out / f"fx-{name}.wav"), "wb") as wav:
        wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        wav.writeframes(frames)

# Orchard sound effects. Seed the noise so regenerated files are identical.
def orchard_effect(name, seconds, sample_at):
    noise = random.Random(73)
    frames = bytearray()
    for sample in range(int(rate * seconds)):
        time = sample / rate
        value = sample_at(time, noise.uniform(-1, 1))
        frames.extend(struct.pack("<h", int(32767 * max(-1, min(1, value)))))
    with wave.open(str(out / f"fx-{name}.wav"), "wb") as wav:
        wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
        wav.writeframes(frames)


def fuse(time, noise):
    sparse = noise if abs(noise) > .71 else noise * .12
    flicker = .44 + .24 * math.sin(math.tau * 13 * time) + .22 * math.sin(math.tau * 31 * time)
    edge = min(1, time / .009, (1.1 - time) / .009)
    return .21 * sparse * flicker * edge


def clang(time, noise):
    strike = .32 * noise * math.exp(-130 * time)
    ring = sum(
        gain * math.sin(math.tau * frequency * time) * math.exp(-decay * time)
        for frequency, gain, decay in [(390, .3, 13), (887, .21, 17), (1517, .15, 25), (2471, .1, 37)]
    )
    return (strike + ring) * min(1, time / .001)


def fruit_slice(time, noise):
    scrape = .43 * noise * min(1, time / .008) * math.exp(-31 * time)
    wet = 0
    for offset, frequency in [(.036, 470), (.065, 295), (.091, 650)]:
        age = time - offset
        if age >= 0:
            wet += .17 * math.sin(math.tau * (frequency * age - 520 * age * age)) * math.exp(-48 * age)
    return scrape + wet


orchard_effect("fuse", 1.1, fuse)
orchard_effect("clang", .46, clang)
orchard_effect("slice", .21, fruit_slice)
