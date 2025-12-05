import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Settings } from '../models/Settings';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, name обязательны' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email уже зарегистрирован' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name });

    await Profile.create({
      userId: user._id,
      name,
      height: 175,
      weight: 75,
      age: 28,
      gender: 'male',
      goal: 'lose_weight',
      activityLevel: 'active',
      dailyCalorieGoal: 2200,
      dailyStepGoal: 10000,
    });

    await Settings.create({ userId: user._id });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '30d',
    });

    res.json({ token, user: { id: user._id, email, name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Неверный логин или пароль' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Неверный логин или пароль' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '30d',
    });

    res.json({ token, user: { id: user._id, email, name: user.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});