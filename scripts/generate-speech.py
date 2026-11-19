"""Generate bundled speech with Piper and word cues from actual clip lengths."""
import json
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

def save(text, parts):
    name = f"{len(manifest)}.wav"
    cues = []
    position = 0.0
    with wave.open(str(out / name), "wb") as wav:
        wav.setparams((1, 2, voice.config.sample_rate, 0, "NONE", "not compressed"))
        for part in parts:
            cues.append(round(position, 4))
            for chunk in voice.synthesize(part):
                pcm = chunk.audio_int16_bytes
                wav.writeframesraw(pcm)
                position += len(pcm) / (2 * chunk.sample_rate)
    manifest[text] = [name, cues]

for phrase in dict.fromkeys(phrases):
    save(phrase, phrase.split() if phrase in talk else [phrase])

tokens = {word.lower() for phrase in phrases for word in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", phrase)}
for word in sorted(set(words) | tokens):
    save(word, [word])

(src / "speech-clips.js").write_text(
    "export const speechClips = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8",
)
print(f"Generated {len(manifest)} speech files")
