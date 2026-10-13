import { describe, it, expect } from 'vitest';
import { finite, positive, nonNegative } from './model-checks.js';

const bad = [NaN, Infinity, -Infinity];

describe('model checks', () => {
  it('finite accepts any finite number and names the field on failure', () => {
    expect(() => finite(-3, 'x')).not.toThrow();
    expect(() => finite(0, 'x')).not.toThrow();
    for (const v of bad) expect(() => finite(v, 'model.x')).toThrow(TypeError);
    expect(() => finite(NaN, 'model.x')).toThrow(/model\.x/);
  });

  it('positive rejects zero, negatives and non-finite numbers', () => {
    expect(() => positive(0.001, 'x')).not.toThrow();
    for (const v of [0, -1, ...bad]) expect(() => positive(v, 'model.y')).toThrow(TypeError);
    expect(() => positive(0, 'model.y')).toThrow(/model\.y/);
  });

  it('nonNegative accepts zero but rejects negatives and non-finite numbers', () => {
    expect(() => nonNegative(0, 'x')).not.toThrow();
    for (const v of [-0.1, ...bad]) expect(() => nonNegative(v, 'model.z')).toThrow(TypeError);
  });
});
