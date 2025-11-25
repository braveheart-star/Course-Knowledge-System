import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { executeMCPTool } from './client';
import dotenv from 'dotenv';

dotenv.config();

const server = new Server(
  {
    name: 'course-knowledge-system',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: 'search_course_content',
    description: 'Search course content by semantic similarity. Returns relevant chunks from lessons in courses the user is enrolled in. Use this to find information about specific topics.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Ask a question or describe what you want to find.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
        similarityThreshold: {
          type: 'number',
          description: 'Minimum similarity score (0-1, default: 0.85). Lower values return more results but may be less relevant.',
          default: 0.85,
        },
        courseId: {
          type: 'string',
          description: 'Optional: Limit search to a specific course ID',
        },
        userId: {
          type: 'string',
          description: 'The user ID to search on behalf of. Required for access control.',
        },
      },
      required: ['query', 'userId'],
    },
  },
  {
    name: 'read_lesson_content',
    description: 'Get the full content of a specific lesson. Verifies the user is enrolled in the course before returning content.',
    inputSchema: {
      type: 'object',
      properties: {
        lessonId: {
          type: 'string',
          description: 'The ID of the lesson to read',
        },
        userId: {
          type: 'string',
          description: 'The user ID to read on behalf of. Required for access control.',
        },
      },
      required: ['lessonId', 'userId'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!name) {
    throw new Error('Tool name is required');
  }

  if (!args || typeof args !== 'object') {
    throw new Error('Invalid arguments');
  }

  const result = await executeMCPTool(name, args);
  return result as any;
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Note: connect() automatically calls start(), so we don't need to call it manually
}

main().catch((error) => {
  console.error('MCP Server error:', error);
  process.exit(1);
});

