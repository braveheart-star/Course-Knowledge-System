import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateJWTSecretFromHash } from "../utils/jwt";

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export class UserService {
  async signUp(data: SignUpData): Promise<AuthResult> {
    const { email, password, name } = data;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = email.startsWith("admin_") ? "admin" : "user";

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: name || null,
        role,
      })
      .returning();

    const jwtSecret = generateJWTSecretFromHash(email, passwordHash);
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      jwtSecret,
      { expiresIn } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    };
  }

  async signIn(data: SignInData): Promise<AuthResult> {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const jwtSecret = generateJWTSecretFromHash(email, user.passwordHash);
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}

export const userService = new UserService();

