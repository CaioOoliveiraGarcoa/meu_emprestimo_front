import { describe, expect, it } from 'vitest';
import { formatDate, isOverdue, normalizeSearch } from './domain';

describe('regras da interface', () => {
  it('CA-E09 apresenta hora de Brasília e só sinaliza atraso após o instante', () => {
    const due = '2026-11-25T15:00:00.000Z';
    expect(formatDate(due)).toContain('12:00');
    expect(isOverdue(due, Date.parse(due))).toBe(false);
    expect(isOverdue(due, Date.parse(due) + 1)).toBe(true);
  });
  it('CA-E01 permite busca sem acento', () => expect(normalizeSearch('  CÂmera ')).toBe('camera'));
});
