import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('package entry', () => {
  it('exposes a version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
