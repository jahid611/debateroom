const YtDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

// Détermine le nom du fichier selon Windows (.exe) ou Mac/Linux
const fileName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const filePath = path.join(__dirname, fileName);

console.log(`⏳ Téléchargement de ${fileName} depuis GitHub... Patientez...`);

YtDlpWrap.downloadFromGithub(filePath)
    .then(() => {
        console.log(`✅ Succès ! ${fileName} a été téléchargé dans le dossier server.`);
        // Si on est sur Linux/Mac, on rend le fichier exécutable
        if (process.platform !== 'win32') {
            fs.chmodSync(filePath, '755');
        }
    })
    .catch(err => console.error("❌ Erreur de téléchargement :", err));