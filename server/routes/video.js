const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');

// Configuration du binaire (comme avant)
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);
const ytDlpWrap = new YtDlpWrap(execPath);

router.get('/resolve', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    try {
        console.log("Analyse de :", url);
        
        // OPTIMISATION : On demande le meilleur format MP4 qui a L'IMAGE ET LE SON combinés
        // YouTube sépare souvent les deux, ce qui casse les lecteurs HTML5 standards
        let directUrl = await ytDlpWrap.execPromise([
            url,
            '-g', // Get URL
            '-f', 'best[ext=mp4][acodec!=none][vcodec!=none]/best[ext=mp4]/best' // Force MP4 avec audio
        ]);
        
        // Parfois yt-dlp renvoie deux lignes (une pour la vidéo, une pour l'audio), on prend la première
        let finalUrl = directUrl.split('\n')[0].trim();

        if (!finalUrl) throw new Error("Lien vide retourné par yt-dlp");

        res.json({ 
            src: finalUrl, 
            type: 'file', 
            originalUrl: url 
        });

    } catch (error) {
        console.error("Erreur yt-dlp:", error.message);
        // On renvoie une erreur explicite
        res.status(500).json({ error: "Impossible de lire cette vidéo (Protection YouTube ou format inconnu)." });
    }
});

module.exports = router;