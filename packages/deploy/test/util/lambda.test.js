import fs from 'node:fs';

import { describe, it, expect, vi } from 'vitest';

import {
  getFunctionName,
  getFunctionConfigName,
  resolveFunctionConfig,
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
      expect(getFunctionConfigName('test.js')).toBe('test.config.json');
      expect(getFunctionConfigName('test.cjs')).toBe('test.config.json');
      expect(getFunctionConfigName('test.mjs')).toBe('test.config.json');
    });
  });

  describe('resolveFunctionConfig', () => {
    it('should look for config file as sibling of lambda file', () => {
      const fn = vi.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
      resolveFunctionConfig('path/to/lambda.js');
      expect(fn).toHaveBeenCalledWith('path/to/lambda.config.json');
    });
  });
});
