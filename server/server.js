require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// Configuration CORS (Pour autoriser ton Frontend à parler au Backend)
app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "*", // A sécuriser plus tard avec ton URL frontend
        methods: ["GET", "POST"]
    }
});

// --- CONNEXION MONGO DB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connecté !'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// --- ROUTES API ---
 app.use('/api/auth', require('./routes/auth'));
 app.use('/api/video', require('./routes/video'));

// --- SOCKET.IO (Chat Temps Réel) ---
io.on('connection', (socket) => {
    
    // Quand quelqu'un arrive, on lui envoie les 50 derniers messages
    socket.on('join_room', async (roomId) => {
        socket.join(roomId);
        const history = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(50);
        socket.emit('load_history', history); // Envoie l'historique juste à lui
    });

    // Quand quelqu'un parle
    socket.on('send_message', async (data) => {
        // 1. Sauvegarder en DB
        const newMsg = new Message({
            roomId: data.roomId,
            username: data.username,
            avatar: data.avatar, // L'avatar Google stocké dans le localStorage
            text: data.text
        });
        await newMsg.save();

        // 2. Envoyer à tout le monde (y compris l'envoyeur pour confirmer)
        io.to(data.roomId).emit('receive_message', newMsg);
    });
});

// Gestion des votes sécurisés
    socket.on('send_vote', async (data) => {
        // data = { roomId, choice ('valid' ou 'inting'), userId }
        const { roomId, choice, userId } = data; // userId est l'email ou le pseudo unique

        if (!userId) return;

        const room = await Room.findOne({ slug: roomId });
        if (!room) return;

        // Logique anti-doublon et changement d'avis
        const otherChoice = choice === 'valid' ? 'inting' : 'valid';

        // 1. Si déjà voté pour l'autre choix, on enlève
        if (room.votes[otherChoice].includes(userId)) {
            room.votes[otherChoice] = room.votes[otherChoice].filter(id => id !== userId);
        }

        // 2. Si déjà voté pour ce choix, on ne fait rien (ou on enlève si tu veux permettre d'annuler)
        if (!room.votes[choice].includes(userId)) {
            room.votes[choice].push(userId);
        }

        await room.save();

        // 3. Calculer les totaux pour le frontend
        const countValid = room.votes.valid.length;
        const countInting = room.votes.inting.length;

        // Renvoyer à tout le monde
        io.to(roomId).emit('update_votes', { 
            valid: countValid, 
            inting: countInting 
        });
    }); 

// --- DEMARRAGE ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});