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

## Detailed Step-by-Step Execution Flow

This section breaks down exactly what happens when a user asks a question like "what is memo?" or "what is react hook?".

### Step 1: Browser → Backend Controller
**Location:** `controllers/chatController.ts`

```typescript
// User asks: "what is react hook?"
POST /api/chat/ask
Body: { question: "what is react hook?", conversationHistory: [...] }

// Controller extracts:
const userId = req.userId;
const { question, conversationHistory } = req.body;

// Calls chatAgent
const response = await chatWithAgent(question, userId, history);
```

---

### Step 2: Classification
**Location:** `services/chatAgent.ts` (line 238)

```typescript
// First step in chatWithAgent()
const classification = await classifyQuestion(question);
// Determines if question needs search (course content) or is just a greeting

// If needsSearch = true, continue to step 3
// If needsSearch = false, return greeting response (no tool calls)
```

---

### Step 3: OpenAI Extracts Query from Question
**Location:** `services/openAIChat.ts` (line 102)
**File:** `services/chatAgent.ts` (line 416)

```typescript
// In chatAgent.ts, this is called:
answer = await generateOpenAIAnswer(messages, undefined, tools, toolCallHandler);
//                                                  ↑              ↑
//                                          tool definitions   handler callback

// Inside generateOpenAIAnswer() - openAIChat.ts line 102:
let response = await client.chat.completions.create(requestOptions);
// OpenAI API call with:
//   - messages: ["what is react hook?"]
//   - tools: [search_course_content, read_lesson_content]
//   - system prompt

let message = response.choices[0].message;

// console.log('message ------>', message)
// Here OpenAI's model extracts the query from the question:
// If user asked "what is react hook?", OpenAI extracts "react hook"
// If user asked "what is memo?", OpenAI extracts "memo"
// The model uses the tool parameter descriptions to understand what to extract

// Example message.tool_calls:
[
  {
    id: "call_abc123",
    type: "function",
    function: {
      name: "search_course_content",
      arguments: '{"query":"react hook"}'  // ← Extracted by OpenAI model
    }
  }
]
```

**Key Point:** OpenAI's model generates the arguments based on:
- The user's question
- The tool parameter descriptions (e.g., "Use the user's question or key terms from their question")
- The system prompt context

---

### Step 4: toolCallHandler Extracts Arguments
**Location:** `services/chatAgent.ts` (lines 261-398, specifically line 265-268)

```typescript
// Inside generateOpenAIAnswer(), when tool_calls are detected (line 105-106):
while (message.tool_calls && message.tool_calls.length > 0 && toolCallHandler) {
  const toolResults = await toolCallHandler(message.tool_calls);
  //                                                ↑
  // Passes the array of tool calls from OpenAI

// toolCallHandler was defined earlier in chatAgent.ts (line 261):
const toolCallHandler = async (toolCalls: any[]): Promise<any[]> => {
  toolWasCalled = true;
  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      // console.log('toolCall function------>', toolCall.function)
      // Output: { name: 'search_course_content', arguments: '{"query":"react hook"}' }
      
      const { name, arguments: args } = toolCall.function;
      //      ↑                        ↑
      //   "search_course_content"   '{"query":"react hook"}' (JSON string)
      
      const parsedArgs = JSON.parse(args);
      // parsedArgs = { query: "react hook" }
      
      // Continue to step 5...
```

---

### Step 5: Call MCP Tool
**Location:** `services/chatAgent.ts` (line 271) → `mcp/mcpClient.ts` (line 115)

```typescript
// Still in toolCallHandler (chatAgent.ts line 271):
const mcpResult = await callMCPTool(name, {
  ...parsedArgs,  // { query: "react hook" }
  userId,         // 'dfb04080-c433-4ca1-babd-c696029f2f39'
});

// callMCPTool is in mcp/mcpClient.ts
// It calls the MCP Client class method:
//   toolName =======> "search_course_content"
//   args =======> {
//     query: 'react hook',
//     userId: 'dfb04080-c433-4ca1-babd-c696029f2f39'
//   }

// Inside mcpClient.ts (line 119-122):
const result = await client.callTool({
  name,        // "search_course_content"
  arguments: args,  // { query: "react hook", userId: "..." }
});
// client.callTool() is from the MCP library (@modelcontextprotocol/sdk)
// This sends the tool call to the MCP Server via stdio
```

---

### Step 6: Receive MCP Results
**Location:** `services/chatAgent.ts` (line 301)

```typescript
// Back in toolCallHandler after MCP call completes:
const resultData = JSON.parse(mcpResult.content[0].text);

// console.log('mcpResult =======>', mcpResult);
// Example result structure:
{
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        results: [
          {
            chunkId: "40d86b22-c4a9-4f80-ab07-c10fc14934a2",
            courseId: "8b129444-fe12-4c97-b0c6-dc1eb36afc67",
            course: "Advanced React Patterns",
            moduleId: "b8cce57c-05eb-476e-bc78-3ed9e63ca5d4",
            module: "Performance Optimization",
            lessonId: "45775125-3298-4045-a66c-f5da36a50062",
            lesson: "React.memo and useMemo",
            chunk: "React.memo memoizes components, preventing re-renders when props haven't changed. useMemo memoizes computed values, recalculating only when dependencies change. useCallback memoizes functions, preventing recreation on every render.",
            chunkIndex: 1,
            similarity: 0.860125763431284
          }
        ],
        count: 1
      })
    }
  ],
  isError: false
}

// Results are then:
// 1. Parsed into SearchResult[] format
// 2. Added to allSearchResults array
// 3. Returned as JSON string to OpenAI
// 4. OpenAI uses these results to generate final answer
```

---

### Step 7: Final Answer Generation
**Location:** `services/openAIChat.ts` (lines 106-129)

```typescript
// After tool results are returned to OpenAI:
messages.push({
  role: 'tool',
  tool_call_id: toolCall.id,
  content: toolResults[i],  // The search results as JSON string
});

// OpenAI is called again with the tool results:
response = await client.chat.completions.create({
  model: OPENAI_MODEL,
  messages: [...previousMessages, ...toolResults],
  tools: tools,
});

// OpenAI now generates a conversational answer using:
// - The original question
// - The search results from course content
// - System prompt instructions to only use course content

// Final answer is returned to chatAgent
// chatAgent formats response with sources and returns to controller
// Controller sends to frontend
```

---

## Execution Timeline Summary

```
1. Browser → POST /api/chat/ask
   ↓
2. Controller → chatWithAgent()
   ↓
3. Classification → needsSearch check
   ↓
4. generateOpenAIAnswer() called
   ↓
5. OpenAI API call → model generates tool_calls with extracted query
   ↓
6. toolCallHandler executed → extracts arguments from toolCall.function
   ↓
7. callMCPTool() → sends to MCP Server
   ↓
8. MCP Server → executes search_course_content tool
   ↓
9. Database query → vector similarity search
   ↓
10. Results returned → MCP Client → toolCallHandler
   ↓
11. OpenAI called again → generates answer from search results
   ↓
12. Response formatted → returned to frontend
```

## Key Takeaways

1. **Query extraction happens in OpenAI's model** - Not in our code. The model uses tool parameter descriptions to understand what to extract from the user's question.

2. **Arguments are generated as JSON string** - OpenAI returns `arguments: '{"query":"react hook"}'` which we then parse with `JSON.parse()`.

3. **toolCallHandler is a callback** - Defined before `generateOpenAIAnswer()` but only executed when OpenAI returns tool_calls.

4. **Two OpenAI API calls** - First generates tool calls, second generates final answer after receiving tool results.

5. **MCP communication is asynchronous** - The tool call handler waits for MCP results before continuing.

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
