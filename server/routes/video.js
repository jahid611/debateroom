const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });

// Config yt-dlp
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);
const ytDlpWrap = new YtDlpWrap(execPath);

// --- ROUTE RESOLVE (INTELLIGENTE) ---
router.get('/resolve', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    // 1. DÉTECTION YOUTUBE (On évite yt-dlp car Render est bloqué)
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(ytRegex);

    if (ytMatch) {
        const videoId = ytMatch[1];
        console.log("YouTube détecté, ID:", videoId);
        // On renvoie directement le lien Embed officiel
        return res.json({ 
            src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`, 
            type: 'youtube', // On signale au front que c'est du YT
            originalUrl: url 
        });
    }

    // 2. DÉTECTION DIRECT (TikTok CDN, MP4...)
    if (url.includes('.mp4') || url.includes('webapp-prime') || url.includes('googlevideo.com')) {
        return res.json({ src: url, type: 'file' });
    }

    // 3. AUTRES (Outplayed, Twitch, etc) -> On tente yt-dlp
    try {
        let directUrl = await ytDlpWrap.execPromise([
            url, '-g', '-f', 'best[ext=mp4]/best'
        ]);
        let finalUrl = directUrl.split('\n')[0].trim();
        if (!finalUrl) throw new Error("Lien vide");
        res.json({ src: finalUrl, type: 'file' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Impossible de lire le lien (Blocage ou format inconnu)." });
    }
});

// --- ROUTE UPLOAD ---
router.post('/upload', upload.single('videoFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Aucun fichier" });
        const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "video", folder: "debateroom" });
        fs.unlinkSync(req.file.path);
        res.json({ src: result.secure_url, type: 'file' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur Cloudinary" });
    }
});

module.exports = router;