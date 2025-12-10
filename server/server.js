require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

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

// --- ROUTES API ---
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/video', require('./routes/video'));

// --- SOCKET.IO (Chat Temps Réel) ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('send_message', (data) => {
        // Envoi au reste de la room
        socket.to(data.room).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
    });
});

// --- DEMARRAGE ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});