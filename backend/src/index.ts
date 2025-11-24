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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

initializeRealtime(server);

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Course Knowledge System API" });
});


app.use("/api/auth", authRoutes);

// Protected routes - require authentication
app.use("/api/courses", authenticate, coursesRoutes);
app.use("/api/enrollments", authenticate, enrollmentsRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);
app.use("/api/chat", authenticate, chatRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

