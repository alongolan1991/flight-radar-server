const FlightWeatherModel = require('../database/models/flightWeatherModel');
const SeasonModel = require('../database/models/seasonModel');
const TWO_HOURS = 7200000;
const ONE_YEAR = 31556952000;
const ONE_DAY = 86400000;


function getFlight(from, to, flightSeason, flightDate, cb) {

    //  Getting day & month to create ability to "run" over the whole years (starting from 1970) and retrieve the current week of this selected day
    let month = flightDate.getMonth() + 1;
    let day = flightDate.getDate();
    let year = 1970;

    // Define the range of single week
    let initialTimeStamp = new Date(month + '/' + day + '/' + year).getTime();
    let min = initialTimeStamp - (3 * ONE_DAY);
    let max = initialTimeStamp + (4 * ONE_DAY);

    // Query array ($or)
    let daysArray = [];

    // Create the query
    for (let i = 0; ; i++) {
        if (i >= new Date().getTime() / ONE_YEAR) {
            break;
        }
        let singleLine = {
            ScheduledTimeDeparture: { '$gte': min, '$lte': max }
        }
        daysArray.push(singleLine);
        // Increase by 1 year
        min += ONE_YEAR;
        max += ONE_YEAR;
    }

    // Flight query (mongoDb)
    const flightQuery = {
        Origin: from,
        Destination: to,
        $or: daysArray
    };

    // TODO: talk about it
    const seasonQuery = {
        season: flightSeason
    };

    // Get flights population
    getFlights(flightQuery, (err, flights) => {
        if (err) {
            cb(err);
        } else {
            SeasonModel.findOne(seasonQuery, (err, currentSeason) => {
                if (err) {
                    console.log(err);
                    cb(err);
                } else if (!currentSeason) {
                    let msg = 'Internal error (season noe found on process)';
                    console.log(msg);
                    cb(msg);
                } else {
                    // const averageWindBySeason = currentSeason.averageWind;
                    // const standardDeviationBySeason = currentSeason.standardDeviation;
                    const averageDelayBySeason = currentSeason.averageDelay;
                    const standardDeviationDelayBySeason = currentSeason.standardDeviationDelay;

                    let sevenDaysFlights = {};


                    // Create object (by the 7 days of the week => each key = the day of the month)
                    flights.forEach(flight => {
                        let key = new Date(flight.ScheduledTimeDeparture).getDate().toString();
                        if (!sevenDaysFlights[key] || sevenDaysFlights[key] === undefined) {
                            sevenDaysFlights[key] = {
                                date: null,
                                flights: [],
                                validDelayFlights: [],
                                invalidDelayFlights: [],
                                dayValidAverageWeather: {},
                                dayValidStandardDeviationWeather: {},
                                pureInvalidFlightsCounter: 0,
                                dayScore: {}
                            };
                        }
                        sevenDaysFlights[key].flights.push(flight);
                    });

                    // Remove 2 minimum elements
                    deleteMinimumFromObject(sevenDaysFlights);
                    deleteMinimumFromObject(sevenDaysFlights);

                    // Calculate valid & invalid flights by the "Delay" property by season!
                    for (let day in sevenDaysFlights) {
                        sevenDaysFlights[day].flights.forEach(currentFlight => {
                            if ((currentFlight.Delay <= averageDelayBySeason + standardDeviationDelayBySeason) &&
                                (currentFlight.Delay >= averageDelayBySeason - standardDeviationDelayBySeason)) {
                                sevenDaysFlights[day].validDelayFlights.push(currentFlight);
                            } else {
                                sevenDaysFlights[day].invalidDelayFlights.push(currentFlight);
                            }
                        });
                    }

                    // Calculate averageWeather & standardDeviationWeather of valid flights per day!
                    for (let day in sevenDaysFlights) {
                        sevenDaysFlights[day].dayValidAverageWeather = calcSuperAverage(sevenDaysFlights[day].validDelayFlights);
                        sevenDaysFlights[day].dayValidStandardDeviationWeather = calcSuperStandardDeviation(sevenDaysFlights[day].validDelayFlights, sevenDaysFlights[day].dayValidAverageWeather);
                    }


                    for (let day in sevenDaysFlights) {
                        sevenDaysFlights[day].invalidDelayFlights.forEach(currentInvalidFlight => {
                            if (
                                (
                                    (currentInvalidFlight.OriginWeather.WindSpeed <= sevenDaysFlights[day].dayValidAverageWeather.averageOrigin.speed + sevenDaysFlights[day].dayValidStandardDeviationWeather.averageOrigin.speed) &&
                                    (currentInvalidFlight.OriginWeather.WindSpeed >= sevenDaysFlights[day].dayValidAverageWeather.averageOrigin.speed - sevenDaysFlights[day].dayValidStandardDeviationWeather.averageOrigin.speed))
                                &&
                                (
                                    (currentInvalidFlight.OriginWeather.WindDirection <= sevenDaysFlights[day].dayValidAverageWeather.averageOrigin.direction + sevenDaysFlights[day].dayValidStandardDeviationWeather.averageOrigin.direction) &&
                                    (currentInvalidFlight.OriginWeather.WindDirection >= sevenDaysFlights[day].dayValidAverageWeather.averageOrigin.direction - sevenDaysFlights[day].dayValidStandardDeviationWeather.averageOrigin.direction))
                                ||
                                (
                                    (currentInvalidFlight.DestinationWeather.WindSpeed <= sevenDaysFlights[day].dayValidAverageWeather.averageDestination.speed + sevenDaysFlights[day].dayValidStandardDeviationWeather.averageDestination.speed) &&
                                    (currentInvalidFlight.DestinationWeather.WindSpeed >= sevenDaysFlights[day].dayValidAverageWeather.averageDestination.speed - sevenDaysFlights[day].dayValidStandardDeviationWeather.averageDestination.speed))
                                && (
                                    (currentInvalidFlight.DestinationWeather.WindDirection <= sevenDaysFlights[day].dayValidAverageWeather.averageDestination.direction + sevenDaysFlights[day].dayValidStandardDeviationWeather.averageDestination.direction) &&
                                    (currentInvalidFlight.DestinationWeather.WindDirection >= sevenDaysFlights[day].dayValidAverageWeather.averageDestination.direction - sevenDaysFlights[day].dayValidStandardDeviationWeather.averageDestination.direction))
                            ) {
                                // console.log('No');
                            } else {
                                sevenDaysFlights[day].pureInvalidFlightsCounter++;
                            }
                        });
                    }

                    let res = [];

                    for (let day in sevenDaysFlights) {
                        sevenDaysFlights[day].dayScore = calculateScore(sevenDaysFlights[day].pureInvalidFlightsCounter, sevenDaysFlights[day].flights.length);
                        let retItem = {
                            from: from,
                            to: to,
                            date: createDate(sevenDaysFlights[day].flights[0].ScheduledTimeDeparture, flightDate),
                            score: sevenDaysFlights[day].dayScore.score,
                            percentage: sevenDaysFlights[day].dayScore.percentage
                        }
                        res.push(retItem);
                    }
                    // TODO: Calculate 24 hours each day
                    cb(null, res);
                }
            });
        }
    });
}

function createDate(ts, flightDate) {
    //flightDate.getYear()
    let preDate = new Date(ts);
    let day = preDate.getDate();
    let month = preDate.getMonth() + 1;
    let year = flightDate.getYear();

    let date = new Date(month + '/' + day + '/' + year);
    return date;
}


function calculateScore(numerator, denominator) {
    let preScore = (numerator / denominator) * 100;
    let flightScore;
    if (preScore >= 0 && preScore <= 20) {
        flightScore = 1;
    } else if (preScore > 20 && preScore <= 40) {
        flightScore = 2;
    } else if (preScore > 40 && preScore <= 60) {
        flightScore = 3;
    } else if (preScore > 60 && preScore <= 80) {
        flightScore = 4;
    } else if (preScore > 80 && preScore <= 100) {
        flightScore = 5;
    }
    return {
        percentage: preScore,
        score: flightScore
    };
}


function getFlightScore(total, amount) {
    return (amount / total) * 100;
}

function mapScoreByValue(flightScore) {

    let score;

    if (flightScore >= 0 && flightScore <= 20) {
        score = 1;
    } else if (flightScore > 20 && flightScore <= 40) {
        score = 2;
    } else if (flightScore > 40 && flightScore <= 60) {
        score = 3;
    } else if (flightScore > 60 && flightScore <= 80) {
        score = 4;
    } else if (flightScore > 80 && flightScore <= 100) {
        score = 5;
    }

    return score;
}

function deleteMinimumFromObject(object) {

    let isMinimum = Infinity;
    let minimumKey;

    for (obj in object) {
        if (isMinimum >= object[obj].flights.length) {
            minimumKey = obj;
            isMinimum = object[obj].flights.length;
        }
    }
    delete object[minimumKey];
}

function calcSuperAverage(items) {

    if (!items.length) {
        return null;
    }

    let sumWindSpeedOrigin = 0
    let sumWindDirectionOrigin = 0
    let sumWindSpeedDestination = 0
    let sumWindDirectionDestination = 0
    let length = items.length;

    items.forEach(item => {
        sumWindSpeedOrigin += item.OriginWeather.WindSpeed;
        sumWindDirectionOrigin += item.OriginWeather.WindDirection;
        sumWindSpeedDestination += item.DestinationWeather.WindSpeed;
        sumWindDirectionDestination += item.DestinationWeather.WindDirection;
    });

    let obj = {
        averageOrigin: {
            speed: sumWindSpeedOrigin / length,
            direction: sumWindDirectionOrigin / length
        },
        averageDestination: {
            speed: sumWindSpeedDestination / length,
            direction: sumWindDirectionDestination / length
        }
    };

    return obj;
}


function calcSuperStandardDeviation(items, avgObj) {

    if (!items.length) {
        return null;
    }

    let standardDeviationWindSpeedOrigin = 0
    let standardDeviationWindDirectionOrigin = 0
    let standardDeviationWindSpeedDestination = 0
    let standardDeviationWindDirectionDestination = 0
    let length = items.length;

    items.forEach(item => {
        standardDeviationWindSpeedOrigin += Math.pow(item.OriginWeather.WindSpeed - avgObj.averageOrigin.speed, 2);
        standardDeviationWindDirectionOrigin += Math.pow(item.OriginWeather.WindDirection - avgObj.averageOrigin.direction, 2);
        standardDeviationWindSpeedDestination += Math.pow(item.DestinationWeather.WindSpeed - avgObj.averageDestination.speed, 2);
        standardDeviationWindDirectionDestination += Math.pow(item.DestinationWeather.WindDirection - avgObj.averageDestination.direction, 2);
    });

    let obj = {
        averageOrigin: {
            speed: Math.sqrt(standardDeviationWindSpeedOrigin / length),
            direction: Math.sqrt(standardDeviationWindDirectionOrigin / length)
        },
        averageDestination: {
            speed: Math.sqrt(standardDeviationWindSpeedDestination / length),
            direction: Math.sqrt(standardDeviationWindDirectionDestination / length)
        }
    };

    return obj;
}


// Get flights by path, season & week range
function getFlights(query, cb) {
    FlightWeatherModel.find(query, (err, flights) => {
        if (err) {
            console.log(err);
            cb(err);
        } else if (!flights) {
            console.log("No flights");
            cb(null, flights);
        } else {
            cb(null, flights);
        }
    });
}

module.exports = {
    getFlight: getFlight
}