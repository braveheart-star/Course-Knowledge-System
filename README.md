# Course Knowledge System

A secure course knowledge system with RAG (Retrieval-Augmented Generation) capabilities.

https://github.com/user-attachments/assets/75e6ba2f-d3c6-479c-a372-f19008f5448a

## Getting Started

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment
- Create `frontend/.env` and copy the contents from `frontend/.env.example`
- Create `backend/.env` and copy the contents from `backend/.env.example`.  Make sure to add your own OpenAI API key (you can keep the other environment values as they are)

### 3. Start Servers
```bash
npm run dev
```
Backend: `http://localhost:8000`  
Frontend: `http://localhost:3000`

### 4. Database Setup (Optional if you’re using the same values from the `.env.example` file)
**Create Tables:**
```bash
cd backend
npm run db:create-tables
```

**Seed Database:**
```bash
npm run db:seed
```

### 5. Process Course Content (Optional if you’re using the same values from the `.env.example` file)

**Chunk Lessons:**
```bash
# Chunk all lessons
npm run chunk:lessons

# Chunk specific lesson
npm run chunk:lesson <lessonId>
```

**Embed Chunks:**
```bash
# Embed all unembedded chunks
npm run embed:lessons

# Embed specific lesson
npm run embed:lesson <lessonId>
```

### 6. Deploy Supabase Functions

**Login to Supabase:**
```bash
npm run supabase:login
```

**Link Project:**
```bash
npm run supabase:link
```

**Deploy Embed Function:**
```bash
npm run supabase:functions:deploy
```

## Core Features & Implementation

### 1. Authentication & Authorization
- **Email + Password Authentication**: Secure login with password hashing (bcrypt)
- **JWT Tokens**: Stateless authentication with token-based access control
- **Role-based Access Control**: 
  - Admin role: Emails starting with `admin_` (e.g., `admin_01@gmail.com`)
  - User role: All other emails
- **Protected Routes**: Both frontend and backend validate JWT tokens for all protected endpoints

### 2. Course Enrollment System
- **User Enrollment Requests**: Users can request enrollment in available courses
- **Admin Enrollment Management**: Admins can directly enroll users or approve/reject requests
- **Real-time Notifications**: WebSocket-based instant updates for enrollment status changes
- **Enrollment Status**: Tracks pending, confirmed, and rejected enrollment states

### 3. Content Structure & Management
- **Hierarchical Organization**: Courses → Modules → Lessons
- **Content Chunking**: Lesson content automatically split into semantic chunks for optimal retrieval
- **Vector Embeddings**: 
  - Chunks converted to 384-dimensional vectors using gte-small model
  - Embeddings generated via Supabase Edge Functions
  - Stored in PostgreSQL using pgvector extension
- **Access Control**: Strict enforcement - users can only access content from courses they are enrolled in

### 4. Custom MCP Server Implementation
- **Protocol**: Custom MCP server built using MCP SDK (no framework-specific black box)
- **Server Architecture**: Standalone server process communicating via stdio transport
- **Exposed Tools**:
  - `search_course_content`: Semantic search tool for finding relevant course content
  - `read_lesson_content`: Tool to retrieve full lesson content with access verification
- **MCP Client**: Manages connection lifecycle, handles tool calls and structured responses
- **Communication Flow**: Chat Agent → MCP Client → MCP Server → RAG Service → Database
- **Error Handling**: Structured error responses following MCP protocol standards
- **Connection Management**: Singleton client manager with automatic reconnection and error recovery

### 5. Chat Agent (MCP Tool-Only Access)
- **Tool-Exclusive Access**: Chat agent answers questions using **only** MCP tools (no direct database access)
- **OpenAI Integration**: GPT-4o-mini with function calling capabilities
- **Autonomous Tool Selection**: AI autonomously decides when to call MCP tools based on question context
- **Question Classification**: Pre-classifies questions to determine if course content search is needed
- **Conversation Management**: Maintains conversation history (last 6 messages) for context-aware responses
- **Answer Generation**: Generates conversational answers using only retrieved course content
- **Source Attribution**: Returns structured response with course/module/lesson sources and similarity scores
- **Fallback Handling**: Provides appropriate responses when search results are empty or irrelevant

### 6. RAG (Retrieval-Augmented Generation) Pipeline
- **Query Processing**: User question converted to 384-dimensional vector using gte-small embedding model
- **Enrollment Verification**: Strict access control - only searches within courses user is enrolled in (status: 'confirmed')
- **Semantic Similarity Search**: 
  - Uses pgvector cosine similarity operator (`<=>`) for efficient vector search
  - Default similarity threshold: 0.85 (configurable)
  - Configurable result limit (default: 5 results)
  - Optional course-specific filtering
- **Result Processing**: Returns chunks with full course/module/lesson hierarchy and similarity scores
- **Access Control**: Verifies enrollment before returning any lesson content
- **Database Integration**: Direct SQL queries with pgvector operators for optimal performance

### 7. Real-time Communication
- **WebSocket**: Socket.IO for real-time bidirectional communication
- **Events**: Enrollment requests, approvals, rejections broadcasted instantly
- **UI Updates**: Frontend automatically updates without page refresh
