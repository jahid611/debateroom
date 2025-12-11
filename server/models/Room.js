const mongoose = require("mongoose")

const RoomSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  ownerEmail: { type: String },
  game: { type: String, default: "autre" },
  videoUrl: { type: String, default: "" },
  videoTitle: { type: String, default: "Nouveau Debat" },
  videoDescription: { type: String, default: "" },
  videoPlatform: { type: String, default: "" },
  votes: {
    valid: [{ type: String }],
    inting: [{ type: String }],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model("Room", RoomSchema)
