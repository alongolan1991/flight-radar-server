const flightController = require('./controllers/flightController');
const flightValidator = require('./validators/flightValidator');
const db = require('./database/mongoInit');
const FlightWeatherModel = require('./database/models/flightWeatherModel');
const WeatherModel = require('./database/models/weatherModel');
const SeasonModel = require('./database/models/seasonModel');
const FlightModel = require('./database/models/flightModel');
const express = require('express');
const async = require('async');
const app = express();
const port = process.env.PORT || 3030;
const axios = require('axios');
var cors = require('cors');

const DAY = 86400000;

app.use(cors());

app.get('/flight-score', (req, res, cb) => {
    flightValidator.getFlight(req, function (validateErr) {
        if (validateErr) {
            res.send(err);
        } else {
            flightController.getFlight(req, function (err, flights) {
                if (err) {
                    res.send('Error');
                } else {
                    res.send(flights);
                }
            });
        }
    });
});


function getCrawler() {

    let baseUrl = 'https://flightradarcrawlerdata.azurewebsites.net';
    let tlvWeather;
    let madWeather;
    let tlvMadRoute;

    async.waterfall([
        // Get TLV weather and save in db
        function (asyncCb) {
            axios.post(`${baseUrl}/getWeather`, {
                lat: "32.005532",
                lon: "34.885411"
            }).then((res) => {
                tlvWeather = res.data;
                const weather = new WeatherModel(tlvWeather);
                weather.save((err, res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(res);
                        asyncCb(null);
                    }
                });
                console.log('TLV weather saved!');
                asyncCb(null);
            }).catch(function (err) {
                console.log(err);
            });
        },
        // Get TLV weather and save in db
        function (asyncCb) {
            axios.post(`${baseUrl}/getWeather`, {
                lat: "40.529342",
                lon: "-3.648067"
            }).then((res) => {
                madWeather = res.data;
                const weather = new WeatherModel(madWeather);
                weather.save((err, res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(res);
                        asyncCb(null);
                    }
                });
                console.log('MAD weather saved!');
                asyncCb(null);
            }).catch(function (err) {
                console.log(err);
            });
        },
        // Get TLV-MAD route (flight) and save in db
        function (asyncCb) {
            axios.post(`${baseUrl}/getFlight`, {
                "IataCode": "nh962"
            }).then((res) => {
                tlvMadRoute = res.data;
                async.eachSeries(tlvMadRoute, (current, cb) => {
                    const flight = new FlightModel(current);
                    flight.save((err, res) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(res);
                            cb();
                        }
                    });
                }, err => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Flights saved!');
                        asyncCb(null, 'done')
                    }
                });
                asyncCb(null, 'done')
            }).catch(function (err) {
                console.log(err);
                asyncCb(err)
            });
        },
    ], (err, res) => {
        if (err) {
            console.log(err);
        } else {
            console.log(res);
            calculateAverageBySeasonScheduler();
        }
    });
}

function calculateAverageBySeasonScheduler() {

    let seasonArray = [
        'Winter',
        'Summer',
        'Autumn',
        'Spring'
    ];

    async.eachSeries(seasonArray, (currentSeason, AsyncCb) => {

        FlightWeatherModel.find({ Season: currentSeason }, (err, flights) => {

            let averageWindObj = calcSuperAverage(flights);
            let standardDeviationObj = calcSuperStandardDeviation(flights, averageWindObj);
            let averageDelay = simpleAverage(flights);
            let standardDeviationDelay = simpleStandardDeviation(flights, averageDelay);
            let path = {
                from: flights[0].Origin,
                to: flights[0].Destination
            };
            let season = flights[0].Season;

            let seasonObjModel = {
                path: path,
                season: season,
                averageWind: averageWindObj,
                standardDeviation: standardDeviationObj,
                averageDelay: averageDelay,
                standardDeviationDelay: standardDeviationDelay
            };

            SeasonModel.findOneAndUpdate(
                { season: currentSeason },
                seasonObjModel,
                { upsert: true, new: true },
                (err, season) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(season);
                        AsyncCb();
                    }
                });
        });
    }).then(err => {
        console.log('Finito');
    });
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

function simpleAverage(items) {
    let sum = 0;

    items.forEach(item => {
        sum += item.Delay;
    });
    return sum / items.length;
}

function simpleStandardDeviation(items, average) {
    let sum = 0;

    items.forEach(item => {
        sum += Math.pow(item.Delay - average, 2);
    });
    return Math.sqrt(sum / items.length);
}

// setTimeout(() => {
//     getCrawler();
// }, DAY);


app.listen(port, () => console.log(`FlightRadar app listening on port ${port}!`))

