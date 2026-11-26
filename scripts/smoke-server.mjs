import { spawn } from 'node:child_process';

const port = 43000 + Math.floor(Math.random() * 1000);
const child = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'inherit'],
});

const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('서버 시작 시간이 초과됐습니다.')), 5000);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    if (!chunk.includes(`:${port}`)) return;
    clearTimeout(timeout);
    resolve();
  });
  child.once('exit', (code) => reject(new Error(`서버가 먼저 종료됐습니다. (${code})`)));
});

try {
  await ready;
  const base = `http://127.0.0.1:${port}`;
  const response = await fetch(base);
  const html = await response.text();
  if (!response.ok || !html.includes('<div id="app">') || !html.includes('src="./src/app.js"')) throw new Error('올바른 앱 HTML을 받지 못했습니다.');
  const audio = await fetch(`${base}/src/audio/fx-shield.wav`);
  if (!audio.ok || Buffer.from(await audio.arrayBuffer()).toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('효과음 WAV를 받지 못했습니다.');
  }
  console.log(`server smoke: ${response.status} ${response.headers.get('content-type')}`);
} finally {
  child.kill();
}
