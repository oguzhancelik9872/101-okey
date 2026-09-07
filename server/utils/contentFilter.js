'use strict';

const REPLACEMENT = '#@$%!';

const LEET_MAP = Object.freeze({
  '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a',
  '5': 's', '$': 's', '7': 't', '8': 'b'
});

// Kısa ve gündelik kelimelerde yanlış eşleşme üretmemek için yalnızca açık
// hakaret/küfür kökleri tutulur. Ek almış Türkçe kullanımlar kökten yakalanır.
const TURKISH_ROOTS = [
  'amk', 'aq', 'amina', 'aminakoy', 'amcik', 'amcig', 'sik', 'siker', 'sikey',
  'siktir', 'sokam', 'sokarım', 'sokarim', 'yarrak', 'yarak', 'orospu', 'kahpe',
  'pezevenk', 'gotveren', 'götveren', 'ibne', 'pic', 'piç', 'kaltak', 'gavat',
  'dangalak', 'gerizekali', 'gerizekalı', 'maloglum', 'malogl', 'ananisik',
  'ananısik', 'annesiz', 'puşt', 'pust', 'yavsak', 'yavşak', 'serefsiz',
  'şerefsiz', 'surtuk', 'sürtük', 'tasak', 'taşak', 'dallama'
];

const ENGLISH_ROOTS = [
  'fuck', 'motherfuck', 'bitch', 'bullshit', 'shithead', 'asshole', 'bastard',
  'cunt', 'cocksucker', 'dickhead', 'whore', 'slut', 'retard', 'nigger', 'nigga',
  'faggot', 'wanker', 'twat', 'jackass', 'dipshit', 'prick', 'piss'
];

const EXACT_WORDS = new Set([
  ...TURKISH_ROOTS, ...ENGLISH_ROOTS,
  'shit', 'dick', 'cock', 'pussy', 'ass', 'damn', 'crap', 'mal', 'salak', 'aptal',
  'am', 'oc', 'oç'
].map(normalizeToken));

const PREFIX_ROOTS = [
  'amk', 'aminakoy', 'amcik', 'amcig', 'siker', 'sikey', 'sikt', 'sikiyor',
  'sikim', 'sikin', 'sikme', 'sikmis', 'sikmiş', 'sikik', 'sikici', 'sikis', 'sikiş', 'sokam',
  'yarrak', 'yarak', 'orospu', 'pezevenk', 'gotveren', 'götveren', 'ibne',
  'kaltak', 'gavat', 'dangalak', 'gerizekali', 'gerizekalı', 'ananisik',
  'ananısik', 'yavsak', 'yavşak', 'serefsiz', 'şerefsiz', 'surtuk', 'sürtük',
  'fuck', 'motherfuck', 'bitch', 'bullshit', 'shithead', 'asshole', 'bastard',
  'cunt', 'cocksucker', 'dickhead', 'whore', 'slut', 'retard', 'nigger', 'nigga',
  'faggot', 'wanker', 'twat', 'jackass', 'dipshit', 'prick', 'piss'
]
  .map(normalizeToken)
  .sort((a, b) => b.length - a.length);

const SAFE_PREFIXES = ['sikayet', 'sikeci', 'siklon'];

function normalizeToken(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0134@5$78!]/g, char => LEET_MAP[char] || char)
    .replace(/[^a-zçğıöşü]/g, '');
}

function isProfaneToken(token) {
  const normalized = normalizeToken(token);
  if (!normalized) return false;
  if (SAFE_PREFIXES.some(prefix => normalized.startsWith(prefix))) return false;
  if (EXACT_WORDS.has(normalized)) return true;
  return PREFIX_ROOTS.some(root => normalized.startsWith(root));
}

function containsProfanity(value) {
  const text = String(value || '');
  const tokens = text.match(/[\p{L}\p{M}\p{N}@!$*._-]+/gu) || [];
  return tokens.some(isProfaneToken);
}

function censorProfanity(value) {
  return String(value || '').replace(/[\p{L}\p{M}\p{N}@!$*._-]+/gu, token => (
    isProfaneToken(token) ? REPLACEMENT : token
  ));
}

module.exports = {
  REPLACEMENT,
  censorProfanity,
  containsProfanity,
  isProfaneToken,
  normalizeToken
};
