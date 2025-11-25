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
        description: 'Search course content by semantic similarity. Returns relevant chunks from lessons in courses the user is enrolled in. ALWAYS use this tool when the user asks about course concepts, topics, definitions, explanations, or any question that could be answered from course material. Use this tool for questions like "what is X?", "explain Y", "how does Z work?", etc. The tool will return empty results if the topic is not found, so it\'s safe to use even when uncertain. DO NOT use only for simple greetings.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query about course content, concepts, or topics. Use the user\'s question or key terms from their question.',
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

export interface QuestionClassification {
  needsSearch: boolean;
  reason: string;
}

export async function classifyQuestion(question: string): Promise<QuestionClassification> {
  try {
    const client = getClient();
    
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a question classifier for a course knowledge system. Your job is to determine if a user's question requires searching course content or if it's just a greeting, thanks, or casual conversation.

Classify the question into one of these categories:
1. "needs_search" - The question asks about course content, concepts, topics, definitions, explanations, or anything that could be answered from course material (e.g., "what is X?", "explain Y", "how does Z work?", "tell me about...")
2. "no_search" - Simple greetings (hi, hello, hey, good morning, etc.), thanks, casual conversation, or questions about the system itself

Respond ONLY with a JSON object in this exact format:
{
  "needsSearch": true or false,
  "reason": "brief explanation"
}`
        },
        {
          role: 'user',
          content: question
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const classification = JSON.parse(content) as QuestionClassification;
    return classification;
  } catch (error: any) {
    // Fallback to pattern matching if AI classification fails
    const lowerQuestion = question.toLowerCase().trim();
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you'];
    const needsSearch = !greetings.some(g => lowerQuestion.startsWith(g) && lowerQuestion.length < 30);
    
    return {
      needsSearch,
      reason: needsSearch ? 'Question appears to be about course content' : 'Question appears to be a greeting or casual conversation'
    };
  }
}

