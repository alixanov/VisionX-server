const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res, next) => {
  const { firstName, lastName, email, username, password } = req.body;

  try {
    // Валидация входных данных
    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Неверный формат email' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Имя пользователя должно содержать минимум 3 символа' });
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
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
};

exports.login = async (req, res, next) => {
  const { email, username, password } = req.body;

  try {
    // Валидация входных данных
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
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Токен отсутствует' });
    }

    // Верификация токена
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
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истек. Пожалуйста, войдите снова.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Неверный токен' });
    }
    res.status(500).json({ error: 'Ошибка сервера при получении данных пользователя' });
  }
};