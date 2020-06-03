var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FlightModel = new Schema({
    Index: {
        type: Number
    },
    Date: {
        type: Number
    },
    From: {
        type: String,
        default: 'TLV'
    },
    To: {
        type: String,
        default: 'MAD'
    },
    FlightTime: {
        type: Number
    },
    ScheduledTimeDeparture: {
        type: Number
    },
    ActualTimeDeparture: {
        type: Number
    },
    ScheduledTimeArrival: {
        type: Number
    }
});

module.exports = mongoose.model('flightsSimulation', FlightModel);


// "Date": "9-Mar-20",
// "From": "Tel Aviv (TLV)",
// "To": "Madrid (MAD)",
// "Aircraft": "B738 (4X-EKC)",
// "Flight Time": "4:47",
// "Scheduled time Departure": "6:15 AM",
// "Actual time Departure": "6:32 AM",
// "Scheduled Time Arrival": "10:45 AM"