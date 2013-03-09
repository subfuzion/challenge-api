// ==================================================================
// After connecting to mongo start listening for requests
// ==================================================================

var mongo = require('mongodb');
var express = require('express');
var http = require('http');
var xml2js = require('xml2js');

var app = express();
app.use(express.bodyParser());

var db = new mongo.Db('challengedb',
	new mongo.Server('ds033047.mongolab.com', 33047, {auto_reconnect: true}),
	{w: 'majority'});

db.open(function(err, client) {
	if (err) {
		console.log('error opening db: ' + err);
	} else {
		db.addListener("error", function(error){
			console.log("db error: " + error);
		});

		client.authenticate('api-user', 'challengedb', function(err, success) {
			if (err) {
				console.log('error authenticating with database');
			} else {
				console.log('authenticated with database');
				var port = 8080;
				app.listen(port, function () {
					console.log('listening on ' + port);
				});
			}
		});
	}
});


// ==================================================================
// Routes
// ==================================================================

app.get('/', function(req, res, next) {
});


app.get('/feed', function(req, res, next) {
	getFeed(function(err, json) {
		if (err) {
			return next(err);
		} else {
			res.end(JSON.stringify(json));
		}
	});
});


app.get('/harvest', function(req, res, next) {
	getFeed(function(err, data) {
		if (err) {
			return next(err);
		} else {
			saveFeed(data, function(err, success) {
				if (err) {
					return next(err);
				} else {
					res.end(JSON.stringify(data));
				}
			});
		}
	});

});


// ==================================================================
// Implementation
// ==================================================================

/**
 * Returns the latest government challenges as a javascript object.
 * @param callback
 */
function getFeed(callback)
{
	var options = {
		host: 'challenge.gov',
		path: '/api/challenges.xml'
	};

	http.request(options, function(resp) {
		var xml = '';

		resp.on('data', function(chunk) {
			xml += chunk;
		});

		resp.on('end', function() {
			var parseOptions = {
				"explicitArray": false,
				"explicitRoot": false
			};

			xml2js.parseString(xml, parseOptions, function(err, data) {
				if (err) {
					return callback(err);
				} else {
					callback(null, data);
				}
			});
		})
	}).end();
};


function saveFeed(data, callback) {
	data.challenge.reverse().forEach(function(item) {
		var challenge = item;
	});

	callback(null, data);
};

