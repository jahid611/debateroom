const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  userEmail: { type: String, required: true },
  avatar: { type: String },

  // Badges du joueur
  games: [String],
  details: { type: Object },

  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  likes: [{ type: String }], // Array d'emails des users qui ont like
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  replyToUsername: { type: String, default: null }, // Username du message parent pour affichage rapide
  replyToText: { type: String, default: null }, // Texte du message parent (tronque) pour affichage rapide
})

module.exports = mongoose.model("Message", MessageSchema)
