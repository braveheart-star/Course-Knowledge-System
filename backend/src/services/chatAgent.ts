import { SearchResult } from './rag';
import { generateOpenAIAnswer, getMCPToolsAsOpenAIFunctions, OpenAIMessage } from './openAIChat';
import { callMCPTool } from '../mcp/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    courseId: string;
    course: string;
    moduleId: string;
    module: string;
    lessonId: string;
    lesson: string;
    chunk: string;
    similarity: number;
  }>;
}


const NO_CONTEXT_MESSAGE =
  "I couldn't find this topic inside your enrolled courses. It may live in a course you haven't joined yet. Please enroll in the relevant course (or ask an admin for access) and then try again.";

const SYSTEM_PROMPT = `You are a helpful course assistant for the Course Knowledge System.

CRITICAL RULES:
1. DO NOT use tools (search_course_content, read_lesson_content) for:
   - Greetings (hi, hello, hey, etc.) - just respond naturally
   - Simple conversational questions that don't require course content
   - Questions about the system itself
   - General questions that don't relate to course material
   - Questions where you don't know if the topic exists in courses
   - Vague or unclear questions
   Only use tools when the user asks a SPECIFIC, CLEAR question about course content, concepts, or topics that you are confident exist in their enrolled courses.
   If you're unsure whether to use tools, DON'T use them - just answer naturally or ask for clarification.

2. When you DO use tools and receive search results:
   - Generate a SHORT, CLEAR answer (2-4 sentences max)
   - Point to ESSENTIAL FACTS only based on the user's question, search results, and chat history
   - Use conversational, friendly style
   - Reference Course, Module, and Lesson names when citing information
   - At the end, suggest the user explore the MOST RELATED COURSE and MODULE (the course with the highest resultCount in mostRelatedCourse)
   - Format suggestion: "I suggest exploring [Course Title] - [Module Title] to learn more about this topic."
   - DO NOT list individual lessons - only suggest Course and Module

3. If search results are empty (count: 0):
   - Tell the user: "The topic you're asking about is not available in your currently enrolled courses. Please enroll in the corresponding course(s) that cover this topic first."
   - DO NOT suggest exploring other courses or modules when results are empty
   - DO NOT mention unrelated courses as alternatives
   - Only tell them to enroll in the relevant course for the topic they asked about

4. For greetings or non-course questions:
   - Answer naturally without using tools
   - Be friendly and helpful
   - Offer to help with course-related questions`;

function buildFallbackAnswer(
  question: string,
  searchResults: SearchResult[],
  conversationHistory: ChatMessage[] = []
): string {
  if (searchResults.length === 0) {
    return NO_CONTEXT_MESSAGE;
  }

  const topResults = searchResults.slice(0, 5);
  const groupedByLesson = new Map<string, SearchResult[]>();
  
  for (const result of topResults) {
    const key = `${result.lesson.id}`;
    if (!groupedByLesson.has(key)) {
      groupedByLesson.set(key, []);
    }
    groupedByLesson.get(key)!.push(result);
  }

  let answer = '';
  
  const hasContext = conversationHistory.length > 0;
  if (hasContext) {
    answer += `Based on our conversation and the course content, `;
  } else {
    answer += `Based on the course content, `;
  }
  
  answer += `here's what I found:\n\n`;
  
  const uniqueLessons = Array.from(groupedByLesson.entries());
  
  for (const [lessonId, results] of uniqueLessons) {
    const firstResult = results[0];
    answer += `**${firstResult.course.title} - ${firstResult.module.title} - ${firstResult.lesson.title}**\n\n`;
    
    const chunks = results
      .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex)
      .map(r => r.chunk.content)
      .filter((content, index, array) => {
        return array.indexOf(content) === index;
      })
      .join(' ');
    
    answer += `${chunks}\n\n`;
  }
  
  if (uniqueLessons.length > 1) {
    answer += `\nThis information is compiled from multiple lessons in your enrolled courses. `;
  } else {
    answer += `\nThis information is from your enrolled courses. `;
  }
  
  answer += `If you need more details about any specific topic, feel free to ask!`;

  return answer;
}

function buildExploreSuggestion(
  sources: ChatResponse['sources']
): string {
  if (!sources || sources.length === 0) {
    return '';
  }

  const courseModuleMap = new Map<string, { course: string; module: string }>();

  for (const source of sources) {
    const key = `${source.courseId}-${source.moduleId}`;
    if (!courseModuleMap.has(key)) {
      courseModuleMap.set(key, {
        course: source.course,
        module: source.module,
      });
    }
  }

  const suggestions = Array.from(courseModuleMap.values())
    .slice(0, 2)
    .map((item) => `• Course "${item.course}" - Module "${item.module}"`)
    .join('\n');

  if (suggestions.length === 0) {
    return '';
  }

  return `I suggest exploring:\n${suggestions}`;
}

function buildContextFromResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const groupedByLesson = new Map<string, SearchResult[]>();

  for (const result of results.slice(0, 6)) {
    const key = `${result.lesson.id}`;
    if (!groupedByLesson.has(key)) {
      groupedByLesson.set(key, []);
    }
    groupedByLesson.get(key)!.push(result);
  }

  let context = '';

  for (const [, lessonResults] of groupedByLesson.entries()) {
    const first = lessonResults[0];
    const chunks = lessonResults
      .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex)
      .map(r => r.chunk.content)
      .filter((content, index, array) => array.indexOf(content) === index)
      .join(' ');

    context += `Course: ${first.course.title}\n`;
    context += `Module: ${first.module.title}\n`;
    context += `Lesson: ${first.lesson.title}\n`;
    context += `Content: ${chunks}\n`;
    context += '---\n';
  }

  return context.trim();
}

function buildOpenAIMessages(
  question: string,
  searchResults: SearchResult[],
  conversationHistory: ChatMessage[] = []
): OpenAIMessage[] {
  const historyMessages: OpenAIMessage[] = conversationHistory
    .slice(-6)
    .map(message => ({
      role: message.role,
      content: message.content,
    }));

  const context = buildContextFromResults(searchResults);
  const userMessage: OpenAIMessage = {
    role: 'user',
    content: `User question: ${question}\n\nCourse context:\n${context}\n\nInstructions:\n- Answer only with information from the course context.\n- Reference Course, Module, and Lesson names when citing facts.\n- If the answer is not in the context, explicitly say so.`,
  };

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...historyMessages,
    userMessage,
  ];
}

export async function chatWithAgent(
  question: string,
  userId: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  if (!question || question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const tools = getMCPToolsAsOpenAIFunctions();
    const allSearchResults: SearchResult[] = [];
    let toolWasCalled = false;

    const toolCallHandler = async (toolCalls: any[]): Promise<any[]> => {
      toolWasCalled = true;
      const results = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const { name, arguments: args } = toolCall.function;
          const parsedArgs = JSON.parse(args);

          try {
            const mcpResult = await callMCPTool(name, {
              ...parsedArgs,
              userId,
            });

            if (mcpResult.isError) {
              return mcpResult.content[0].text;
            }

            const resultData = JSON.parse(mcpResult.content[0].text);

            if (name === 'search_course_content') {
              const searchResultsData = resultData.results || [];
              
              const searchResults: SearchResult[] = searchResultsData.map((r: any) => ({
                chunk: {
                  id: r.chunkId || '',
                  content: r.chunk,
                  chunkIndex: r.chunkIndex || 0,
                },
                lesson: {
                  id: r.lessonId,
                  title: r.lesson,
                },
                module: {
                  id: r.moduleId,
                  title: r.module,
                },
                course: {
                  id: r.courseId,
                  title: r.course,
                },
                similarity: r.similarity,
              }));

              allSearchResults.push(...searchResults);

              if (resultData.count === 0 || searchResults.length === 0) {
                return JSON.stringify({
                  results: [],
                  count: 0,
                  message: "No relevant content found in your enrolled courses. The topic you're asking about is not covered in your currently enrolled courses. Please enroll in the corresponding course(s) that cover this topic first.",
                  noResults: true,
                }, null, 2);
              }

              const courseCounts = new Map<string, { count: number; courseId: string; courseTitle: string }>();
              for (const result of searchResults) {
                const courseId = result.course.id;
                if (!courseCounts.has(courseId)) {
                  courseCounts.set(courseId, {
                    count: 0,
                    courseId: result.course.id,
                    courseTitle: result.course.title,
                  });
                }
                courseCounts.get(courseId)!.count++;
              }

              const mostRelatedCourse = Array.from(courseCounts.values())
                .sort((a, b) => b.count - a.count)[0];

              return JSON.stringify({
                results: searchResultsData,
                count: resultData.count,
                mostRelatedCourse: {
                  courseId: mostRelatedCourse.courseId,
                  courseTitle: mostRelatedCourse.courseTitle,
                  resultCount: mostRelatedCourse.count,
                },
              }, null, 2);
            } else if (name === 'read_lesson_content') {
              if (resultData.error) {
                return JSON.stringify({
                  error: resultData.error,
                }, null, 2);
              }

              return JSON.stringify({
                course: resultData.course,
                module: resultData.module,
                lesson: resultData.lesson,
                content: resultData.content,
              }, null, 2);
            } else {
              return JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2);
            }
          } catch (error: any) {
            return JSON.stringify({ error: error.message || 'Tool execution failed' }, null, 2);
          }
        })
      );

      return results;
    };

    const historyMessages: OpenAIMessage[] = conversationHistory
      .slice(-6)
      .map(message => ({
        role: message.role,
        content: message.content,
      }));

    const messages: OpenAIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyMessages,
      { role: 'user', content: question },
    ];

    let answer: string;

    try {
      answer = await generateOpenAIAnswer(messages, undefined, tools, toolCallHandler);
      
      if (!toolWasCalled) {
        return {
          answer,
          sources: [],
        };
      }
      
      if (allSearchResults.length === 0 && toolWasCalled) {
        if (answer && !answer.toLowerCase().includes('enroll')) {
          answer = NO_CONTEXT_MESSAGE;
        }
        const lowerAnswer = answer.toLowerCase();
        if (lowerAnswer.includes('suggest exploring') || lowerAnswer.includes('i suggest') || lowerAnswer.includes('explore')) {
          answer = NO_CONTEXT_MESSAGE;
        }
      }
    } catch (openAiError: any) {
      console.error('OpenAI generation failed:', openAiError.message);
      
      if (allSearchResults.length > 0) {
        answer = buildFallbackAnswer(question, allSearchResults, conversationHistory);
      } else {
        answer = NO_CONTEXT_MESSAGE;
      }
    }

    const sources = allSearchResults.map(result => ({
      courseId: result.course.id,
      course: result.course.title,
      moduleId: result.module.id,
      module: result.module.title,
      lessonId: result.lesson.id,
      lesson: result.lesson.title,
      chunk: result.chunk.content,
      similarity: result.similarity,
    }));

    const uniqueSources = sources.filter((source, index, array) => {
      return (
        array.findIndex(
          (s) => s.lessonId === source.lessonId && s.chunk === source.chunk
        ) === index
      );
    });

    return {
      answer,
      sources: uniqueSources,
    };
  } catch (error: any) {
    if (error.message?.includes('not enrolled')) {
      throw new Error('You are not enrolled in any courses that contain relevant information.');
    }
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

export async function getDetailedLessonInfo(
  lessonId: string,
  userId: string
): Promise<{
  course: string;
  module: string;
  lesson: string;
  content: string;
} | null> {
  try {
    const mcpResult = await callMCPTool('read_lesson_content', {
      lessonId,
      userId,
    });

    if (mcpResult.isError) {
      return null;
    }

    const resultData = JSON.parse(mcpResult.content[0].text);

    if (resultData.error) {
      return null;
    }

    return {
      course: resultData.course,
      module: resultData.module,
      lesson: resultData.lesson,
      content: resultData.content,
    };
  } catch (error: any) {
    throw new Error(`Failed to get lesson content: ${error.message}`);
  }
}

