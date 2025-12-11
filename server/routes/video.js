const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// --- CONFIGURATION CLOUDINARY ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- CONFIGURATION MULTER (Stockage temporaire) ---
const upload = multer({ dest: 'uploads/' });

// --- CONFIGURATION YT-DLP ---
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);
const ytDlpWrap = new YtDlpWrap(execPath);

// 1. ROUTE POUR LIENS (YouTube, TikTok...)
router.get('/resolve', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    // Lien direct TikTok/MP4
    if (url.includes('.mp4') || url.includes('webapp-prime') || url.includes('googlevideo.com')) {
        return res.json({ src: url, type: 'file' });
    }

    try {
        let directUrl = await ytDlpWrap.execPromise([
            url, '-g', '-f', 'best[ext=mp4]/best'
        ]);
        let finalUrl = directUrl.split('\n')[0].trim();
        if (!finalUrl) throw new Error("Lien vide");
        res.json({ src: finalUrl, type: 'file' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Impossible de lire le lien." });
    }
});

// 2. ROUTE POUR UPLOAD FICHIER (Nouveau !)
router.post('/upload', upload.single('videoFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });

        // Envoi vers Cloudinary (Vidéo)
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "video",
            folder: "debateroom",
        });

        // Supprimer le fichier temporaire du serveur pour ne pas le saturer
        fs.unlinkSync(req.file.path);

        // Renvoie l'URL sécurisée de Cloudinary
        res.json({ src: result.secure_url });

    } catch (error) {
        console.error("Erreur Upload:", error);
        res.status(500).json({ error: "Erreur lors de l'upload vers le cloud" });
    }
});

module.exports = router;