const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);
const ytDlpWrap = new YtDlpWrap(execPath);

// --- ROUTE RESOLVE ---
router.get('/resolve', async (req, res) => {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    try {
        // 1. TIKTOK (Gestion Spéciale)
        if (url.includes('tiktok.com')) {
            console.log("🎵 TikTok détecté :", url);

            // A. Si c'est un lien court (vm.tiktok / vt.tiktok), on doit trouver la vraie URL
            if (url.includes('/t/') || url.includes('vm.tiktok') || url.includes('vt.tiktok')) {
                const response = await fetch(url, { redirect: 'follow' });
                url = response.url; // On récupère l'URL finale après redirection
                console.log("🔗 Lien déplié :", url);
            }

            // B. On extrait l'ID de la vidéo (c'est le chiffre après /video/)
            const idMatch = url.match(/video\/(\d+)/);
            if (idMatch && idMatch[1]) {
                const videoId = idMatch[1];
                // On renvoie le lecteur Embed officiel
                return res.json({
                    src: `https://www.tiktok.com/embed/v2/${videoId}`,
                    type: 'tiktok',
                    originalUrl: url
                });
            }
        }

        // 2. YOUTUBE (Embed Officiel)
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const ytMatch = url.match(ytRegex);
        if (ytMatch) {
            const videoId = ytMatch[1];
            return res.json({ 
                src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`, 
                type: 'youtube',
                originalUrl: url 
            });
        }

        // 3. FICHIERS DIRECTS (Uploads, CDN...)
        if (url.includes('.mp4') || url.includes('webapp-prime') || url.includes('googlevideo.com')) {
            return res.json({ src: url, type: 'file' });
        }

        // 4. AUTRES (Outplayed, Twitch...) -> On tente yt-dlp
        let directUrl = await ytDlpWrap.execPromise([url, '-g', '-f', 'best[ext=mp4]/best']);
        let finalUrl = directUrl.split('\n')[0].trim();
        if (!finalUrl) throw new Error("Lien vide");
        
        res.json({ src: finalUrl, type: 'file' });

    } catch (error) {
        console.error("Erreur Resolve:", error.message);
        res.status(500).json({ error: "Impossible de lire ce lien. Le serveur a été bloqué par la plateforme." });
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
        res.status(500).json({ error: "Erreur Cloudinary" });
    }
});

module.exports = router;