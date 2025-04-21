const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  isUser: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
  tags: { type: [String], default: [] },
  isPinned: { type: Boolean, default: false },
  mode: { type: String, enum: ['assistant', 'coder', 'designer', 'innovator'], required: true },
});

module.exports = mongoose.model('Message', messageSchema);