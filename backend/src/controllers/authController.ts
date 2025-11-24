import { Request, Response } from "express";
import { userService } from "../services/userService";

export class AuthController {
  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      const result = await userService.signUp({ email, password, name });

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Signup error:", error);

      // Check for database connection errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        res.status(503).json({
          error: "Database connection failed. Please try again later or contact support."
        });
        return;
      }

      // Handle business logic errors
      if (error.message === "Email and password are required") {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error.message === "User already exists") {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await userService.signIn({ email, password });

      res.json(result);
    } catch (error: any) {
      console.error("Signin error:", error);

      // Check for database connection errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        res.status(503).json({
          error: "Database connection failed. Please try again later or contact support."
        });
        return;
      }

      // Handle business logic errors
      if (error.message === "Email and password are required") {
        res.status(400).json({ error: error.message });
        return;
      }

      if (error.message === "Invalid credentials") {
        res.status(401).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const authController = new AuthController();

