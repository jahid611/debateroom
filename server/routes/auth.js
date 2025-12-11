const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();

// 1. ROUTE CONNEXION MANUELLE (Email/Password)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Vérif simple (En prod, utilise bcrypt pour le hash)
        const user = await User.findOne({ email, password });

        if (!user) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect." });
        }

        // Vérifie si le profil est complet (a-t-il choisi des jeux ?)
        const isProfileComplete = user.games && user.games.length > 0;

        res.json({ 
            success: true, 
            user, 
            redirect: isProfileComplete ? 'index.html' : 'onboarding.html' 
        });

    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// 2. ROUTE GOOGLE LOGIN (Vérification intelligente)
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        // Vérif Google
        // const ticket = await client.verifyIdToken({ idToken: token, audience: "TON_CLIENT_ID..." });
        // const payload = ticket.getPayload();
        
        // Pour faire simple et compatible avec ton front actuel qui décode déjà :
        // On suppose que le front envoie l'email décodé ou le token brut. 
        // Ici on va faire confiance à l'email envoyé dans le body pour l'exemple (à sécuriser plus tard)
        const email = req.body.email; 
        
        let user = await User.findOne({ email });
        
        if (user) {
            // Utilisateur existant -> On regarde si son profil est fini
            const isProfileComplete = user.games && user.games.length > 0;
            return res.json({ 
                success: true, 
                user, 
                redirect: isProfileComplete ? 'index.html' : 'onboarding.html' 
            });
        } else {
            // Nouvel utilisateur -> Onboarding obligatoire
            return res.json({ 
                success: true, 
                user: null, 
                redirect: 'onboarding.html' 
            });
        }

    } catch (error) {
        res.status(500).json({ error: "Erreur Google Auth" });
    }
});

// 3. ROUTE ONBOARDING (Sauvegarde finale)
router.post('/onboarding', async (req, res) => {
    try {
        const { email, googleId, password, pseudo, prenom, nom, age, games, details, avatar } = req.body;

        // 1. D'abord, on cherche si un user existe déjà avec cet EMAIL
        let userByEmail = await User.findOne({ email: email });
        
        // 2. Si on a un googleId, on vérifie s'il est déjà pris par QUELQU'UN D'AUTRE
        if (googleId) {
            const userByGoogle = await User.findOne({ googleId: googleId });
            
            // Si l'ID Google existe déjà sur un AUTRE compte que celui de l'email actuel -> Conflit
            if (userByGoogle && (!userByEmail || userByGoogle._id.toString() !== userByEmail._id.toString())) {
                // On fusionne : on décide que c'est le compte Google qui prime
                userByEmail = userByGoogle; 
            }
        }

        const userData = {
            email, pseudo, name: `${prenom} ${nom}`, age, games, details,
            avatar: avatar || "https://cdn-icons-png.flaticon.com/512/847/847969.png"
        };
        
        if (googleId) userData.googleId = googleId;
        if (password) userData.password = password;

        let finalUser;

        if (userByEmail) {
            // MISE À JOUR (Update)
            finalUser = await User.findByIdAndUpdate(userByEmail._id, userData, { new: true });
        } else {
            // CRÉATION (Create)
            finalUser = new User(userData);
            await finalUser.save();
        }

        res.json({ success: true, user: finalUser, redirect: 'index.html' });

    } catch (error) {
        console.error("Erreur Onboarding:", error);
        
        // Gestion spécifique de l'erreur "Duplicate Key"
        if (error.code === 11000) {
            return res.status(400).json({ error: "Cet utilisateur (Email ou Google ID) existe déjà." });
        }
        
        res.status(500).json({ error: "Erreur lors de la sauvegarde." });
    }
});

module.exports = router;