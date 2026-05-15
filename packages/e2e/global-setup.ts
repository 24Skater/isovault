import path from 'path';
import dotenv from 'dotenv';

export default function globalSetup(): void {
  dotenv.config({ path: path.join(__dirname, '.env.e2e') });

  if (!process.env['ISO_MANAGER_API_KEY']) {
    const msg = [
      '',
      'E2E setup error: ISO_MANAGER_API_KEY is not set.',
      '',
      'Local dev:',
      '  1. Build the backend:  npm run build -w packages/backend',
      '  2. Start the server once to capture the auto-generated key:',
      '       node packages/backend/dist/server.js',
      '     Look for: [auth] API key (save this — shown once): <key>',
      '  3. Create packages/e2e/.env.e2e with:',
      '       ISO_MANAGER_API_KEY=<key>',
      '  4. Re-run the E2E tests.',
      '',
      'CI: add E2E_API_KEY as a repository secret and ensure the workflow',
      '    sets ISO_MANAGER_API_KEY from it.',
      '',
    ].join('\n');

    throw new Error(msg);
  }
}
