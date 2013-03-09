// ==================================================================
// After connecting to mongo start listening for requests
// ==================================================================

var mongo = require('mongodb');
var express = require('express');
var http = require('http');
var xml2js = require('xml2js');

var app = express();
app.use(express.bodyParser());
app.use(function(err, req, res, next) {
    // default response content type for our routes
    res.setHeader('Content-Type', 'application/json');
});

var db = new mongo.Db('challengedb',
	new mongo.Server('ds033047.mongolab.com', 33047, {auto_reconnect: true}),
	{w: 'majority'});

console.log('connecting to mongo');
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
    res.setHeader('Content-Type', 'text/html');
    res.send('<a href="feed">Challenges</a>');
});


app.get('/feed', function(req, res, next) {
    db.collection('challenges', function(err, collection) {
        if (err) {
          console.log(err);
          return next(err);
        } else {
            var challenges = [];
            
            var stream = collection.find().stream();
            
            stream.on('data', function(data) {
                challenges.push(data);
            });
            
            stream.on('end', function() {
               res.send(JSON.stringify(challenges));
            });
        }
    })
});


app.get('/remotefeed', function(req, res, next) {
	getFeed(function(err, json) {
		if (err) {
            console.log(err);
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
                    console.log(err);
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
        db.collection('challenges', function(err, collection) {
            if (err) {
                return callback(err);
            } else {
                collection.findOne({title: item.title}, function(err, entry) {
                    if (err) {
                        return callback(err);
                    } else {
                        if (entry) {
                            console.log('entry exists: ' + entry.title);
                        } else {
                            collection.save(item, function(err, saved) {
                                if (err) {
                                    return callback(err);
                                } else {
                                    console.log("saved: " + item.title);
                                }
                            });
                        }
                    }
                });
            }
        })
	});

	callback(null, true);
};

