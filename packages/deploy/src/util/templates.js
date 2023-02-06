import fs from 'node:fs';
import handlebars from 'handlebars';

/**
 * Renders a template through Handlebars and JSON parses the result.
 */
export const parseTemplate = (templateString, data) => {
  handlebars.registerHelper('uppercase', (str) => str.toUpperCase());
  const template = handlebars.compile(templateString);

  return JSON.parse(template(data));
};

export const mergeTemplates = (...templates) => {
  const keys = ['Parameters', 'Resources', 'Outputs'];
  const merged = {};
  for (const key of keys) {
    merged[key] = Object.assign({}, ...templates.map((t) => t[key] ?? {}));
  }

  return merged;
};

export const parametersToInquirer = ({
  params,
  opts = {},
  defaults = {},
  ignore = [],
}) => {
  const questions = [];
  Object.keys(params)
    .filter((key) => !ignore.includes(key))
    .forEach((key) => {
      const obj = params[key];
      questions.push({
        name: key,
        type: obj.AllowedValues ? 'list' : 'input',
        message: obj.Description ? `[${key}] ${obj.Description}` : key,
        default: opts.overrideDefault || obj.Default || defaults[key],
        choices: obj.AllowedValues
          ? opts.overrideDefault
            ? [opts.overrideDefault].concat(obj.AllowedValues)
            : obj.AllowedValues
          : null,
      });
    });
  return questions;
};

export const getParameterFromTemplate = (template, key) => {
  const param = template.parameters.find((p) => p.ParameterKey === key);
  return param ? param.ParameterValue : null;
};
