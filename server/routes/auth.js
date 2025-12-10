// Fichier: server/routes/auth.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User'); // On remonte d'un cran pour aller dans models

// On initialise le client Google (Pas besoin de mettre l'ID ici si on vérifie juste le token générique, mais c'est mieux de le mettre dans le .env plus tard)
const client = new OAuth2Client();

router.post('/google', async (req, res) => {
    const { token } = req.body;

    try {
        // 1. Vérifier le token auprès de Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            // audience: process.env.GOOGLE_CLIENT_ID, // Optionnel pour l'instant
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // 2. Chercher l'utilisateur dans la DB
        let user = await User.findOne({ email });

        if (!user) {
            // Créer un nouveau user
            user = new User({
                googleId,
                email,
                name,
                avatar: picture,
                games: []
            });
            await user.save();
            return res.json({ isNewUser: true, user });
        }

        // User existant
        res.json({ isNewUser: false, user });

    } catch (error) {
        console.error("Erreur Auth Google:", error);
        res.status(401).json({ error: "Token invalide" });
    }
});

// Route pour sauvegarder le profil complet depuis start.html
router.post('/onboarding', async (req, res) => {
    try {
        const { email, googleId, pseudo, prenom, nom, age, games, details, avatar } = req.body;

        // On met à jour l'utilisateur s'il existe, ou on le crée
        // option { upsert: true } signifie "crée si n'existe pas"
        const user = await User.findOneAndUpdate(
            { email: email }, 
            { 
                googleId,
                email,
                pseudo, // Le pseudo choisi par le joueur
                name: `${prenom} ${nom}`, // Nom complet
                age,
                games,
                details,
                avatar
            },
            { new: true, upsert: true }
        );

        res.json({ success: true, user });
    } catch (error) {
        console.error("Erreur Onboarding:", error);
        res.status(500).json({ error: "Erreur lors de la sauvegarde du profil" });
    }
});

module.exports = router;