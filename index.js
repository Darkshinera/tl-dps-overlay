const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // En prod, restreindre aux domaines autorisés si possible
        methods: ["GET", "POST"]
    }
});

// Stockage des rooms en mémoire : { roomName: password }
// Note: En cas de redémarrage du serveur, les pass sont perdus (acceptable pour ce cas d'usage)
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Nouveau client connecté:', socket.id);

    // Rejoindre une room
    socket.on('join_room', ({ room, password }) => {
        if (!room) return;

        // Si la room existe déjà
        if (rooms.has(room)) {
            if (rooms.get(room) === password) {
                socket.join(room);
                console.log(`Socket ${socket.id} a rejoint la room: ${room}`);
                socket.emit('room_joined', { success: true, message: 'Rejoint avec succès' });
            } else {
                socket.emit('room_error', { message: 'Mot de passe incorrect' });
            }
        } else {
            // Créer la room
            rooms.set(room, password);
            socket.join(room);
            console.log(`Room créée: ${room} par ${socket.id}`);
            socket.emit('room_joined', { success: true, message: 'Room créée et rejointe' });
        }
    });

    // Relayer les DPS updates
    socket.on('dps_update', (data) => {
        // data contient { room, playerName, dps, totalDamage, ... }
        if (data.room && rooms.has(data.room)) {
            // Diffuser à tous les autres clients de la room
            socket.to(data.room).emit('dps_update', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté:', socket.id);
        // Nettoyage des rooms vides si nécessaire (optionnel)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur DPS démarré sur le port ${PORT}`);
});
