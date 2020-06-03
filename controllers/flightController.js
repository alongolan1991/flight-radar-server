var flightHandler = require('../handlers/flightHandler');

const WINTER_ARR = [11, 0, 1];
const SPRING_ARR = [2, 3, 4];
const SUMMER_ARR = [5, 6, 7];
const AUTUMN_ARR = [8, 9, 10];

function getFlight(req, cb) {

    let from = req.query.origin;
    let to = req.query.destination;
    let flightDate = new Date(req.query.departureDate);
    let dateMonth = flightDate.getMonth();
    let flightSeason;

    // Get indication of witch season is the actual flight

    if (WINTER_ARR.includes(dateMonth)) {
        flightSeason = 'Winter'
    }
    if (SPRING_ARR.includes(dateMonth)) {
        flightSeason = 'Spring'
    }
    if (SUMMER_ARR.includes(dateMonth)) {
        flightSeason = 'Summer'
    }
    if (AUTUMN_ARR.includes(dateMonth)) {
        flightSeason = 'Autumn'
    }

    // Pass data to handler

    flightHandler.getFlight(from, to, flightSeason, flightDate, (err, flights) => {
        if (err) {
            cb(err);
        }
        else {
            cb(null, flights);
        }
    });

}

module.exports = {
    getFlight: getFlight
}