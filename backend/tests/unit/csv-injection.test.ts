import { describe, it, expect } from 'vitest';
import { neutralizeFormula, escapeCsvCell, toCsvString } from '../../src/modules/exports/csv.service.js';

describe('CSV formula injection neutralization', () => {
  it.each(['=', '+', '-', '@', '\t', '\r'])('prefixes a single quote to text starting with %j', (trigger) => {
    const value = `${trigger}HYPERLINK("http://evil.example","click")`;
    expect(neutralizeFormula(value)).toBe(`'${value}`);
  });

  it('leaves ordinary text untouched', () => {
    expect(neutralizeFormula('Team Rocket')).toBe('Team Rocket');
    expect(neutralizeFormula('a=b')).toBe('a=b');
    expect(neutralizeFormula('')).toBe('');
  });

  it('does not alter real numbers, including negative scores', () => {
    expect(neutralizeFormula(-1.25)).toBe('-1.25');
    expect(neutralizeFormula(0)).toBe('0');
    expect(neutralizeFormula(87.5)).toBe('87.5');
  });

  it('neutralizes numeric-looking strings that start with a trigger', () => {
    expect(neutralizeFormula('-5')).toBe("'-5");
  });

  it('quotes cells and escapes embedded quotes after neutralization', () => {
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvCell('say "hi"')).toBe(`"say ""hi"""`);
    expect(escapeCsvCell('=cmd|"/C calc"!A0')).toBe(`"'=cmd|""/C calc""!A0"`);
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it('builds an RFC 4180 document with CRLF line endings', () => {
    const csv = toCsvString(['Name', 'Score'], [['@SUM(A1:A2)', -3], ['Plain', 4]]);
    expect(csv).toBe(`"Name","Score"\r\n"'@SUM(A1:A2)","-3"\r\n"Plain","4"`);
  });
});
