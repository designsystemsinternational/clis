import path from 'node:path';

export const resolveBuildDir = (dir) => path.join(process.cwd(), dir);
