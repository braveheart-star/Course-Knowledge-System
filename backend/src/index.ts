import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import authRoutes from "./routes/auth";
import coursesRoutes from "./routes/courses";
import enrollmentsRoutes from "./routes/enrollments";
import notificationsRoutes from "./routes/notifications";
import chatRoutes from "./routes/chat";
import { authenticate } from "./middleware/auth";
import { initializeRealtime } from "./realtime";
import { getMCPClient } from "./mcp/mcpClient";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

initializeRealtime(server);

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Course Knowledge System API" });
});

app.use("/api/auth", authRoutes);

app.use("/api/courses", authenticate, coursesRoutes);
app.use("/api/enrollments", authenticate, enrollmentsRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);
app.use("/api/chat", authenticate, chatRoutes);

// Initialize MCP client on startup
getMCPClient()
  .connect()
  .then(() => {
    console.log('✓ MCP Client initialized');
  })
  .catch((error) => {
    console.error('✗ Failed to initialize MCP Client:', error);
    console.error('Chat functionality may not work properly');
  });

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  const mcpClient = getMCPClient();
  await mcpClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  const mcpClient = getMCPClient();
  await mcpClient.disconnect();
  process.exit(0);
});

