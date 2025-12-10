const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String },
    pseudo: { type: String }, // Sera rempli à l'onboarding
    avatar: { type: String },
    games: [String], // ['lol', 'valorant']
    details: { type: Object }, // { lol: { rank: 'Gold', role: 'Top' } }
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);