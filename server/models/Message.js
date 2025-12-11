const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true }, // INDISPENSABLE pour lier le msg au débat
    username: { type: String, required: true },
    avatar: { type: String },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);