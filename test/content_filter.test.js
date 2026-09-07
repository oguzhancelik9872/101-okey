const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REPLACEMENT,
  censorProfanity,
  containsProfanity
} = require('../server/utils/contentFilter');

test('Türkçe ve İngilizce uygunsuz isimleri yakalar', () => {
  assert.equal(containsProfanity('SiktirGit'), true);
  assert.equal(containsProfanity('f.u.c.k_you'), true);
  assert.equal(containsProfanity('Ayşe_34'), false);
  assert.equal(containsProfanity('KlasikOyuncu'), false);
  assert.equal(containsProfanity('Aqua'), false);
  assert.equal(containsProfanity('Amina'), false);
  assert.equal(containsProfanity('Şikayetçi'), false);
});

test('sohbette yalnızca küfürlü kelimeyi değiştirir', () => {
  assert.equal(censorProfanity('merhaba sizin ben amk nasılsınız'), `merhaba sizin ben ${REPLACEMENT} nasılsınız`);
  assert.equal(censorProfanity('bu oyun bullshit ama devam'), `bu oyun ${REPLACEMENT} ama devam`);
});
