require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Import des Modèles
const Message = require('./models/Message');
const Room = require('./models/Room'); // Assurez-vous d'avoir créé ce fichier !

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connecté !'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/video', require('./routes/video'));

// Socket.io Setup
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- GESTION TEMPS RÉEL ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. Rejoindre une salle
    socket.on('join_room', async (roomId) => {
        socket.join(roomId);
        
        // Charger ou créer la salle en DB pour avoir les votes actuels
        let room = await Room.findOne({ slug: roomId });
        if (!room) {
            room = new Room({ slug: roomId, votes: { valid: [], inting: [] } });
            await room.save();
        }

        // Récupérer l'historique des messages
        const history = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(50);
        
        // Envoyer l'état initial au client (Historique + Vidéo actuelle + Votes actuels)
        socket.emit('load_history', history);
        
        if (room.videoUrl) {
            socket.emit('update_video', { 
                src: room.videoUrl, 
                title: room.videoTitle, 
                platform: room.videoPlatform 
            });
        }

        // Envoyer les scores actuels
        socket.emit('update_votes', {
            valid: room.votes.valid.length,
            inting: room.votes.inting.length
        });
    });

    // 2. Chat : Envoi de message
    socket.on('send_message', async (data) => {
        const newMsg = new Message({
            roomId: data.roomId,
            username: data.username,
            avatar: data.avatar,
            text: data.text
        });
        await newMsg.save();
        io.to(data.roomId).emit('receive_message', newMsg);
    });

    // 3. Vidéo : Changement de vidéo
    socket.on('change_video', async (data) => {
        await Room.findOneAndUpdate(
            { slug: data.roomId },
            { 
                videoUrl: data.src,
                videoTitle: data.title,
                videoPlatform: data.platform,
                updatedAt: Date.now()
            },
            { upsert: true }
        );
        
        // Dire à tout le monde de changer de vidéo
        io.to(data.roomId).emit('update_video', data);
        
        // Reset des votes pour la nouvelle vidéo
        await Room.findOneAndUpdate({ slug: data.roomId }, { votes: { valid: [], inting: [] } });
        io.to(data.roomId).emit('update_votes', { valid: 0, inting: 0 });
    });

    // 4. Votes (CORRIGÉ : MAINTENANT À L'INTÉRIEUR)
    socket.on('send_vote', async (data) => {
        const { roomId, choice, userId } = data;
        if (!userId) return;

        const room = await Room.findOne({ slug: roomId });
        if (!room) return;

        const otherChoice = choice === 'valid' ? 'inting' : 'valid';

        // Logique de vote unique
        if (room.votes[otherChoice].includes(userId)) {
            room.votes[otherChoice] = room.votes[otherChoice].filter(id => id !== userId);
        }
        if (!room.votes[choice].includes(userId)) {
            room.votes[choice].push(userId);
        }

        await room.save();

        io.to(roomId).emit('update_votes', { 
            valid: room.votes.valid.length, 
            inting: room.votes.inting.length 
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
}); // <--- Fin de io.on('connection')

// --- DEMARRAGE ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});