import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCatalog } from '../scripts/import-content.mjs';

const config = { url: 'https://example.test', key: 'sb_secret_test', release: 'unit-test' };
const vocabulary = ['code', 'data'].map((word, position) => ({
  position, id: `computer-${word}`, word, meaning: word === 'code' ? '코드' : '데이터',
  example: `This is ${word}.`, translation: '이것은 예시입니다.', major: 'computer', difficulty: 'basic',
}));
const phrases = ['basic', 'intermediate', 'advanced'].map((difficulty, position) => ({
  position, difficulty, english: 'Can I sit here?', korean: '여기 앉아도 될까요?', context: '빈자리를 볼 때',
}));

function catalogFixture(words) {
  return async (url, { headers }) => {
    assert.equal(headers.apikey, config.key);
    assert.equal(url.searchParams.get('release'), 'eq.unit-test');
    const rows = url.pathname.endsWith('_vocabulary') ? words : phrases;
    const cursor = Number(url.searchParams.get('position').slice(3));
    return Response.json(rows.filter(({ position }) => position > cursor).slice(0, 1));
  };
}

test('DB 카탈로그를 페이지 끝까지 읽고 앱에 필요한 필드만 넘긴다', async () => {
  const catalog = await readCatalog({ ...config, request: catalogFixture(vocabulary) });
  assert.deepEqual(catalog.vocabulary.map(({ word }) => word), ['code', 'data']);
  assert.equal(catalog.smallTalk.length, 3);
  assert.equal(Object.hasOwn(catalog.vocabulary[0], 'position'), false);
});

test('DB 카탈로그에 중복 ID나 HTML이 있으면 배포용 목록을 반환하지 않는다', async () => {
  const [first, second] = vocabulary;
  await assert.rejects(readCatalog({ ...config, request: catalogFixture([first, { ...second, id: first.id }]) }), /중복/);
  await assert.rejects(readCatalog({ ...config, request: catalogFixture([{ ...first, meaning: '<img>' }]) }), /HTML/);
});
