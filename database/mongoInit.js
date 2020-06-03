const mongoose = require('mongoose');
var config = require('../config/development.json')

const url = `mongodb+srv://${config.db.username}:${config.db.password}@flight-radar-p0fii.mongodb.net/flight-radar?retryWrites=true&w=majority`;
const db = mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, () => {
    console.log('Database connected');
});

module.exports = {
    db
}