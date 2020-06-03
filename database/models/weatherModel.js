var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const WeatherModel = new Schema({
    City: {
        type: String,
        default: "TLV"
    },
    TimeStamp: {
        type: Number
    },
    Date: {
        type: String
    },
    Lat: {
        type: Number
    },
    Long: {
        type: Number
    },
    WindSpeed: {
        type: Number
    },
    WindDirection: {
        type: Number
    }
});

module.exports = mongoose.model('weathers', WeatherModel);