const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const packetHistory = {}; // Track packets per host
const activeSimulations = {}; // Track active attack simulations

io.on("connection", (socket) => {
  console.log("Client connected");

  // Listen for normal packet sends
  socket.on("sendPacket", ({ src, dst }) => {
    packetHistory[src] = packetHistory[src] || [];
    packetHistory[src].push(Date.now());
    // Keep only last 5 seconds
    packetHistory[src] = packetHistory[src].filter((t) => Date.now() - t < 5000);

    // Detect packet flood (>5 packets in 5 seconds)
    if (packetHistory[src].length > 5) {
      io.emit("intrusionAlert", { node: src, message: "Packet flood detected!" });
      packetHistory[src] = [];
    }
  });

  // Start automated attack simulation from a host
  socket.on("startAttack", ({ hostId, targetId, intervalMs }) => {
    if (activeSimulations[hostId]) return; // Already running
    activeSimulations[hostId] = setInterval(() => {
      socket.emit("simulatePacket", { src: hostId, dst: targetId });
    }, intervalMs || 500); // Default: 1 packet every 0.5s
  });

  // Stop automated attack simulation
  socket.on("stopAttack", ({ hostId }) => {
    clearInterval(activeSimulations[hostId]);
    delete activeSimulations[hostId];
  });
});

server.listen(4000, () => console.log("Backend running on port 4000"));
