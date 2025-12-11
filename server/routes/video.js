const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' });
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);
const ytDlpWrap = new YtDlpWrap(execPath);

// --- ROUTE RESOLVE (Liens) ---
router.get('/resolve', async (req, res) => {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    try {
        // TikTok
        if (url.includes('tiktok.com')) {
            if (url.includes('/t/') || url.includes('vm.tiktok') || url.includes('vt.tiktok')) {
                const response = await fetch(url, { redirect: 'follow' });
                url = response.url;
            }
            const idMatch = url.match(/video\/(\d+)/);
            if (idMatch && idMatch[1]) {
                return res.json({ src: `https://www.tiktok.com/embed/v2/${idMatch[1]}`, type: 'tiktok' });
            }
        }
        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const ytMatch = url.match(ytRegex);
            if (ytMatch) return res.json({ src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytMatch[1]}`, type: 'youtube' });
        }
        // Fichier Direct
        if (url.includes('.mp4')) return res.json({ src: url, type: 'file' });

        // Fallback yt-dlp
        let directUrl = await ytDlpWrap.execPromise([url, '-g', '-f', 'best[ext=mp4]/best']);
        res.json({ src: directUrl.split('\n')[0].trim(), type: 'file' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lien non supporté" });
    }
});

// --- ROUTE UPLOAD (IMAGES ET VIDÉOS) ---
router.post('/upload', upload.single('videoFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });
        
        console.log("📤 Envoi vers Cloudinary...", req.file.mimetype);

        // LE FIX EST ICI : resource_type: "auto"
        // Cela permet d'envoyer des PNG/JPG (Avatar) OU des MP4 (Débat)
        const result = await cloudinary.uploader.upload(req.file.path, { 
            resource_type: "auto", 
            folder: "debateroom" 
        });

        fs.unlinkSync(req.file.path); // Nettoyage
        console.log("✅ Succès :", result.secure_url);
        
        res.json({ src: result.secure_url, type: result.resource_type });

    } catch (error) {
        console.error("❌ Erreur Cloudinary :", error);
        res.status(500).json({ error: "Erreur lors de l'upload (Vérifiez vos clés Cloudinary)" });
    }
});

module.exports = router;