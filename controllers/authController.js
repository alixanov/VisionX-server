const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res, next) => {
  const { firstName, lastName, email, username, password } = req.body;

  try {
    // Валидация
    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    // Проверка существующих пользователей
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email уже существует', action: 'login' });
      }
      return res.status(400).json({ error: 'Имя пользователя уже существует', action: 'login' });
    }

    // Создание нового пользователя
    const user = new User({ firstName, lastName, email, username, password });
    await user.save();

    // Генерация JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: { firstName, lastName, email, username, createdAt: user.createdAt },
      token,
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, username, password } = req.body;

  try {
    // Валидация
    if (!password || (!email && !username)) {
      return res.status(400).json({ error: 'Email или имя пользователя и пароль обязательны' });
    }

    // Поиск пользователя
    const user = await User.findOne({ $or: [{ email }, { username }] });
    if (!user) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    // Проверка пароля
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    // Генерация JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Вход выполнен успешно',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Токен отсутствует' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.status(200).json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    next(error);
  }
};