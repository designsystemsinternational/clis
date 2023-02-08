import glob from 'glob';

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Looks for a potential user template, loads it and returns it if it extists.
 * Returns null if no template is found.
 */
export const maybeImportUserTemplate = async (templateGlob) => {
  const foundFiles = glob.sync(templateGlob);
  if (foundFiles.length === 0) return null;
  const templatePath = foundFiles[0];
  const template = await import(templatePath);

  if (typeof template.default !== 'function') {
    throw new Error(
      `Template ${templatePath} does not export a default function`,
    );
  }

  return template.default;
};
