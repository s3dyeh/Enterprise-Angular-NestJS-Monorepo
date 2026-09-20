import { containsPattern } from './admin-query';

describe('literal search patterns', () => {
  it.each([
    ['name', '%name%'],
    ['10%', '%10\\%%'],
    ['a_b', '%a\\_b%'],
    ['a\\b', '%a\\\\b%'],
  ])('escapes %s for PostgreSQL LIKE', (value, expected) => {
    expect(containsPattern(value)).toBe(expected);
  });
});
