import express from "express";
import http from "http";
import SocketIO from "socket.io";

const app = express();
app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname+"/public"));

// Routing
app.get("/", (_, res)=> res.render("index"));
app.get("/*", (_, res)=> res.redirect("/"));

// HTTP Server
const server = http.createServer(app);
// Socket IO Server
const socketIOserver = SocketIO(server);

socketIOserver.on("connection", (socket)=>{
    socket.on("join_room", (roomName)=>{
        socket.join(roomName);
        socket.to(roomName).emit("welcome");
    })
    socket.on("offer", (offer, roomName)=>{
        socket.to(roomName).emit("offer", offer);
    });
    socket.on("answer", (answer, roomName)=>{
        socket.to(roomName).emit("answer", answer);
    })
    socket.on("ice", (ice,roomName)=>{
        socket.to(roomName).emit("ice", ice);
    })
})

const handleListen  = () => console.log(`Listening on http://localhost:3000`);
server.listen(3000, handleListen);