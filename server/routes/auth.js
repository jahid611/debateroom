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

// MISE À JOUR PROFIL
// MISE À JOUR PROFIL COMPLETE (AVEC LOGS)
router.put('/update', async (req, res) => {
    console.log("---- [API/AUTH/UPDATE] REQUÊTE REÇUE ----");
    console.log("Body reçu :", JSON.stringify(req.body, null, 2)); // LOG DES DONNÉES REÇUES

    try {
        const { email, prenom, nom, pseudo, bio, avatar, games, details, currentPassword, newPassword } = req.body;
        
        let user = await User.findOne({ email });
        if (!user) {
            console.log("❌ Utilisateur introuvable pour l'email :", email);
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        console.log("Utilisateur trouvé :", user.email);
        console.log("Ancien Avatar :", user.avatar);

        // 1. Mise à jour Identité
        if (pseudo) user.pseudo = pseudo;
        if (bio !== undefined) user.bio = bio;
        if (avatar) {
            console.log("📸 Changement d'Avatar demandé :", avatar);
            user.avatar = avatar;
        }
        
        if (prenom && nom) {
            user.name = `${prenom} ${nom}`;
        }

        // 2. Mise à jour Jeux & Rangs
        if (games) user.games = games;
        if (details) user.details = details;

        // 3. Changement Mot de passe
        if (newPassword) {
            if (user.password && user.password !== currentPassword) {
                return res.status(403).json({ error: "Mot de passe actuel incorrect" });
            }
            user.password = newPassword;
        }

        await user.save();
        console.log("✅ Profil sauvegardé en DB !");
        console.log("Nouvel Avatar en DB :", user.avatar);
        
        const userObj = user.toObject();
        delete userObj.password;
        
        res.json({ success: true, user: userObj });

    } catch (error) {
        console.error("❌ Erreur Serveur lors de l'update :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;