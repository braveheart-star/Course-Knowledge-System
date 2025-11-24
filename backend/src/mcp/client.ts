import { searchCourseContent, getLessonContent, SearchResult } from '../services/rag';

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export async function executeMCPTool(
  name: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  try {
    switch (name) {
      case 'search_course_content': {
        const { query, userId, limit, similarityThreshold, courseId } = args as {
          query: string;
          userId: string;
          limit?: number;
          similarityThreshold?: number;
          courseId?: string;
        };

        if (!query || !userId) {
          throw new Error('query and userId are required');
        }

        const results = await searchCourseContent(query, userId, {
          limit: limit || 10,
          similarityThreshold: similarityThreshold || 0.7,
          courseId: courseId || undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                results: results.map((r) => ({
                  chunkId: r.chunk.id,
                  courseId: r.course.id,
                  course: r.course.title,
                  moduleId: r.module.id,
                  module: r.module.title,
                  lessonId: r.lesson.id,
                  lesson: r.lesson.title,
                  chunk: r.chunk.content,
                  chunkIndex: r.chunk.chunkIndex,
                  similarity: r.similarity,
                })),
                count: results.length,
              }, null, 2),
            },
          ],
        };
      }

      case 'read_lesson_content': {
        const { lessonId, userId } = args as {
          lessonId: string;
          userId: string;
        };

        if (!lessonId || !userId) {
          throw new Error('lessonId and userId are required');
        }

        const content = await getLessonContent(lessonId, userId);

        if (!content) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Lesson not found or you are not enrolled in this course',
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                course: content.course.title,
                module: content.module.title,
                lesson: content.lesson.title,
                content: content.lesson.content,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message || 'An error occurred',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

export async function callMCPTool(
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  return executeMCPTool(toolName, args);
}

export async function callMCPTools(
  toolCalls: MCPToolCall[]
): Promise<MCPToolResult[]> {
  return Promise.all(
    toolCalls.map(toolCall => executeMCPTool(toolCall.name, toolCall.arguments))
  );
}

