var mongoose = require('mongoose');
var Schema = mongoose.Schema;


const PathModel = new Schema({
    from: {
        type: String
    },
    to: {
        type: String
    }
});

const windModel = new Schema({
    speed: {
        type: Number
    },
    direction:  {
        type: Number
    },
});

const averageModel = new Schema({
    averageOrigin: {
        type: windModel
    },
    averageDestination: {
        type: windModel
    }
});



const SeasonModel = new Schema({
    path: {
        type: PathModel
    },
    season: {
        type: String
    },
    averageWind: {
        type: averageModel
    },
    standardDeviation: {
        type: averageModel
    },
    averageDelay: {
        type: Number
    },
    standardDeviationDelay: {
        type: Number
    }
});







module.exports = mongoose.model('season', SeasonModel);

