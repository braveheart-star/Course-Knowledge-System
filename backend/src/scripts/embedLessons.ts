/**
 * Script to embed lesson chunks
 * 
 * Usage: 
 *   tsx src/scripts/embedLessons.ts [lessonId] [--re-embed]
 *   tsx src/scripts/embedLessons.ts --all
 * 
 * If lessonId is provided, only that lesson will be embedded.
 * If --all is provided, all unembedded chunks will be embedded.
 * Use --re-embed to re-embed chunks that already have embeddings.
 */

import dotenv from 'dotenv';
import { embedLesson, reEmbedLesson, embedAllChunks } from '../services/lessonEmbedding';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const isReEmbed = args.includes('--re-embed');
  const lessonId = args.find(arg => !arg.startsWith('--'));

  try {
    if (isAll) {
      console.log('Embedding all unembedded chunks in the database...\n');
      const summary = await embedAllChunks(50, 10);
      
      console.log('\n✓ Embedding completed!');
      console.log(`  - Total chunks: ${summary.totalChunks}`);
      console.log(`  - Chunks embedded: ${summary.chunksEmbedded}`);
      console.log(`  - Chunks failed: ${summary.chunksFailed}`);
      console.log(`  - Lessons processed: ${summary.lessonsProcessed}`);
    } else if (lessonId) {
      console.log(`Embedding lesson: ${lessonId}...`);
      const result = isReEmbed 
        ? await reEmbedLesson(lessonId)
        : await embedLesson(lessonId);
      
      console.log(`✓ Successfully embedded lesson ${result.lessonId}`);
      console.log(`  - Chunks embedded: ${result.chunksEmbedded}`);
      console.log(`  - Chunks skipped: ${result.chunksSkipped}`);
      console.log(`  - Chunks failed: ${result.chunksFailed}`);
    } else {
      console.error('Usage:');
      console.error('  tsx src/scripts/embedLessons.ts [lessonId] [--re-embed]');
      console.error('  tsx src/scripts/embedLessons.ts --all');
      process.exit(1);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

