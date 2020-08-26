const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// MongoDB
const dbString = require('./config/keys').MongoURI;
mongoose.connect(dbString, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.error(err));

// Bodyparser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static Routes
app.use(express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/account', require('./routes/users'));
app.use('/test', require('./routes/test'));
app.use('/post', require('./routes/posts'));

const PORT = process.env.port || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));