const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: false, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },

  pseudo: { type: String },
  name: { type: String },
  bio: { type: String, default: "" },
  age: { type: Number },
  avatar: { type: String, default: "https://cdn-icons-png.flaticon.com/512/847/847969.png" },

  // NOUVEAU : Le Score de Juge
  elo: { type: Number, default: 1000 },
  combo: { type: Number, default: 0 },

  games: [String],
  details: { type: Object },

  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('User', UserSchema);