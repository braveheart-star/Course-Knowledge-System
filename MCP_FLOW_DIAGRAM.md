# MCP System Flow Diagram

## Complete Flow: User Question → Answer

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Browser)                            │
│                                                                          │
│  User types: "What is React hooks?"                                     │
│         ↓                                                                 │
│  ChatBot Component                                                      │
│  - Calls: POST /api/chat/ask                                            │
│  - Sends: { question, conversationHistory }                             │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP Request
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API SERVER                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Route: POST /api/chat/ask                                       │  │
│  │  File: routes/chat.ts                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Controller: chatController.askQuestion                         │  │
│  │  File: controllers/chatController.ts                            │  │
│  │  - Validates user authentication                                 │  │
│  │  - Extracts userId, question, history                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Service: chatAgent.chatWithAgent()                             │  │
│  │  File: services/chatAgent.ts                                      │  │
│  │                                                                   │  │
│  │  1. Classify question (greeting vs course question)              │  │
│  │  2. If course question:                                          │  │
│  │     - Get MCP tools as OpenAI functions                          │  │
│  │     - Call OpenAI with tools available                           │  │
│  │     - OpenAI decides to call: search_course_content             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  MCP Client: callMCPTool()                                       │  │
│  │  File: mcp/mcpClient.ts                                           │  │
│  │                                                                   │  │
│  │  - Connects to MCP Server (spawns if needed)                     │  │
│  │  - Sends tool call via stdio                                     │  │
│  │  - Tool: "search_course_content"                                 │  │
│  │  - Args: { query: "React hooks", userId: "123" }                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ stdio (stdin/stdout)
┌─────────────────────────────────────────────────────────────────────────┐
│                        MCP SERVER (Separate Process)                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  MCP Server Process                                              │  │
│  │  File: mcp/server.ts                                             │  │
│  │  - Runs via: npx tsx server.ts                                  │  │
│  │  - Listens for tool calls via stdio                             │  │
│  │  - Receives: CallToolRequest                                     │  │
│  │    { name: "search_course_content", arguments: {...} }           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Tool Executor: executeMCPTool()                                │  │
│  │  File: mcp/client.ts                                             │  │
│  │                                                                   │  │
│  │  switch (name) {                                                 │  │
│  │    case 'search_course_content':                                 │  │
│  │      → Calls: searchCourseContent()                              │  │
│  │    case 'read_lesson_content':                                   │  │
│  │      → Calls: getLessonContent()                                 │  │
│  │  }                                                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  RAG Service: searchCourseContent()                             │  │
│  │  File: services/rag.ts                                           │  │
│  │                                                                   │  │
│  │  1. Check user enrollments (only enrolled courses)              │  │
│  │  2. Generate embedding for query                                │  │
│  │  3. Vector similarity search in lessonChunks                     │  │
│  │  4. Filter by similarity threshold                               │  │
│  │  5. Return: SearchResult[] with course/module/lesson/chunk       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Database: PostgreSQL + pgvector                                │  │
│  │  Tables:                                                         │  │
│  │  - enrollments (check user access)                               │  │
│  │  - lessonChunks (vector search)                                 │  │
│  │  - lessons, modules, courses (join for metadata)               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              ↑ Results flow back up
┌─────────────────────────────────────────────────────────────────────────┐
│                        MCP SERVER → MCP CLIENT                           │
│                                                                          │
│  Returns: MCPToolResult {                                               │
│    content: [{                                                           │
│      type: 'text',                                                      │
│      text: JSON.stringify({                                             │
│        results: [{                                                       │
│          course: "React Basics",                                        │
│          module: "Hooks",                                               │
│          lesson: "useState Hook",                                       │
│          chunk: "useState is React's...",                               │
│          similarity: 0.92                                               │
│        }]                                                                │
│      })                                                                  │
│    }]                                                                    │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API SERVER (continued)                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Chat Agent: Processes MCP results                              │  │
│  │  File: services/chatAgent.ts                                      │  │
│  │                                                                   │  │
│  │  1. Parse search results from MCP                                │  │
│  │  2. Build context from results                                    │  │
│  │  3. Call OpenAI with context                                      │  │
│  │  4. OpenAI generates answer using course content                  │  │
│  │  5. Format response with sources                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Controller: Returns response                                   │  │
│  │  {                                                               │  │
│  │    answer: "useState is React's hook for...",                   │  │
│  │    sources: [{ course, module, lesson, chunk, similarity }]      │  │
│  │  }                                                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP Response
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Browser)                            │
│                                                                          │
│  ChatBot Component                                                      │
│  - Receives answer and sources                                          │
│  - Displays answer to user                                              │
│  - Shows source citations                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│  ChatBot.tsx → chat.ts (service) → axios → /api/chat/ask  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                        │
│  routes/chat.ts → controllers/chatController.ts             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CHAT AGENT LAYER                         │
│  services/chatAgent.ts                                       │
│  ├─ classifyQuestion()                                       │
│  ├─ getMCPToolsAsOpenAIFunctions()                          │
│  ├─ generateOpenAIAnswer()                                  │
│  └─ callMCPTool() → mcp/mcpClient.ts                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    MCP CLIENT LAYER                         │
│  mcp/mcpClient.ts                                            │
│  ├─ Spawns MCP Server process                               │
│  ├─ Connects via stdio                                      │
│  └─ callTool() → sends to MCP Server                        │
└─────────────────────────────────────────────────────────────┘
                            ↓ stdio
┌─────────────────────────────────────────────────────────────┐
│                    MCP SERVER PROCESS                       │
│  mcp/server.ts (separate process)                           │
│  ├─ Listens on stdio                                        │
│  ├─ Receives tool calls                                     │
│  └─ executeMCPTool() → mcp/client.ts                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    TOOL EXECUTION LAYER                     │
│  mcp/client.ts                                               │
│  ├─ search_course_content → services/rag.ts                │
│  └─ read_lesson_content → services/rag.ts                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    RAG SERVICE LAYER                        │
│  services/rag.ts                                             │
│  ├─ searchCourseContent()                                   │
│  │  ├─ Check enrollments                                    │
│  │  ├─ Generate query embedding                             │
│  │  ├─ Vector similarity search                             │
│  │  └─ Return SearchResult[]                                 │
│  └─ getLessonContent()                                       │
│     └─ Verify enrollment + return lesson                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                           │
│  PostgreSQL + pgvector                                       │
│  ├─ enrollments (access control)                            │
│  ├─ lessonChunks (vector embeddings)                       │
│  ├─ lessons, modules, courses (metadata)                   │
│  └─ Drizzle ORM for queries                                 │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

1. **MCP Server runs as separate process** - Spawned by MCP Client via `npx tsx server.ts`
2. **Communication via stdio** - Not HTTP, uses standard input/output streams
3. **Tool execution happens in MCP Server** - But actual logic is in `mcp/client.ts` (confusing name!)
4. **RAG service does the real work** - Vector search, enrollment checks, etc.
5. **OpenAI orchestrates tool calls** - Decides when to call MCP tools based on user question
6. **Results flow back through all layers** - Database → RAG → MCP Server → MCP Client → Chat Agent → Controller → Frontend

## Why This Architecture?

- **Separation of Concerns**: MCP Server handles tool execution, Chat Agent handles conversation
- **Security**: MCP Server can enforce access control (enrollment checks)
- **Reusability**: MCP tools can be used by other parts of the system
- **Protocol Standard**: Uses MCP standard for tool communication
- **Isolation**: MCP Server runs in separate process, crashes don't affect main server
