import { describe, it, expect } from 'vitest';
import { splitSentences, summarize } from './summarizer';

describe('splitSentences', () => {
  it('splits plain multi-sentence text', () => {
    const out = splitSentences('The cat sat on the mat. The dog ran fast. Birds fly high.');
    expect(out).toHaveLength(3);
    expect(out[0]).toBe('The cat sat on the mat.');
  });

  it('returns an empty array for empty or whitespace-only input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   \n  ')).toEqual([]);
  });

  it('does not split on common abbreviations', () => {
    const out = splitSentences('Dr. Smith met the patient. It went well.');
    expect(out).toHaveLength(2);
    expect(out[0]).toBe('Dr. Smith met the patient.');
  });

  it('does not split on decimal numbers', () => {
    const out = splitSentences('The value of pi is 3.14 approximately. That is useful.');
    expect(out[0]).toContain('3.14');
    expect(out).toHaveLength(2);
  });

  it('handles ellipses without over-splitting', () => {
    const out = splitSentences('Well... I am not sure. Let us continue.');
    expect(out).toHaveLength(2);
  });
});

describe('summarize', () => {
  it('throws a NO_TEXT error for empty input', () => {
    expect(() => summarize('', 'medium')).toThrow('NO_TEXT');
  });

  it('returns the full text unchanged for very short documents', () => {
    const text = 'This is one sentence. This is another sentence.';
    const result = summarize(text, 'medium');
    expect(result.reductionPercent).toBe(0);
    expect(result.summary).toContain('This is one sentence.');
    expect(result.summary).toContain('This is another sentence.');
  });

  // A longer, realistic multi-topic passage so length tiers have room to differ.
  const longText = `
    The history of the printing press begins in the fifteenth century. Johannes Gutenberg
    introduced movable type printing to Europe around 1440. This invention dramatically
    reduced the cost of producing books. Before movable type, books were copied by hand,
    a slow and expensive process. Scribes could spend months producing a single volume.
    Gutenberg's press used reusable metal letters that could be rearranged for each page.
    This made it possible to print hundreds of copies in the time it once took to write one.
    The spread of printed material accelerated the Renaissance considerably. Ideas could
    now travel across Europe far faster than before. Literacy rates began to rise as books
    became more affordable. The Protestant Reformation also relied heavily on printed
    pamphlets to spread its message. Martin Luther's writings were reproduced by the
    thousands within weeks. Scientific knowledge benefited enormously from standardized,
    widely available texts. Researchers could now verify and build on each other's work
    with much greater ease. By the sixteenth century, printing presses operated in most
    major European cities. The technology continued to evolve over the following centuries.
    Steam-powered presses in the nineteenth century further increased output. Newspapers
    became a daily fixture of public life as a result. Printing remains a foundational
    technology in the history of human communication.
  `;

  it('produces increasingly longer summaries for short -> medium -> long', () => {
    const short = summarize(longText, 'short');
    const medium = summarize(longText, 'medium');
    const long = summarize(longText, 'long');
    expect(short.selectedCount).toBeLessThanOrEqual(medium.selectedCount);
    expect(medium.selectedCount).toBeLessThanOrEqual(long.selectedCount);
  });

  it('reduces the word count for longer documents', () => {
    const result = summarize(longText, 'medium');
    expect(result.summaryWordCount).toBeLessThan(result.originalWordCount);
    expect(result.reductionPercent).toBeGreaterThan(0);
  });

  it('only selects sentences that exist verbatim in the source (no hallucination)', () => {
    const result = summarize(longText, 'medium');
    const sourceSentences = splitSentences(longText);
    const summarySentences = splitSentences(result.summary);
    for (const s of summarySentences) {
      expect(sourceSentences).toContain(s);
    }
  });

  it('caps key points at 5 even for long documents', () => {
    const result = summarize(longText, 'long');
    expect(result.keyPoints.length).toBeLessThanOrEqual(5);
  });

  it('defaults to a medium-length summary when no length is specified', () => {
    const withDefault = summarize(longText);
    const explicitMedium = summarize(longText, 'medium');
    expect(withDefault.selectedCount).toBe(explicitMedium.selectedCount);
  });

  it('includes a rankedSentences entry for every candidate, in document order', () => {
    const result = summarize(longText, 'medium');
    expect(result.rankedSentences.length).toBeGreaterThan(0);
    const sourceSentences = splitSentences(longText);
    const rankedText = result.rankedSentences.map((r) => r.sentence);
    // Document order means each ranked sentence appears no earlier in
    // rankedSentences than it does in the source.
    let cursor = -1;
    for (const s of rankedText) {
      const idx = sourceSentences.indexOf(s, cursor + 1);
      expect(idx).toBeGreaterThan(cursor);
      cursor = idx;
    }
    for (const r of result.rankedSentences) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    expect(result.rankedSentences.some((r) => r.selected)).toBe(true);
  });
});

describe('summarize with a query', () => {
  const longText = `
    The history of the printing press begins in the fifteenth century. Johannes Gutenberg
    introduced movable type printing to Europe around 1440. This invention dramatically
    reduced the cost of producing books. Before movable type, books were copied by hand,
    a slow and expensive process. Scribes could spend months producing a single volume.
    Gutenberg's press used reusable metal letters that could be rearranged for each page.
    This made it possible to print hundreds of copies in the time it once took to write one.
    The spread of printed material accelerated the Renaissance considerably. Ideas could
    now travel across Europe far faster than before. Literacy rates began to rise as books
    became more affordable. The Protestant Reformation also relied heavily on printed
    pamphlets to spread its message. Martin Luther's writings were reproduced by the
    thousands within weeks. Scientific knowledge benefited enormously from standardized,
    widely available texts. Researchers could now verify and build on each other's work
    with much greater ease. By the sixteenth century, printing presses operated in most
    major European cities. The technology continued to evolve over the following centuries.
    Steam-powered presses in the nineteenth century further increased output. Newspapers
    became a daily fixture of public life as a result. Printing remains a foundational
    technology in the history of human communication.
  `;

  it('is byte-identical to the no-query path when the query is empty or omitted', () => {
    const noArg = summarize(longText, 'short');
    const emptyString = summarize(longText, 'short', '');
    const whitespaceOnly = summarize(longText, 'short', '   ');
    expect(emptyString).toEqual(noArg);
    expect(whitespaceOnly).toEqual(noArg);
  });

  it('shifts selection toward sentences matching the query', () => {
    const base = summarize(longText, 'short');
    const queried = summarize(longText, 'short', 'Reformation Luther pamphlets religious message');

    expect(queried.summary).not.toBe(base.summary);

    const mentionsReformation = (s) => /reformation|luther|pamphlet/i.test(s);
    expect(queried.keyPoints.some(mentionsReformation)).toBe(true);

    // The matching sentence should rank measurably higher with the query
    // than it did under plain centrality.
    const findScore = (result, pred) => result.rankedSentences.find((r) => pred(r.sentence))?.score ?? 0;
    const baseScore = findScore(base, mentionsReformation);
    const queriedScore = findScore(queried, mentionsReformation);
    expect(queriedScore).toBeGreaterThan(baseScore);
  });

  it('still only selects sentences that exist verbatim in the source', () => {
    const result = summarize(longText, 'medium', 'printing press technology');
    const sourceSentences = splitSentences(longText);
    const summarySentences = splitSentences(result.summary);
    for (const s of summarySentences) {
      expect(sourceSentences).toContain(s);
    }
  });

  it('falls back to plain TextRank when the query is only stopwords', () => {
    const base = summarize(longText, 'short');
    const stopwordsOnly = summarize(longText, 'short', 'the and of a to');
    expect(stopwordsOnly).toEqual(base);
  });

  it('matches realistic queries that use a different word form than the source text', () => {
    // This is the case that actually matters for a real user: nobody types
    // the document's exact vocabulary. "science" (not "Scientific"),
    // "newspaper" (singular; source says "Newspapers") must still surface
    // the relevant sentence, or the feature is useless in practice even if
    // exact-word-match tests pass.
    const scienceQuery = summarize(longText, 'medium', 'science');
    expect(scienceQuery.summary).toMatch(/scientific/i);

    const newspaperQuery = summarize(longText, 'medium', 'newspaper');
    expect(newspaperQuery.summary).toMatch(/newspapers/i);
  });
});
