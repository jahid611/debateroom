const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    userEmail: { type: String, required: true },
    avatar: { type: String },
    
    // NOUVEAUX CHAMPS : Les badges du joueur
    games: [String],        // ex: ['lol', 'valorant']
    details: { type: Object }, // ex: { lol: { rank: 'Gold' } }
    
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);