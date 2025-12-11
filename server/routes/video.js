const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');

// Configuration du binaire
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);
const ytDlpWrap = new YtDlpWrap(execPath);

router.get('/resolve', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    // 1. CAS SPÉCIAL : Si c'est déjà un lien direct TikTok ou MP4 (le lien long que tu as envoyé)
    // On vérifie s'il contient des extensions vidéo ou si c'est un CDN TikTok
    if (url.includes('.mp4') || url.includes('webapp-prime') || url.includes('googlevideo.com')) {
        console.log("⚡ Lien direct détecté, pas de conversion nécessaire.");
        return res.json({ 
            src: url, 
            type: 'file', 
            originalUrl: url 
        });
    }

    // 2. CAS CLASSIQUE : YouTube, Outplayed, Lien de partage TikTok
    try {
        console.log("🛠️ Analyse yt-dlp de :", url);
        
        let directUrl = await ytDlpWrap.execPromise([
            url,
            '-g', // Get URL
            '-f', 'best[ext=mp4]/best' // Force le meilleur MP4
        ]);
        
        // Nettoyage du lien (parfois yt-dlp renvoie 2 lignes)
        let finalUrl = directUrl.split('\n')[0].trim();

        if (!finalUrl) throw new Error("Lien vide retourné");

        res.json({ 
            src: finalUrl, 
            type: 'file', 
            originalUrl: url 
        });

    } catch (error) {
        console.error("❌ Erreur yt-dlp:", error.message);
        res.status(500).json({ error: "Impossible de lire cette vidéo. Essayez un autre lien." });
    }
});

module.exports = router;