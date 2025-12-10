import axiosInstance from './axios';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  sources?: Array<{
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

export async function askQuestion(
  question: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  const response = await axiosInstance.post('/chat/ask', {
    question,
    conversationHistory,
  });
  return response.data;
}
