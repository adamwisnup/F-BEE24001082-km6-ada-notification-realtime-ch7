var express = require("express");
var logger = require("morgan");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
port = process.env.PORT || 3000;
const Sentry = require("./libs/sentry");
var app = express();
const http = require("http");
const path = require("path");
const fs = require("fs");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Pass `io` to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// All your controllers should live here
app.get("/", function rootHandler(req, res) {
  res.end("Hello world!");
});

//buat endpoint dg error
app.get("/error", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

const routes = require("./routes/routes");
app.use("/api/v1", routes);

app.use(Sentry.Handlers.errorHandler());

app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

server.listen(port, () => {
  console.log("app listening on port 3000!");
});
