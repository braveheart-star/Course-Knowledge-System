import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TEMPERATURE = process.env.OPENAI_TEMPERATURE
  ? parseFloat(process.env.OPENAI_TEMPERATURE)
  : 0.2;

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

export function getMCPToolsAsOpenAIFunctions(): ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'search_course_content',
        description: 'Search course content by semantic similarity. Returns relevant chunks from lessons in courses the user is enrolled in. ONLY use this tool when the user asks a SPECIFIC, CLEAR question about course content, concepts, or topics that you are confident exist in their enrolled courses. DO NOT use for: greetings (hi, hello), vague questions, unclear questions, or when you\'re unsure if the topic exists. If uncertain, do NOT call this tool.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query about course content, concepts, or topics. Only use when user asks about specific course material.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
            similarityThreshold: {
              type: 'number',
              description: 'Minimum similarity score (0-1, default: 0.7). Lower values return more results but may be less relevant.',
              default: 0.7,
            },
            courseId: {
              type: 'string',
              description: 'Optional: Limit search to a specific course ID',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_lesson_content',
        description: 'Get the full content of a specific lesson. Verifies the user is enrolled in the course before returning content.',
        parameters: {
          type: 'object',
          properties: {
            lessonId: {
              type: 'string',
              description: 'The ID of the lesson to read',
            },
          },
          required: ['lessonId'],
        },
      },
    },
  ];
}

export async function generateOpenAIAnswer(
  messages: ChatCompletionMessageParam[],
  temperature: number = OPENAI_TEMPERATURE,
  tools?: ChatCompletionTool[],
  toolCallHandler?: (toolCalls: any[]) => Promise<any[]>
): Promise<string> {
  try {
    const client = getClient();
    
    const requestOptions: any = {
      model: OPENAI_MODEL,
      temperature,
      messages,
    };

    if (tools && tools.length > 0) {
      requestOptions.tools = tools;
      requestOptions.tool_choice = 'auto';
    }

    let response = await client.chat.completions.create(requestOptions);
    let message = response.choices[0].message;

    while (message.tool_calls && message.tool_calls.length > 0 && toolCallHandler) {
      const toolResults = await toolCallHandler(message.tool_calls);
      
      messages.push(message as ChatCompletionMessageParam);
      
      for (let i = 0; i < message.tool_calls.length; i++) {
        const toolCall = message.tool_calls[i];
        const result = toolResults[i];
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature,
        messages,
        tools: tools,
        tool_choice: 'auto',
      });

      message = response.choices[0].message;
    }

    const answer = message.content?.trim();
    if (!answer) {
      throw new Error('Empty response from OpenAI');
    }

    return answer;
  } catch (error: any) {
    throw new Error(
      `Failed to generate conversational answer via OpenAI: ${error.message}`
    );
  }
}

export type OpenAIMessage = ChatCompletionMessageParam;

