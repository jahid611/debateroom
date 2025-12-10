const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true }, // ex: "general"
    videoUrl: { type: String, default: "" },
    videoTitle: { type: String, default: "" },
    videoPlatform: { type: String, default: "" },
    
    // NOUVEAU SYSTÈME DE VOTE : On stocke les IDs des gens
    votes: {
        valid: [{ type: String }], // Liste des emails ou IDs qui ont voté Valid
        inting: [{ type: String }] // Liste des emails ou IDs qui ont voté Inting
    },
    
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);