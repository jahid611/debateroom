const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    game: { type: String, default: "autre" }, // <--- NOUVEAU (ex: 'lol', 'valorant')
    videoUrl: { type: String, default: "" },
    videoTitle: { type: String, default: "" },
    votes: {
        valid: [{ type: String }],
        inting: [{ type: String }]
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);