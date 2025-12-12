const express = require("express")
const router = express.Router()
const User = require("../models/User") // Assuming User model is imported here

// MISE À JOUR PROFIL COMPLETE (AVEC LOGS)
router.put("/update", async (req, res) => {
  console.log("📝 Update demandé pour :", req.body.email)

  try {
    const { email, prenom, nom, pseudo, bio, avatar, games, details, newPassword, currentPassword } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" })

    // 1. Mise à jour de l'AVATAR (L'URL Cloudinary arrive ici)
    if (avatar) {
      console.log("📸 Nouvel avatar sauvegardé :", avatar)
      user.avatar = avatar
    }

    // 2. Autres infos
    if (pseudo) user.pseudo = pseudo
    if (bio !== undefined) user.bio = bio
    if (prenom && nom) user.name = `${prenom} ${nom}`
    if (games) user.games = games
    if (details) user.details = details

    // 3. Password
    if (newPassword) {
      if (user.password && user.password !== currentPassword) {
        return res.status(403).json({ error: "Mot de passe actuel incorrect" })
      }
      user.password = newPassword
    }

    await user.save() // C'EST ICI QUE ÇA PART DANS MONGO

    const userObj = user.toObject()
    delete userObj.password
    res.json({ success: true, user: userObj })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

// RÉCUPÉRER UN PROFIL UTILISATEUR PAR EMAIL
router.get("/profile", async (req, res) => {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ error: "Email requis" })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" })
    }

    // Ne pas renvoyer le mot de passe
    const userProfile = {
      email: user.email,
      pseudo: user.pseudo,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      age: user.age,
      elo: user.elo,
      games: user.games,
      details: user.details,
      createdAt: user.createdAt,
    }

    res.json(userProfile)
  } catch (error) {
    console.error("Erreur récupération profil:", error)
    res.status(500).json({ error: "Erreur serveur" })
  }
})

module.exports = router
