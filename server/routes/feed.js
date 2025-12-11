const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Room = require('../models/Room');

router.get('/foryou', async (req, res) => {
    const { email } = req.query;
    try {
        // ... (votre logique de recherche)
        // Pour tester vite fait, renvoie tout :
        const rooms = await Room.find().limit(20);
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;