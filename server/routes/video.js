const express = require('express');
const router = express.Router();
const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');

// Chemin vers l'exécutable qu'on vient de télécharger
// __dirname = dossier routes, donc on remonte d'un cran (..) pour aller dans server/
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const execPath = path.join(__dirname, '..', binaryName);

// On initialise avec le chemin précis
const ytDlpWrap = new YtDlpWrap(execPath);

// ... le reste du code reste identique (router.get...)
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