// ==================================================================
// After connecting to mongo start listening for requests
// ==================================================================

var mongo = require('mongodb');
var BSON = mongo.BSONPure;
var express = require('express');
var http = require('http');
var xml2js = require('xml2js');
var weld = require('weld');
var jsdom = require('jsdom');
var fs = require('fs');
var path = require('path');


var app = express();
app.configure(function () {
	app.set('port', process.env.PORT || 8080);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

var db = new mongo.Db('challengedb',
	new mongo.Server('ds033047.mongolab.com', 33047, {auto_reconnect: true}),
	{w: 'majority'});

console.log('connecting to mongo');
db.open(function (err, client) {
	if (err) {
		console.log('error opening db: ' + err);
	} else {
		db.addListener("error", function (error) {
			console.log("db error: " + error);
		});

		client.authenticate('api-user', 'challengedb', function (err, success) {
			if (err) {
				console.log('error authenticating with database');
			} else {
				app.listen(app.get('port'), function () {
					console.log('listening on ' + app.get('port'));
				});
			}
		});
	}
});


// ==================================================================
// Routes
// ==================================================================

var env = {
	app: app,
	db: db
}

var routes = require('./routes')(env)
	, about = require('./routes/about')(env)
	, challenges = require('./routes/challenges')(env)
	;


app.get('/info', function (req, res, next) {
	res.setHeader('Content-Type', 'text/html');
	res.send('<html><a href="http://challenge.gov">Challenge.gov</a></html>');
});


app.get('/challenges/:id', function (req, res, next) {
	console.log('GET /challenges/' + req.params.id);
	res.setHeader("Content-Type", "application/json");

	var oid = req.params.id;
	oid = oid ? BSON.ObjectID(oid) : null;
	console.log('oid = ' + oid);

	db.collection('challenges', function (err, collection) {
		if (err) {
			console.log(err);
			return next(err);
		} else {
			collection.findOne({_id: oid}, function (err, entry) {
				if (err) {
					console.log(err);
					return next(err);
				} else {
					if (entry) {
						res.send('<html><a href="'
                + entry.url + '">'
                + entry.title
                + '</a></html>');
					} else {
						res.send('<html>Not found</html>')
					}
				}
			});
		}
	})
});


/**
 * Returns the requested ("bookmarked") challenges
 */
app.put('/bookmarks', function (req, res, next) {
	var ids = req.body.ids;
	console.log("GET /bookmarks: " + ids)
	getBookmarkedChallenges(ids, function (err, challenges) {
		if (err) {
			console.log(err);
			return next(err);
		} else {
			var result = { 'challenges': challenges };
			res.json(result);
		}
	});
});


/**
 * Returns the challenge.gov source feed in JSON format
 */
app.get('/remotefeed', function (req, res, next) {
	getFeed(function (err, json) {
		if (err) {
			console.log(err);
			return next(err);
		} else {
			res.json(json);
		}
	});
});


/**
 * Start a harvest job
 */
app.post('/jobs/harvest', function (req, res, next) {

	var harvestStatus = {
		time: Date(),
		status: "fail", // set to "success" if ok
		error: "",
		processedCount: 0,
		newCount: 0
	};

	function saveStatus(status, callback) {
		db.collection('harvestlog', function (err, collection) {
			var message = "save harvest status: ";

			if (err) {
				console.log(message + err);
				return callback(err);
			} else {
				collection.save(status, function (err, saved) {
					if (err) {
						console.log(message + err);
						return callback(err);
					} else {
						console.log(message + "success");
						return callback(null);
					}
				});
			}
		});
	};

	getFeed(function (err, data) {
		if (err) {
			console.log(err);
			harvestStatus.error = err;
			saveStatus(harvestStatus, function (error, success) {
				return next(err);
			});
		} else {
			saveFeed(data, function (err, processedCount, newCount) {
				if (err) {
					console.log(err);
					harvestStatus.error = err;
					saveStatus(harvestStatus, function (error, success) {
						return next(err);
					});
				} else {
					harvestStatus.status = "success";
					harvestStatus.processedCount = processedCount;
					harvestStatus.newCount = newCount;
					saveStatus(harvestStatus, function (error, success) {
						if (error) {
							return next(err);
						} else {
							// res.json(data)
							res.end();
						}
					});
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
function getFeed(callback) {
	var options = {
		host: 'challenge.gov',
		path: '/api/challenges.xml'
	};

	http.request(options,function (resp) {
		var xml = '';

		resp.on('data', function (chunk) {
			xml += chunk;
		});

		resp.on('end', function () {
			var parseOptions = {
				"explicitArray": false,
				"explicitRoot": false
			};

			xml2js.parseString(xml, parseOptions, function (err, data) {
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
	var challenges = data.challenge;
	var count = challenges.length;
	var processedCount = 0;
	var newCount = 0;

	challenges.reverse().forEach(function (item) {
		db.collection('challenges', function (err, collection) {
			if (err) {
				return callback(err);
			} else {
				collection.findOne({title: item.title}, function (err, entry) {
					if (err) {
						return callback(err);
					} else {
						processedCount++;

						if (entry) {
							console.log('entry exists: ' + entry.title);
							if (processedCount == count) {
								callback(null, processedCount, newCount);
							}
						} else {
							item.posted_date = Date();

							if (item.submission_period_start_date)
								item.submission_period_start_date = new Date(item.submission_period_start_date);

							if (item.submission_period_end_date)
								item.submission_period_end_date = new Date(item.submission_period_end_date);

							if (item.judging_period_start_date)
								item.judging_period_start_date = new Date(item.judging_period_start_date);

							if (item.judging_period_end_date)
								item.judging_period_end_date = new Date(item.judging_period_end_date);

							if (item.public_voting_period_start_date)
								item.public_voting_period_start_date = new Date(item.public_voting_period_start_date);

							if (item.public_voting_period_end_date)
								item.public_voting_period_end_date = new Date(item.public_voting_period_end_date);

							if (item.winners_announced_date)
								item.winners_announced_date = new Date(item.winners_announced_date);

							// convert prize to number
							if (item.prize_money)
								item.prize_money = Number(item.prize_money);

							collection.save(item, function (err, saved) {
								if (err) {
									return callback(err);
								} else {
									console.log("saved: " + item.title);
									newCount++;
									if (processedCount == count) {
										callback(null, processedCount, newCount);
									}
								}
							});
						}
					}
				});
			}
		})
	});
};


function fixDate(d) {
	if (d) {
		d = d.toString().substr(4, 6) + ', ' + d.toString().substr(11, 4);
	}
	return d;
}


function getBookmarkedChallenges(ids, callback) {
	var results = [];

	db.collection('challenges', function (err, collection) {
		if (err) {
			return callback(err);
		} else {
			var count = ids.length;
			ids.forEach(function (id) {
				var oid = BSON.ObjectID(id);
				collection.findOne({_id: oid}, function (err, challenge) {
					if (err) {
						return callback(err);
					} else {
						console.log(challenge);

						if (challenge.posted_date)
							challenge.posted_date = challenge.posted_date.toString().substr(4, 11);

						if (challenge.submission_period_start_date)
							challenge.submission_period_start_date = challenge.submission_period_start_date.toString().substr(4, 11);

						// HACK until v1.1
						if (challenge.submission_period_end_date)
							challenge.submission_period_end_date = fixDate(challenge.submission_period_end_date.toString());

						if (challenge.judging_period_start_date)
							challenge.judging_period_start_date = challenge.judging_period_start_date.toString().substr(4, 11);

						if (challenge.judging_period_end_date)
							challenge.judging_period_end_date = challenge.judging_period_end_date.toString().substr(4, 11);

						if (challenge.public_voting_period_start_date)
							challenge.public_voting_period_start_date = challenge.public_voting_period_start_date.toString().substr(4, 11);

						if (challenge.public_voting_period_end_date)
							challenge.public_voting_period_end_date = challenge.public_voting_period_end_date.toString().substr(4, 11);

						if (challenge.winners_announced_date)
							challenge.winners_announced_date = challenge.winners_announced_date.toString().substr(4, 11);

						results.push(challenge);

						count--;
						if (!count) {
							callback(null, results);
						}
					}
				});
			});
		}
	});
};




