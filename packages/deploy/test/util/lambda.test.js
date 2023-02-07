import { describe, it, expect } from 'vitest';

import {
  getFunctionName,
  getFunctionConfigName,
} from '../../src/util/lambda.js';

describe('util/lambda', () => {
  describe('getFunctionName', () => {
    it('should correctly handle possible js file endings', () => {
      expect(getFunctionName('test.js')).toBe('test');
      expect(getFunctionName('test.cjs')).toBe('test');
      expect(getFunctionName('test.mjs')).toBe('test');
    });

    it('should fall through in other cases', () => {
      expect(getFunctionName('test.go')).toBe('test.go');
    });
  });

  describe('getFunctionConfigName', (filename) => {
    it('should correctly handle possible js file endings', () => {
      expect(getFunctionConfigName('test.js')).toBe('test.config.{js,mjs}');
      expect(getFunctionConfigName('test.cjs')).toBe('test.config.{js,mjs}');
      expect(getFunctionConfigName('test.mjs')).toBe('test.config.{js,mjs}');
    });

    it('should correctly apply the correct file extension if provided', () => {
      expect(getFunctionConfigName('test.js', 'mjs')).toBe('test.config.mjs');
    });
  });
});
