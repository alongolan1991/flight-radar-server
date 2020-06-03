var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const FlightWeatherModel = new Schema({
    Index: {
        type: Number
    },
    Origin: {
        type: String
    },
    Destination: {
        type: String
    },
    ActualTimeDeparture: {
        type: Number
    },
    ScheduledTimeDeparture: {
        type: Number
    },
    ActualTimeArrival: {
        type: Number
    },
    ScheduledTimeArrival: {
        type: Number
    },
    Delay: {
        type: Number
    },
    OriginWeather: {
        WindSpeed: {
            type: Number
        },
        WindDirection: {
            type: Number
        }
    },
    DestinationWeather: {
        WindSpeed: {
            type: Number
        },
        WindDirection: {
            type: Number
        }
    },
    Season: {
        type: String
    }
});

module.exports = mongoose.model('flightWeathers', FlightWeatherModel);