export const stackName = (project, env) => `stack-${project}-${env}`;
export const bucketName = (project, env) => `${project}-static-${env}`;
export const operationsBucketName = (project) => `${project}-operations`;

export const CACHE_FOLDER = '.deployCache';
export const DEFAULT_HTTP_VERBS = ['Get', 'Post', 'Put', 'Delete'];
export const USE_PREVIOUS_VALUE = 'Use Previous Value';
export const ALLOWED_TEMPLATE_EXTENSIONS = ['js', 'mjs'];
export const ALLOWED_LAMBDA_EXTENSIONS = ['js', 'cjs', 'mjs'];
