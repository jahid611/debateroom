require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// --- IMPORTS DES MODÈLES ---
const Message = require('./models/Message');
const Room = require('./models/Room'); 
const User = require('./models/User'); // <--- INDISPENSABLE POUR RÉCUPÉRER L'AVATAR

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connecté !'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/video', require('./routes/video'));
app.use('/api/feed', require('./routes/feed'));

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    // 1. REJOINDRE & CHARGER HISTORIQUE
    socket.on('join_room', async (roomId) => {
        socket.join(roomId);
        
        let room = await Room.findOne({ slug: roomId });
        if (!room) {
            room = new Room({ slug: roomId, votes: { valid: [], inting: [] }, videoUrl: "", videoTitle: "Chargement..." });
            await room.save();
        }

        // Récupérer l'historique (100 derniers)
        const history = await Message.find({ roomId: roomId }).sort({ timestamp: 1 }).limit(100);
        
        const scores = {
            valid: room.votes?.valid?.length || 0,
            inting: room.votes?.inting?.length || 0
        };

        socket.emit('init_room', { 
            video: { src: room.videoUrl, title: room.videoTitle, platform: room.videoPlatform },
            messages: history, 
            votes: scores,
            roomId: roomId,
            ownerEmail: room.ownerEmail
        });
    });

    // 2. CRÉATION ROOM
    socket.on('create_room', async (data) => {
        const uniqueId = `${data.game || 'room'}-${Date.now()}`;
        const newRoom = new Room({
            slug: uniqueId,
            ownerEmail: data.userEmail,
            game: data.game,
            videoUrl: data.src,
            videoTitle: data.title,
            videoPlatform: data.platform,
            votes: { valid: [], inting: [] }
        });
        await newRoom.save();
        socket.emit('room_created', uniqueId);
    });

    // 3. VOTES
    // 3. VOTE & ELO SYSTEM
    socket.on('send_vote', async (data) => {
        const { roomId, choice, userId } = data;
        
        // On récupère la Room et l'User
        const room = await Room.findOne({ slug: roomId });
        const user = await User.findOne({ email: userId });

        if (!room || !user) return;

        if(!room.votes) room.votes = { valid: [], inting: [] };
        if(!room.votes.valid) room.votes.valid = [];
        if(!room.votes.inting) room.votes.inting = [];

        // Gestion du changement de vote
        const otherChoice = choice === 'valid' ? 'inting' : 'valid';
        if (room.votes[otherChoice].includes(userId)) {
            room.votes[otherChoice] = room.votes[otherChoice].filter(id => id !== userId);
        }

        // Ajout du vote s'il n'y est pas déjà
        if (!room.votes[choice].includes(userId)) {
            room.votes[choice].push(userId);
        }

        // --- CALCUL ELO (GAMIFICATION) ---
        const countValid = room.votes.valid.length;
        const countInting = room.votes.inting.length;
        
        // Quelle est la majorité actuelle ?
        let majority = null;
        if (countValid > countInting) majority = 'valid';
        else if (countInting > countValid) majority = 'inting';

        // Si l'utilisateur rejoint la majorité -> Gain de points
        // Si l'utilisateur va contre la majorité -> Perte de points
        // (On ne change le score que si une majorité claire existe)
        if (majority) {
            if (choice === majority) {
                user.elo = (user.elo || 1000) + 10; // +10 points pour le bon choix
            } else {
                user.elo = (user.elo || 1000) - 5;  // -5 points pour le mauvais choix
            }
            await user.save();
            
            // On renvoie le nouveau score au client pour l'afficher en direct
            socket.emit('update_user_elo', { elo: user.elo });
        }

        await room.save();

        // Update des votes pour tout le monde
        io.to(roomId).emit('update_votes', { 
            roomId: roomId,
            valid: room.votes.valid.length, 
            inting: room.votes.inting.length 
        });
    });

    // 4. CHAT (CORRIGÉ POUR L'AVATAR)
    socket.on('send_message', async (data) => {
        try {
            // A. ON CHERCHE L'UTILISATEUR EN BDD (Source de vérité)
            const author = await User.findOne({ email: data.userEmail });

            // B. ON CRÉE LE MESSAGE AVEC LES DONNÉES À JOUR
            const newMsg = new Message({
                roomId: data.roomId,
                username: data.username,
                text: data.text,
                userEmail: data.userEmail,
                
                // C'est ici le secret : on prend l'avatar de la BDD, sinon celui par défaut
                avatar: author ? author.avatar : "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                
                // On met aussi les jeux/rangs à jour
                games: author ? author.games : [],
                details: author ? author.details : {}
            });
            
            await newMsg.save();
            io.to(data.roomId).emit('receive_message', newMsg);
            
        } catch (err) {
            console.error("❌ Erreur message :", err);
        }
    });

    // 5. SUPPRESSION
    socket.on('delete_message', async (data) => {
        const { messageId, roomId, userEmail } = data;
        try {
            const msg = await Message.findById(messageId);
            const room = await Room.findOne({ slug: roomId });

            if (msg) {
                const isAuthor = msg.userEmail === userEmail;
                const isOwner = room && room.ownerEmail === userEmail;

                if (isAuthor || isOwner) {
                    await Message.findByIdAndDelete(messageId);
                    io.to(roomId).emit('message_deleted', messageId);
                }
            }
        } catch (e) { console.error("Erreur delete:", e); }
    });

    socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`));