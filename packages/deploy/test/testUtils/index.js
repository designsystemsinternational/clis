import { expect } from 'vitest';

export const expectTemplateToHaveResources = (template, ...resources) => {
  resources.forEach((resource) => {
    expect(Object.keys(template.Resources).includes(resource)).toBe(true);
  });
};

export const expectTemplateNotToHaveResources = (template, ...resources) => {
  resources.forEach((resource) => {
    expect(Object.keys(template.Resources).includes(resource)).not.toBe(true);
  });
};

export const expectTemplateToHaveParameters = (template, ...parameters) => {
  parameters.forEach((param) => {
    expect(Object.keys(template.Parameters).includes(param)).toBe(true);
  });
};

export const expectTemplateNotToHaveParameters = (template, ...parameters) => {
  parameters.forEach((param) => {
    expect(Object.keys(template.Parameters).includes(param)).not.toBe(true);
  });
};

export const expectPromptToHaveKey = (prompt, key) => {
  expect(prompt.some((p) => p.name === key)).toBe(true);
};

export const expectPromptNotToHaveKey = (prompt, key) => {
  expect(prompt.some((p) => p.name === key)).not.toBe(true);
};
