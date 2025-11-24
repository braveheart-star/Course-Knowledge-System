import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateJWTSecretFromHash } from './jwt';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export async function verifyAuthToken(token: string): Promise<AuthPayload> {
  if (!token) {
    throw new Error('Token is required');
  }

  const decoded = jwt.decode(token) as AuthPayload | null;

  if (!decoded || !decoded.email) {
    throw new Error('Invalid token');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, decoded.email))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const jwtSecret = generateJWTSecretFromHash(user.email, user.passwordHash);
  const verified = jwt.verify(token, jwtSecret) as AuthPayload;

  if (
    !verified ||
    verified.userId !== user.id ||
    verified.email !== user.email
  ) {
    throw new Error('Invalid token');
  }

  return verified;
}

