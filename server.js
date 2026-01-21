const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const commentRoutes = require("./routes/commentRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const User = require("./models/User");
const dashboardRoutes = require("./routes/dashboardRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

// Adjust swagger host dynamically for deployment
swaggerDocument.host = undefined;
swaggerDocument.schemes = undefined;

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  transports: ["websocket", "polling"],
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const connectedUsers = new Set();
const socketUserMap = new Map();

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB connection error:", err));


io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join", async (userId) => {
    if (!userId) {
      console.log("No userId provided for join event, socket:", socket.id);
      return;
    }
    try {
      const user = await User.findById(userId);
      socket.join(userId);
      connectedUsers.add(userId);
      socketUserMap.set(socket.id, userId);
      console.log(`User ${userId}, ${user.name}, ${user.email}, ${user.role} joined room`);
      console.log("Connected users:", Array.from(connectedUsers));
    } catch (error) {
      console.error("Error fetching user details in socket join:", error);
    }
  });

  socket.on("joinTask", (taskId) => {
    socket.join(taskId);
    console.log(`Socket ${socket.id} joined task room ${taskId}`);
  });

  socket.on("leaveTask", (taskId) => {
    socket.leave(taskId);
    console.log(`Socket ${socket.id} left task room ${taskId}`);
  });

  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      connectedUsers.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`User ${userId} disconnected`);
      console.log("Connected users after disconnect:", Array.from(connectedUsers));
    }
    console.log("Client disconnected:", socket.id);
  });
});

app.use("/api/auth",/* #swagger.tags = ['Auth'] */ authRoutes);
app.use("/api/tasks",/* #swagger.tags = ['Tasks'] */ taskRoutes(io, connectedUsers));
app.use("/api/users",/* #swagger.tags = ['Users'] */ userRoutes);
app.use("/api/teams",/* #swagger.tags = ['Teams'] */ teamRoutes(io, connectedUsers));
app.use("/api/comments",/* #swagger.tags = ['Comments'] */ commentRoutes(io));
app.use("/api/activity-logs",/* #swagger.tags = ['Activity Logs'] */ activityLogRoutes);
app.use("/api/dashboard",/* #swagger.tags = ['Dashboard'] */ dashboardRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/", (req, res) => {
  res.json({ message: "Task Management API / route" });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;