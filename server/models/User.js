const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // Google ID n'est plus obligatoire (required: false)
    googleId: { type: String, required: false },
    
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false }, // Nouveau champ pour le mode manuel
    
    pseudo: { type: String },
    name: { type: String },
    age: { type: Number },
    avatar: { type: String, default: "https://cdn-icons-png.flaticon.com/512/847/847969.png" }, // Avatar par défaut
    
    games: [String],
    details: { type: Object },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);