require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const Message = require('./models/Message');
const Room = require('./models/Room'); 

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
            // Création automatique si room inconnue (cas rare)
            room = new Room({ slug: roomId, votes: { valid: [], inting: [] } });
            await room.save();
        }

        // Récupérer l'historique
        const history = await Message.find({ roomId: roomId }).sort({ timestamp: 1 }).limit(100);
        
        const scores = {
            valid: room.votes?.valid?.length || 0,
            inting: room.votes?.inting?.length || 0
        };

        // Envoi au client
        socket.emit('init_room', { 
            video: { src: room.videoUrl, title: room.videoTitle, platform: room.videoPlatform },
            messages: history, 
            votes: scores,
            roomId: roomId,
            ownerEmail: room.ownerEmail // On envoie l'info du proprio pour l'affichage
        });
    });

    // 2. CRÉATION ROOM (Avec Propriétaire)
    socket.on('create_room', async (data) => {
        const uniqueId = `${data.game || 'room'}-${Date.now()}`;
        const newRoom = new Room({
            slug: uniqueId,
            ownerEmail: data.userEmail, // <--- On sauvegarde le chef
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
    socket.on('send_vote', async (data) => {
        const { roomId, choice, userId } = data;
        const room = await Room.findOne({ slug: roomId });
        if (!room || !userId) return;

        if(!room.votes) room.votes = { valid: [], inting: [] };
        
        const other = choice === 'valid' ? 'inting' : 'valid';
        if (room.votes[other].includes(userId)) room.votes[other] = room.votes[other].filter(id => id !== userId);
        if (!room.votes[choice].includes(userId)) room.votes[choice].push(userId);

        await room.save();
        io.to(roomId).emit('update_votes', { roomId, valid: room.votes.valid.length, inting: room.votes.inting.length });
    });

    // 4. CHAT (Envoi)
    socket.on('send_message', async (data) => {
        const newMsg = new Message({
            roomId: data.roomId,
            username: data.username,
            userEmail: data.userEmail, // <--- Indispensable pour savoir qui supprime
            avatar: data.avatar,
            text: data.text
        });
        const savedMsg = await newMsg.save();
        io.to(data.roomId).emit('receive_message', savedMsg);
    });

    // 5. CHAT (Suppression) - NOUVEAU
    socket.on('delete_message', async (data) => {
        const { messageId, roomId, userEmail } = data; // userEmail = celui qui veut supprimer

        try {
            const msg = await Message.findById(messageId);
            const room = await Room.findOne({ slug: roomId });

            if (msg) {
                // AUTORISATION : Soit c'est l'auteur, soit c'est le proprio du débat
                const isAuthor = msg.userEmail === userEmail;
                const isOwner = room && room.ownerEmail === userEmail;

                if (isAuthor || isOwner) {
                    await Message.findByIdAndDelete(messageId);
                    // On dit à tout le monde de retirer ce message de l'écran
                    io.to(roomId).emit('message_deleted', messageId);
                }
            }
        } catch (e) { console.error("Erreur delete:", e); }
    });

    socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`));