const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { 
        type: String, 
        required: false, 
        unique: true, 
        sparse: true // <--- C'EST LA CLÉ MAGIQUE ! (Ignore les nulls)
    },
    
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    
    pseudo: { type: String },
    name: { type: String },
    age: { type: Number },
    avatar: { type: String, default: "https://cdn-icons-png.flaticon.com/512/847/847969.png" },
    
    games: [String],
    details: { type: Object },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);