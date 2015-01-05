/**
 * Created by 3er on 12/8/14.
 */


//Set the node environment variable if not set before
var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Module dependencies.
 */
var bodyParser = require('body-parser');
var config = require('./config/config');
var express = require('express');
var path = require('path');
var PRIVATE = require('./config/private')

// qiniu
var qiniu = require('qiniu')
qiniu.conf.ACCESS_KEY = PRIVATE.qiniu.access_key
qiniu.conf.SECRET_KEY = PRIVATE.qiniu.secret_key

// express
var app = express()
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));
var port = process.env.NODE_PORT || config.port;

// Bootstrap routes
require('./routes')(app, qiniu, PRIVATE);

var web = function (app, port) {
    var server = app.listen(port, function () {
        var host = server.address().address
        var port = server.address().port
        console.log('Example app listening at http://%s:%s', host, port)
    })
}

web(app, port);
