/**
 * Script to chunk all lessons in the database
 * 
 * Usage: tsx src/scripts/chunkLessons.ts [lessonId]
 * 
 * If lessonId is provided, only that lesson will be chunked.
 * Otherwise, all lessons will be chunked.
 */

import dotenv from 'dotenv';
import { chunkLesson, chunkAllLessons } from '../services/lessonChunking';

dotenv.config();

async function main() {
  const lessonId = process.argv[2];

  try {
    if (lessonId) {
      console.log(`Chunking lesson: ${lessonId}...`);
      const result = await chunkLesson(lessonId);
      console.log(`✓ Successfully chunked lesson ${result.lessonId}`);
      console.log(`  - Chunks created: ${result.chunksCreated}`);
      console.log(`  - Old chunks deleted: ${result.chunksDeleted}`);
    } else {
      console.log('Chunking all lessons in the database...\n');
      const summary = await chunkAllLessons();
      
      console.log('\n✓ Chunking completed!');
      console.log(`  - Total lessons: ${summary.totalLessons}`);
      console.log(`  - Successful: ${summary.successful}`);
      console.log(`  - Failed: ${summary.failed}`);
      console.log(`  - Total chunks created: ${summary.totalChunksCreated}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

