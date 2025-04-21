const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Message = require('../models/Message');

const genAI = new GoogleGenerativeAI(process.env.GEMINIAI_API_KEY);

exports.handleChat = async (req, res) => {
  const { message, systemPrompt, mode, userId } = req.body;

  if (!message || !systemPrompt || !mode || !userId) {
    return res.status(400).json({ error: 'Сообщение, системный промпт, режим и userId обязательны' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `${systemPrompt}\n\nПользователь: ${message}`;
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text().trim();

    // Сохранение пользовательского сообщения
    await Message.create({
      userId,
      text: message,
      isUser: true,
      mode,
      tags: ['Пользователь'],
    });

    // Сохранение ответа ИИ
    const aiMessage = await Message.create({
      userId,
      text: aiResponse,
      isUser: false,
      mode,
      tags: getRandomTags(),
    });

    res.status(200).json({ message: aiResponse, messageId: aiMessage._id });
  } catch (error) {
    console.error('Ошибка Gemini API:', error);
    if (error.status === 429) {
      return res.status(429).json({ error: 'Превышен лимит запросов. Попробуйте позже.' });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Неверный API-ключ Gemini.' });
    }
    res.status(500).json({ error: 'Ошибка обработки запроса. Попробуйте снова.' });
  }
};

exports.getMessages = async (req, res) => {
  const { userId } = req.params;

  try {
    const messages = await Message.find({ userId })
      .sort({ timestamp: 1 })
      .lean();
    res.status(200).json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Не удалось загрузить историю чата.' });
  }
};

const getRandomTags = () => {
  const allTags = ['ИИ', 'Дизайн', 'Код', 'UX/UI', 'Инновации', 'Технологии', 'Совет', 'Объяснение'];
  const numTags = Math.floor(Math.random() * 2) + 1;
  const shuffled = [...allTags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numTags);
};