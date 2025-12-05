import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId?: string;
}

export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет токена' });

  const [, token] = header.split(' ');
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || '');
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный токен' });
  }
};
