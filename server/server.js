require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// --- IMPORTS DES MODÈLES ---
const Message = require('./models/Message');
const Room = require('./models/Room'); 

// --- INITIALISATION DE L'APP ---
const app = express();
const server = http.createServer(app);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONNEXION MONGO DB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connecté !'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// --- ROUTES API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/video', require('./routes/video'));
app.use('/api/feed', require('./routes/feed'));

// --- SOCKET.IO (TEMPS RÉEL) ---
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log('🔗 Utilisateur connecté :', socket.id);

    // 1. REJOINDRE UNE SALLE & CHARGER L'HISTORIQUE
    socket.on('join_room', async (roomId) => {
        socket.join(roomId);
        console.log(`📂 Utilisateur rejoint la room : ${roomId}`);
        
        let room = await Room.findOne({ slug: roomId });
        
        // Si la salle n'existe pas encore en DB, on la crée
        if (!room) {
            room = new Room({ 
                slug: roomId, 
                votes: { valid: [], inting: [] },
                videoUrl: "", videoTitle: "Chargement...", videoPlatform: ""
            });
            await room.save();
        }

        // --- CHARGEMENT HISTORIQUE OPTIMISÉ ---
        // On récupère les 100 derniers messages, triés du plus vieux au plus récent
        const history = await Message.find({ roomId: roomId })
                                     .sort({ timestamp: 1 }) 
                                     .limit(100);
        
        const scores = {
            valid: room.votes?.valid?.length || 0,
            inting: room.votes?.inting?.length || 0
        };

        // On envoie tout au client, avec l'ID de la room pour cibler la bonne boîte
        socket.emit('init_room', { 
            video: { 
                src: room.videoUrl, 
                title: room.videoTitle, 
                platform: room.videoPlatform 
            },
            messages: history, // L'historique part ici
            votes: scores,
            roomId: roomId 
        });
    });

    // 2. CRÉATION D'UNE NOUVELLE ROOM (IMPORT VIDEO)
    socket.on('create_room', async (data) => {
        const uniqueId = `${data.game || 'room'}-${Date.now()}`;

        const newRoom = new Room({
            slug: uniqueId,
            game: data.game,
            videoUrl: data.src,
            videoTitle: data.title,
            videoPlatform: data.platform,
            votes: { valid: [], inting: [] }
        });
        
        await newRoom.save();
        socket.emit('room_created', uniqueId);
    });

    // 3. VOTE
    socket.on('send_vote', async (data) => {
        const { roomId, choice, userId } = data;
        if (!userId) return;

        const room = await Room.findOne({ slug: roomId });
        if (!room) return;

        const otherChoice = choice === 'valid' ? 'inting' : 'valid';

        if(!room.votes) room.votes = { valid: [], inting: [] };
        if(!room.votes.valid) room.votes.valid = [];
        if(!room.votes.inting) room.votes.inting = [];

        if (room.votes[otherChoice].includes(userId)) {
            room.votes[otherChoice] = room.votes[otherChoice].filter(id => id !== userId);
        }

        if (!room.votes[choice].includes(userId)) {
            room.votes[choice].push(userId);
        }

        await room.save();

        io.to(roomId).emit('update_votes', { 
            roomId: roomId,
            valid: room.votes.valid.length, 
            inting: room.votes.inting.length 
        });
    });

    // 4. CHAT (SAUVEGARDE ET DIFFUSION)
    socket.on('send_message', async (data) => {
        console.log(`💬 Message de ${data.username} dans ${data.roomId}`);

        try {
            const newMsg = new Message({
                roomId: data.roomId,
                username: data.username,
                avatar: data.avatar,
                text: data.text
            });
            
            // On sauvegarde en DB
            await newMsg.save();

            // On envoie à tout le monde DANS CETTE SALLE
            io.to(data.roomId).emit('receive_message', newMsg);
            
        } catch (err) {
            console.error("❌ Erreur sauvegarde message :", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Utilisateur déconnecté:', socket.id);
    });
});

// --- DEMARRAGE ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});