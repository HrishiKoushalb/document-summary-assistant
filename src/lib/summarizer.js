// Dependency-free TextRank (Mihalcea & Tarau, 2004) - extractive
// summarization, runs entirely client-side. No API calls, no keys, no
// hallucinated content; the tradeoff (see README) is a best-sentence
// digest rather than a fluently rewritten abstract.

const STOPWORDS = new Set(
  (
    'a about above after again against all am an and any are aren\'t as at be because been before ' +
    'being below between both but by can\'t cannot could couldn\'t did didn\'t do does doesn\'t doing ' +
    'don\'t down during each few for from further had hadn\'t has hasn\'t have haven\'t having he he\'d ' +
    'he\'ll he\'s her here here\'s hers herself him himself his how how\'s i i\'d i\'ll i\'m i\'ve if in into ' +
    'is isn\'t it it\'s its itself let\'s me more most mustn\'t my myself no nor not of off on once only ' +
    'or other ought our ours ourselves out over own same shan\'t she she\'d she\'ll she\'s should ' +
    'shouldn\'t so some such than that that\'s the their theirs them themselves then there there\'s ' +
    'these they they\'d they\'ll they\'re they\'ve this those through to too under until up very was ' +
    'wasn\'t we we\'d we\'ll we\'re we\'ve were weren\'t what what\'s when when\'s where where\'s which ' +
    'while who who\'s whom why why\'s with won\'t would wouldn\'t you you\'d you\'ll you\'re you\'ve your ' +
    'yours yourself yourselves also could may might must shall would'
  ).split(' ')
);

// Common abbreviations that should NOT be treated as sentence boundaries.
const ABBREVIATIONS = [
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e',
  'fig', 'no', 'inc', 'ltd', 'co', 'u.s', 'u.k', 'u.s.a', 'approx', 'dept', 'est',
];

/**
 * Splits raw text into sentences. Regex-based, with a guard for the most
 * common abbreviations so "Dr. Smith" doesn't get cut in half.
 */
export function splitSentences(rawText) {
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  // Protect abbreviation periods by swapping them for a placeholder.
  let protectedText = text;
  ABBREVIATIONS.forEach((abbr) => {
    const re = new RegExp(`\\b${abbr.replace('.', '\\.')}\\.`, 'gi');
    protectedText = protectedText.replace(re, (m) => m.replace('.', '<DOT>'));
  });
  // Protect decimal numbers (3.14) and ellipses.
  protectedText = protectedText.replace(/(\d)\.(\d)/g, '$1<DOT>$2');
  protectedText = protectedText.replace(/\.\.\./g, '<ELLIPSIS>');

  const rawSentences = protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“(])/)
    .map((s) => s.replace(/<DOT>/g, '.').replace(/<ELLIPSIS>/g, '...').trim())
    .filter(Boolean);

  return rawSentences;
}

function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Classic TextRank sentence similarity: normalized word overlap. Also
 * reused for query relevance (Feature 1) - "how much does sentence A
 * overlap with word set B" is the same question either way.
 */
function similarity(wordsA, wordsB) {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  let overlap = 0;
  for (const w of wordsA) if (setB.has(w)) overlap += 1;
  const denom = Math.log(wordsA.length + 1) + Math.log(wordsB.length + 1);
  return denom === 0 ? 0 : overlap / denom;
}

/**
 * Weighted-graph PageRank (power iteration).
 */
function rankSentences(matrix, { damping = 0.85, maxIterations = 60, tolerance = 1e-4 } = {}) {
  const n = matrix.length;
  if (n === 0) return [];
  let scores = new Array(n).fill(1 / n);

  const outSums = matrix.map((row) => row.reduce((a, b) => a + b, 0));

  for (let iter = 0; iter < maxIterations; iter += 1) {
    const next = new Array(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (i === j || matrix[j][i] === 0 || outSums[j] === 0) continue;
        next[i] += damping * (matrix[j][i] / outSums[j]) * scores[j];
      }
    }
    const delta = next.reduce((sum, v, i) => sum + Math.abs(v - scores[i]), 0);
    scores = next;
    if (delta < tolerance) break;
  }

  return scores;
}

function countWords(str) {
  const m = str.match(/[A-Za-z0-9']+/g);
  return m ? m.length : 0;
}

function normalize(values) {
  const max = Math.max(...values);
  if (!(max > 0)) return values.map(() => 0);
  return values.map((v) => v / max);
}

const LENGTH_PRESETS = {
  short: { ratio: 0.15, min: 2, max: 5 },
  medium: { ratio: 0.3, min: 3, max: 10 },
  long: { ratio: 0.45, min: 5, max: 18 },
};

// How much a query pulls the ranking toward itself vs. plain TextRank
// centrality, once both are normalized to the same 0-1 scale. Weighted
// toward the query (0.65) because picking a query is an explicit signal
// the user wants that topic surfaced - but centrality still gets a vote
// so a barely-related sentence with heavy keyword overlap can't win
// purely on a lucky word match.
const QUERY_WEIGHT = 0.65;

/**
 * Produces an extractive summary + key points from raw text, optionally
 * steered toward a query. Passing no query (or an empty/whitespace one)
 * is a no-op for ranking - the result is identical to calling this
 * without a third argument at all.
 *
 * @param {string} text
 * @param {'short'|'medium'|'long'} length
 * @param {string} [query] - optional topic/keywords to bias sentence selection toward
 * @returns {{
 *   summary: string,
 *   keyPoints: string[],
 *   sentenceCount: number,
 *   selectedCount: number,
 *   originalWordCount: number,
 *   summaryWordCount: number,
 *   reductionPercent: number,
 *   rankedSentences: { sentence: string, score: number, selected: boolean }[],
 * }}
 */
export function summarize(text, length = 'medium', query = '') {
  const allSentences = splitSentences(text);
  const originalWordCount = countWords(text);

  if (allSentences.length === 0) {
    throw new Error('NO_TEXT');
  }

  const queryWords = query ? tokenize(query) : [];
  const hasQuery = queryWords.length > 0;

  // Candidate sentences: substantial enough to be worth ranking/selecting.
  const candidates = allSentences
    .map((sentence, index) => ({ sentence, index }))
    .filter(({ sentence }) => countWords(sentence) >= 4);

  const pool = candidates.length >= 2 ? candidates : allSentences.map((sentence, index) => ({ sentence, index }));

  // Very short documents: just return everything, nothing meaningful to cut.
  if (pool.length <= 2) {
    const summary = pool.map((p) => p.sentence).join(' ');
    return {
      summary,
      keyPoints: pool.map((p) => p.sentence),
      sentenceCount: allSentences.length,
      selectedCount: pool.length,
      originalWordCount,
      summaryWordCount: countWords(summary),
      reductionPercent: 0,
      rankedSentences: pool.map((p) => ({ sentence: p.sentence, score: 1, selected: true })),
    };
  }

  const wordSets = pool.map((p) => tokenize(p.sentence));
  const n = pool.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const sim = similarity(wordSets[i], wordSets[j]);
      matrix[i][j] = sim;
      matrix[j][i] = sim;
    }
  }

  const scores = rankSentences(matrix);

  // Ranking score used for selection: plain TextRank centrality, unless
  // a query was given, in which case it's blended with query relevance.
  // Both are normalized to 0-1 first so the blend weight actually means
  // what it says (raw PageRank scores are tiny and on their own scale -
  // mixing them with an unnormalized similarity score would let whichever
  // happens to have bigger numbers dominate regardless of the weight).
  let rankingScores = scores;
  if (hasQuery) {
    const queryRelevance = wordSets.map((words) => similarity(words, queryWords));
    const normBase = normalize(scores);
    const normQuery = normalize(queryRelevance);
    rankingScores = normBase.map((b, i) => (1 - QUERY_WEIGHT) * b + QUERY_WEIGHT * normQuery[i]);
  }

  const preset = LENGTH_PRESETS[length] || LENGTH_PRESETS.medium;
  const targetCount = Math.min(
    n,
    Math.max(preset.min, Math.min(preset.max, Math.round(n * preset.ratio)))
  );

  const rankedIdx = pool.map((_, i) => i).sort((a, b) => rankingScores[b] - rankingScores[a]);

  const selectedPoolIdx = rankedIdx.slice(0, targetCount).sort((a, b) => a - b);
  const selectedSet = new Set(selectedPoolIdx);
  const summarySentences = selectedPoolIdx.map((i) => pool[i].sentence);
  const summary = summarySentences.join(' ');

  const keyPointCount = Math.min(5, n);
  const keyPoints = rankedIdx.slice(0, keyPointCount).map((i) => pool[i].sentence);

  const summaryWordCount = countWords(summary);
  const reductionPercent = originalWordCount > 0
    ? Math.round((1 - summaryWordCount / originalWordCount) * 100)
    : 0;

  const displayScores = normalize(rankingScores);
  const rankedSentences = pool.map((p, i) => ({
    sentence: p.sentence,
    score: displayScores[i],
    selected: selectedSet.has(i),
  }));

  return {
    summary,
    keyPoints,
    sentenceCount: allSentences.length,
    selectedCount: selectedPoolIdx.length,
    originalWordCount,
    summaryWordCount,
    reductionPercent: Math.max(0, reductionPercent),
    rankedSentences,
  };
}
