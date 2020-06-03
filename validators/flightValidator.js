const moment = require('moment');
const async = require('async');



function getFlight(req, cb) {

    let date = req.query.date;
    let from = req.query.from;
    let to = req.query.to;

    // async.waterfall([
    //     function(asyncCb) {
    //         if(!moment.isDate(date)){
    //             cb('Date is not Valid');
    //         } else {
    //             asyncCb(null, from);
    //         }
    //     },
    //     function(from, asyncCb) {
    //         if(!from){
    //             cb('From field is not valid');
    //         }
    //         callback(null, to);
    //     },
    //     function(to, asyncCb) {
    //         if(!to){
    //             cb('To field is not valid');
    //         }
    //         callback(null, 'done');
    //     }
    // ], function (err, result) {
    //     if(err){
    //         cb(err);
    //     } else {
    //         cb();
    //     }
    // });
    cb();
}


module.exports = {
    getFlight: getFlight
}