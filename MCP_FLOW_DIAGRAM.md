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
**Location:** `services/openAIChat.ts` (line 82-103)
**File:** `services/chatAgent.ts` (line 416)

```typescript
// In chatAgent.ts, this is called:
answer = await generateOpenAIAnswer(messages, undefined, tools, toolCallHandler);
//                                                  ↑              ↑
//                                          tool definitions   handler callback
// This answer is the final response returned to frontend

// Inside generateOpenAIAnswer() - openAIChat.ts:
// First, requestOptions is built:
const requestOptions = {
  model: 'gpt-4o-mini',
  temperature: 0.2,
  messages: [
    {
      role: 'system',
      content: 'You are a helpful course assistant for the Course Knowledge System...'
    },
    {
      role: 'assistant',
      content: "Hello! I'm your course assistant. Ask me anything about your enrolled courses!"
    },
    { 
      role: 'user', 
      content: 'what is react memo?' 
    }
  ],
  tools: [
    { 
      type: 'function', 
      function: {
        name: 'search_course_content',
        description: 'Search course content by semantic similarity...',
        parameters: { /* ... */ }
      }
    },
    { 
      type: 'function', 
      function: {
        name: 'read_lesson_content',
        description: 'Get the full content of a specific lesson...',
        parameters: { /* ... */ }
      }
    }
  ],
  tool_choice: 'auto'
};

// console.log('requestOptions ------>', requestOptions)

// OpenAI API call - openAIChat.ts line 102:
let response = await client.chat.completions.create(requestOptions);
let message = response.choices[0].message;

// console.log('message ------>', message)
// Here OpenAI's model extracts the query from the question:
// If user asked "what is react hook?", OpenAI extracts "react hook"
// If user asked "what is memo?", OpenAI extracts "memo"
// The model uses the tool parameter descriptions to understand what to extract

// Actual message structure returned:
{
  role: 'assistant',
  content: null,  // null because model decided to call a tool instead
  tool_calls: [
    {
      id: 'call_uIaDEWcvzjAUDy6xDPIo1W4v',
      type: 'function',
      function: {
        name: 'search_course_content',
        arguments: '{"query":"react memo"}'  // ← Extracted by OpenAI model
      }
    }
  ],
  refusal: null,
  annotations: []
}
```

**Key Point:** OpenAI's model generates the arguments based on:
- The user's question ("what is react memo?")
- The tool parameter descriptions (e.g., "Use the user's question or key terms from their question")
- The system prompt context
- The conversation history (if any)

---

### Step 4: toolCallHandler Extracts Arguments
**Location:** `services/openAIChat.ts` (line 107-108) → `services/chatAgent.ts` (lines 261-398)

```typescript
// Inside generateOpenAIAnswer(), when tool_calls are detected (openAIChat.ts line 107-108):
while (message.tool_calls && message.tool_calls.length > 0 && toolCallHandler) {
  const toolResults = await toolCallHandler(message.tool_calls);
  //                                                ↑
  // Passes the array of tool calls from OpenAI: [toolCall1, toolCall2, ...]

// toolCallHandler was defined earlier in chatAgent.ts (line 261):
const toolCallHandler = async (toolCalls: any[]): Promise<any[]> => {
  toolWasCalled = true;
  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      // console.log('toolCall function------>', toolCall.function)
      // Output: { name: 'search_course_content', arguments: '{"query":"react memo"}' }
      
      const { name, arguments: args } = toolCall.function;
      //      ↑                        ↑
      //   "search_course_content"   '{"query":"react memo"}' (JSON string)
      
      const parsedArgs = JSON.parse(args);
      // parsedArgs = { query: "react memo" }
      
      // Continue to step 5...
```

---

### Step 5: Call MCP Tool
**Location:** `services/chatAgent.ts` (line 271) → `mcp/mcpClient.ts` (line 115-122)

```typescript
// Still in toolCallHandler (chatAgent.ts line 271):
const mcpResult = await callMCPTool(name, {
  ...parsedArgs,  // { query: "react memo" }
  userId,         // 'dfb04080-c433-4ca1-babd-c696029f2f39'
});

// callMCPTool is in mcp/mcpClient.ts
// It calls the MCP Client class method:
//   toolName =======> "search_course_content"
//   args =======> {
//     query: 'react memo',
//     userId: 'dfb04080-c433-4ca1-babd-c696029f2f39'
//   }

// Inside mcpClient.ts (line 119-122):
// This is the fifth step - calling the MCP library function
const result = await client.callTool({
  name,        // "search_course_content"
  arguments: args,  // { query: "react memo", userId: "..." }
});
// client.callTool() is from the MCP library (@modelcontextprotocol/sdk)
// This sends the tool call to the MCP Server via stdio
// The MCP Server processes the request and returns results
```

---

### Step 6: Receive MCP Results
**Location:** `mcp/mcpClient.ts` (returns result) → `services/chatAgent.ts` (line 301)

```typescript
// After MCP Server processes the request, result is returned to mcpClient.ts:
// This is the MCP tool result structure:

result ------> {
  content: [
    {
      type: 'text',
      text: '{\n' +
        '  "results": [\n' +
        '    {\n' +
        '      "chunkId": "ccf35080-f606-4668-943d-a6db12098d6e",\n' +
        '      "courseId": "245ccbc4-daa0-42a6-8ac0-b3462c2985c5",\n' +
        '      "course": "Introduction to Web Development",\n' +
        '      "moduleId": "5902aa04-2d32-4abf-bdfd-2dce6d537ba2",\n' +
        '      "module": "JavaScript Fundamentals",\n' +
        '      "lessonId": "f642d759-cb83-47fa-beae-e366174e8db5",\n' +
        '      "lesson": "Variables and Data Types",\n' +
        '      "chunk": "JavaScript variables store data values and can be declared using let, const, or var. Modern JavaScript prefers let and const over var due to block scoping. const is used for values that won't be reassigned, while let allows reassignment.",\n' +
        '      "chunkIndex": 0,\n' +
        '      "similarity": 0.891119122505188\n' +
        '    },\n' +
        '    // ... more results ...\n' +
        '  ],\n' +
        '  "count": 3\n' +
        '}'
    }
  ]
}

// Back in toolCallHandler (chatAgent.ts line 301):
const resultData = JSON.parse(mcpResult.content[0].text);

// Results are then:
// 1. Parsed into SearchResult[] format
// 2. Added to allSearchResults array (for sources tracking)
// 3. Returned as JSON string to OpenAI
// 4. Added to messages array with role: 'tool'
// 5. OpenAI uses these results to generate final answer
```

---

### Step 7: Final Answer Generation
**Location:** `services/openAIChat.ts` (lines 110-141)

```typescript
// After tool results are returned (openAIChat.ts lines 110-121):
// The assistant's tool call message is added to conversation
messages.push(message as ChatCompletionMessageParam);

// Each tool result is added as a 'tool' role message
for (let i = 0; i < message.tool_calls.length; i++) {
  const toolCall = message.tool_calls[i];
  const result = toolResults[i];
  
  messages.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content: typeof result === 'string' ? result : JSON.stringify(result),
    // content contains the search results JSON string
  });
}

// OpenAI is called AGAIN with the tool results (line 123-129):
response = await client.chat.completions.create({
  model: OPENAI_MODEL,  // 'gpt-4o-mini'
  temperature,
  messages,  // Now includes: system, user, assistant (tool call), tool (results)
  tools: tools,
  tool_choice: 'auto',
});

message = response.choices[0].message;

// Extract the final answer (line 136-141):
const answer = message.content?.trim();
// Example answer: "Flexbox is a one-dimensional layout model in CSS that is perfect for aligning items in rows or columns. It provides various properties such as `flex-direction`, `justify-content`, `align-items`, `flex-wrap`, and `flex-grow/shrink/basis` to control the behavior of items within a container. Flexbox is particularly useful for..."

// Return answer to chatAgent
return answer;

// Final answer is returned to chatAgent.chatWithAgent()
// chatAgent formats response with sources and returns to controller
// Controller sends to frontend as: { answer: "...", sources: [...] }
```

---

## Execution Timeline Summary

```
1. Browser → POST /api/chat/ask
   Request: { question: "what is react memo?", conversationHistory: [...] }
   ↓
2. Controller (chatController.ts) → chatWithAgent()
   Extracts: userId, question, conversationHistory
   ↓
3. chatAgent.ts → Classification
   classifyQuestion() determines if needsSearch = true/false
   ↓
4. chatAgent.ts → generateOpenAIAnswer() called
   Passes: messages, tools, toolCallHandler
   ↓
5. openAIChat.ts → First OpenAI API call
   requestOptions with: model, temperature, messages, tools, tool_choice
   ↓
6. OpenAI Response → tool_calls generated
   message.tool_calls = [{ function: { name: "search_course_content", arguments: '{"query":"react memo"}' } }]
   ↓
7. openAIChat.ts → toolCallHandler executed
   Passes tool_calls array to handler
   ↓
8. chatAgent.ts → toolCallHandler extracts arguments
   const { name, arguments: args } = toolCall.function
   parsedArgs = { query: "react memo" }
   ↓
9. chatAgent.ts → callMCPTool()
   Args: { query: "react memo", userId: "..." }
   ↓
10. mcpClient.ts → client.callTool()
    MCP library sends tool call to MCP Server via stdio
    ↓
11. MCP Server → Executes search_course_content tool
    Database query → vector similarity search
    ↓
12. MCP Server → Returns results
    result.content[0].text = JSON.stringify({ results: [...], count: 3 })
    ↓
13. mcpClient.ts → Returns mcpResult to toolCallHandler
    ↓
14. chatAgent.ts → Parses results, adds to allSearchResults
    Returns JSON string to toolCallHandler
    ↓
15. openAIChat.ts → Adds tool results to messages array
    messages.push({ role: 'tool', tool_call_id: ..., content: toolResults })
    ↓
16. openAIChat.ts → Second OpenAI API call
    OpenAI generates final answer using search results
    ↓
17. openAIChat.ts → Extract answer
    answer = message.content?.trim()
    Returns to chatAgent
    ↓
18. chatAgent.ts → Formats response
    { answer: "...", sources: [...] }
    ↓
19. Controller → Returns to frontend
    ↓
20. Browser → Displays answer and sources
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
