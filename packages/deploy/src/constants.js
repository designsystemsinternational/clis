export const stackName = (project, env) => `stack-${project}-${env}`;
export const bucketName = (project, env) => `${project}-static-${env}`;
export const operationsBucketName = (project) => `${project}-operations`;

export const CACHE_FOLDER = '.deployCache';
export const DEFAULT_HTTP_VERBS = ['Get', 'Post', 'Put', 'Delete'];
