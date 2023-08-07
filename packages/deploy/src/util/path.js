import path from 'node:path';
import fs from 'node:fs';

import { CACHE_FOLDER } from '../constants';

export const resolveBuildDir = (dir) => path.join(process.cwd(), dir);
export const ensureCacheFolder = () => {
  const dir = path.join(process.cwd(), CACHE_FOLDER);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
