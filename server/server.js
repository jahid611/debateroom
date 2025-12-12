require("dotenv").config()
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")

const Message = require("./models/Message")
const Room = require("./models/Room")
const User = require("./models/User")

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connecté !"))
  .catch((err) => console.error("❌ Erreur MongoDB:", err))

app.use("/api/auth", require("./routes/auth"))
app.use("/api/video", require("./routes/video"))
app.use("/api/feed", require("./routes/feed"))

const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } })

io.on("connection", (socket) => {
  // 1. REJOINDRE (AVEC DETECTION DE VOTE)
  socket.on("join_room", async (data) => {
    // Data peut être un string (ancienne version) ou un objet {roomId, userEmail}
    const roomId = typeof data === "object" ? data.roomId : data
    const userEmail = typeof data === "object" ? data.userEmail : null

    socket.join(roomId)

    let room = await Room.findOne({ slug: roomId })
    if (!room) {
      room = new Room({ slug: roomId, votes: { valid: [], inting: [] }, videoUrl: "", videoTitle: "Chargement..." })
      await room.save()
    }

    const history = await Message.find({ roomId: roomId }).sort({ timestamp: 1 }).limit(100)

    // VÉRIFICATION : Est-ce que ce joueur a déjà voté ?
    let myVote = null
    if (userEmail) {
      if (room.votes.valid.includes(userEmail)) myVote = "valid"
      if (room.votes.inting.includes(userEmail)) myVote = "inting"
    }

    const scores = {
      valid: room.votes?.valid?.length || 0,
      inting: room.votes?.inting?.length || 0,
    }

    socket.emit("init_room", {
      video: { src: room.videoUrl, title: room.videoTitle, platform: room.videoPlatform },
      messages: history,
      votes: scores,
      roomId: roomId,
      ownerEmail: room.ownerEmail,
      myVote: myVote, // On envoie l'info au front pour débloquer l'affichage
    })
  })

  // 2. CRÉATION
  socket.on("create_room", async (data) => {
    const uniqueId = `${data.game || "room"}-${Date.now()}`
    const newRoom = new Room({
      slug: uniqueId,
      ownerEmail: data.userEmail,
      game: data.game,
      videoUrl: data.src,
      videoTitle: data.title,
      videoPlatform: data.platform,
      videoDescription: data.description || "",
      votes: { valid: [], inting: [] },
    })
    await newRoom.save()
    socket.emit("room_created", uniqueId)
  })

  // 3. VOTE (UNIQUE ET DÉFINITIF) - With Combo System
  socket.on("send_vote", async (data) => {
    const { roomId, choice, userId, currentCombo } = data
    const room = await Room.findOne({ slug: roomId })
    const user = await User.findOne({ email: userId })

    if (!room || !user) return
    if (!room.votes) room.votes = { valid: [], inting: [] }

    // SÉCURITÉ : Si déjà voté, on arrête tout (Pas de changement possible)
    if (room.votes.valid.includes(userId) || room.votes.inting.includes(userId)) {
      return
    }

    // Ajout du vote
    room.votes[choice].push(userId)

    // CALCUL ELO (Seulement si majorité claire au moment du vote)
    const countValid = room.votes.valid.length
    const countInting = room.votes.inting.length
    let majority = null
    if (countValid > countInting) majority = "valid"
    else if (countInting > countValid) majority = "inting"

    if (majority) {
      const isCorrect = choice === majority
      let eloChange = 0

      if (isCorrect) {
        // Calculate combo bonus
        const newCombo = (currentCombo || 0) + 1
        if (newCombo >= 10) {
          eloChange = 30 // Perfect Judge
        } else if (newCombo >= 5) {
          eloChange = 20 // On Fire
        } else if (newCombo >= 3) {
          eloChange = 15 // Nice
        } else {
          eloChange = 10 // Base
        }
      } else {
        eloChange = -5 // Wrong vote, reset combo
      }

      user.elo = (user.elo || 1000) + eloChange
      await user.save()
      socket.emit("update_user_elo", { elo: user.elo })
    }

    await room.save()
    io.to(roomId).emit("update_votes", { roomId, valid: room.votes.valid.length, inting: room.votes.inting.length })
  })

  socket.on("update_combo", async (data) => {
    try {
      const { email, combo } = data
      await User.findOneAndUpdate({ email }, { combo })
    } catch (err) {
      console.error("Error updating combo:", err)
    }
  })

  // 4. CHAT - With Reply Support
  socket.on("send_message", async (data) => {
    try {
      const author = await User.findOne({ email: data.userEmail })
      const newMsg = new Message({
        roomId: data.roomId,
        username: data.username,
        text: data.text,
        userEmail: data.userEmail,
        avatar: author ? author.avatar : "https://cdn-icons-png.flaticon.com/512/847/847969.png",
        games: author ? author.games : [],
        details: author ? author.details : {},
        replyTo: data.replyTo || null,
        replyToUsername: data.replyToUsername || null,
        replyToText: data.replyToText || null,
      })
      await newMsg.save()
      io.to(data.roomId).emit("receive_message", newMsg)
    } catch (err) {
      console.error(err)
    }
  })

  socket.on("toggle_like_message", async (data) => {
    try {
      const { messageId, roomId, userEmail } = data
      const msg = await Message.findById(messageId)

      if (!msg) return

      if (!msg.likes) msg.likes = []

      const likeIndex = msg.likes.indexOf(userEmail)
      if (likeIndex > -1) {
        msg.likes.splice(likeIndex, 1)
      } else {
        msg.likes.push(userEmail)
      }

      await msg.save()
      io.to(roomId).emit("message_liked", { messageId, likes: msg.likes })
    } catch (err) {
      console.error("Error toggling like:", err)
    }
  })

  // 5. DELETE
  socket.on("delete_message", async (data) => {
    try {
      const msg = await Message.findById(data.messageId)
      const room = await Room.findOne({ slug: data.roomId })
      if (msg && (msg.userEmail === data.userEmail || (room && room.ownerEmail === data.userEmail))) {
        await Message.findByIdAndDelete(data.messageId)
        io.to(data.roomId).emit("message_deleted", data.messageId)
      }
    } catch (e) {}
  })

  socket.on("disconnect", () => {})
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`))
