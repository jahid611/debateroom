const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    userEmail: { type: String, required: true }, // <--- NOUVEAU : Pour identifier l'auteur
    avatar: { type: String },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);