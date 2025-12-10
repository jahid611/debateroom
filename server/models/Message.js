const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: { type: String, default: 'general' }, // Pour séparer les débats plus tard
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String, // On copie le pseudo pour aller vite (cache)
    avatar: String,
    text: String,
    reactions: { type: Map, of: Number }, // Pour les emojis 🔥
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);