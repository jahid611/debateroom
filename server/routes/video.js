const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const ytDlpWrap = new YtDlpWrap();

// Route: GET /api/video/resolve?url=...
router.get('/resolve', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL manquante" });

    try {
        console.log("Analyse de :", url);
        // Commande magique pour extraire le lien direct
        let directUrl = await ytDlpWrap.execPromise([
            url,
            '-g', // Get URL only
            '-f', 'best[ext=mp4]/best' // Meilleur format mp4
        ]);
        
        res.json({ 
            src: directUrl.trim(), 
            type: 'file', 
            originalUrl: url 
        });
    } catch (error) {
        console.error("Erreur yt-dlp:", error.message);
        res.status(500).json({ error: "Impossible de lire cette vidéo. Vérifiez le lien." });
    }
});

module.exports = router;