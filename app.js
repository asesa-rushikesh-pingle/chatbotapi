var createError = require('http-errors');
var express = require('express');
var cors = require('cors')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { sequelize } = require('./models');

var http = require('http');
var { Server } = require("socket.io");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var chatWithAiRouter = require('./routes/chatWithAiRouter');
var conversationRouter = require('./routes/conversationRouter');

var app = express();



async function checkDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Unable to connect to database:", error);
  }
}

checkDatabaseConnection();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', chatWithAiRouter);
app.use('/conversation', conversationRouter);

// ✅ CREATE SERVER (IMPORTANT)
const server = http.createServer(app);


// ✅ SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);


// ✅ SOCKET EVENTS
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("send_message", (data) => {
    try {
      console.log("📩 message:", data);

      // example emit
      // io.to(data.socketId).emit("receive_message", data.message);

    } catch (err) {
      console.error("❌ Socket error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("⚠️ User disconnected:", socket.id);
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// ✅ START SERVER HERE (IMPORTANT)
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// module.exports = app;
