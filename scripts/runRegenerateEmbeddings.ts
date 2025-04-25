import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { regenerateEmbeddings } from './regenerateEmbeddings';

// Exécuter le script
regenerateEmbeddings().catch(console.error).finally(() => {
  console.log('Script terminé');
  process.exit(0);
});
