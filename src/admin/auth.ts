import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/setup.js';
import { env } from '../config.js';

const SALT_ROUNDS = 10;

interface AdminUser {
  readonly id: number;
  readonly username: string;
  readonly password_hash: string;
}

interface JwtPayload {
  readonly userId: number;
  readonly username: string;
}

export async function createAdminUser(username: string, password: string): Promise<void> {
  const db = getDb();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  db.prepare('INSERT OR REPLACE INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username e password richiesti' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as AdminUser | undefined;
  if (!user) {
    res.status(401).json({ error: 'Credenziali non valide' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Credenziali non valide' });
    return;
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, env.jwtSecret, {
    expiresIn: '24h',
  });

  // Set HttpOnly cookie for server-side page protection
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24h
    path: '/admin',
  });

  res.json({ token, username: user.username });
}

/** Middleware to protect admin HTML pages via cookie */
export function pageAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_session;
  if (!token) {
    res.redirect('/admin/');
    return;
  }

  try {
    jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    // Clear invalid cookie and redirect to login
    res.clearCookie('admin_session', { path: '/admin' });
    res.redirect('/admin/');
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  res.clearCookie('admin_session', { path: '/admin' });
  res.json({ success: true });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token mancante' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    (req as Request & { user: JwtPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}
