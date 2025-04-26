import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { regenerateAllEmbeddings } from './regenerateAllEmbeddings';

// Exécuter le script
regenerateAllEmbeddings().catch(console.error).finally(() => {
  console.log('Script terminé');
  process.exit(0);
});
