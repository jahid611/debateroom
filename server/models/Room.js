const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    ownerEmail: { type: String }, // <--- NOUVEAU : Le chef du débat
    game: { type: String, default: "autre" },
    videoUrl: { type: String, default: "" },
    videoTitle: { type: String, default: "" },
    videoPlatform: { type: String, default: "" },
    votes: {
        valid: [{ type: String }],
        inting: [{ type: String }]
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);