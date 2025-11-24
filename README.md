# Course Knowledge System

A secure course knowledge system with RAG (Retrieval-Augmented Generation) capabilities.

## Getting Started

1. Install dependencies:
```bash
# Install dependencies
npm run install:all

# Start servers
npm run dev
```

2. Configure backend environment:
   - Create `.env` file and copy the content of `.env.example` file.

Backend: `http://localhost:8000`  
Frontend: `http://localhost:3000`

## System Workflow

### 1. Authentication
- **Sign Up/Login**: Email + password authentication with JWT tokens
- **Role-based Access**: Emails starting with `admin_` → admin role (admin_01@gmail.com), others → user role
- **Protected Routes**: Frontend and backend validate JWT tokens for access control

### 2. Course Enrollment
- **User Request**: Users request enrollment in courses
- **Admin Approval**: Admins approve/reject enrollment requests
- **Real-time Updates**: WebSocket notifications for instant status updates

### 3. Content Management
- **Content Structure**: Courses → Modules → Lessons
- **Chunking**: Lesson content automatically split into semantic chunks
- **Vector Embeddings**: Chunks converted to embeddings (gte-small, 384 dimensions) via Supabase
- **Storage**: Embeddings stored in PostgreSQL with pgvector extension
- **Access Control**: Users can only access enrolled course content

### 4. Chat Agent & RAG Pipeline
- **Question Processing**: User asks question → Chat agent receives request
- **AI Tool Calling**: OpenAI decides when to use MCP tools (search/read content)
- **Semantic Search**: Query embedded → Vector search in enrolled courses using pgvector
- **Answer Generation**: AI generates conversational answer from retrieved content
- **Source Attribution**: Response includes course/module/lesson sources

### 5. Real-time Communication
- **WebSocket**: Socket.IO for real-time bidirectional communication
- **Events**: Enrollment requests, approvals, rejections broadcasted instantly
- **UI Updates**: Frontend automatically updates without page refresh