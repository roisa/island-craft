import { describe, it, expect } from 'vitest';
import { serializeEdits, deserializeEdits } from '../../src/game/save';

describe('edit serialisation', () => {
  it('round-trips through JSON', () => {
    const m = new Map([['0,0', new Map([[5, 1], [300, 52]])], ['-3,7', new Map([[0, 0]])]]);
    const back = deserializeEdits(JSON.parse(JSON.stringify(serializeEdits(m))));
    expect(back).toEqual(m);
  });
  it('handles a missing value', () => { expect(deserializeEdits(undefined).size).toBe(0); });
});
