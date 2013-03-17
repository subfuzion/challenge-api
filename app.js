// ==================================================================
// After connecting to mongo start listening for requests
// ==================================================================

var mongo = require('mongodb');
var BSON = mongo.BSONPure;
var express = require('express');
var http = require('http');
var xml2js = require('xml2js');

var app = express();
app.use(express.bodyParser());

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
    res.send('<a href="challenges">Challenges</a>');
});


app.get('/info', function(req, res, next) {
    res.setHeader('Content-Type', 'text/html');
    res.send('<html><a href="http://challenge.gov">Challenge.gov</a></html>');
});


app.get('/challenges/:id', function(req, res, next) {
    console.log('GET /challenges/' + req.params.id);
	res.setHeader("Content-Type", "application/json");

	var oid = req.params.id;
	oid = oid ? BSON.ObjectID(oid) : null;
	console.log('oid = ' + oid);

    db.collection('challenges', function(err, collection) {
        if (err) {
          console.log(err);
          return next(err);
        } else {
            collection.findOne({_id: oid}, function(err, entry) {
                if (err) {
                  console.log(err);
                  return next(err);
                } else {
                    if (entry) {
                        res.send('<html><a href="' + entry.url + '">' + entry.title + '</a></html>');
                    } else {
                        res.send('<html>Not found</html>')
                    }
                }
            });
        }
    })
});


/**
 * Returns challenges
 */
app.get('/challenges', function(req, res, next) {
    var sort = parseInt(req.query.sort);
    console.log("sort=" + sort);

    db.collection('challenges', function(err, collection) {
        if (err) {
          console.log(err);
          return next(err);
        } else {
            var feed = { challenges: [] };

            var stream = collection.find().stream();

            stream.on('data', function(data) {
                feed.challenges.push(data);
            });

            stream.on('end', function() {
                res.json(feed);
            });
        }
    })
});


/**
 * Returns the requested ("bookmarked") challenges
 */
app.put('/bookmarks', function(req, res, next) {
    var ids = req.body.ids;
    console.log("GET /bookmarks: " + ids)
    getBookmarkedChallenges(ids, function(err, challenges) {
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
app.get('/remotefeed', function(req, res, next) {
    getFeed(function(err, json) {
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
app.post('/jobs/harvest', function(req, res, next) {
	getFeed(function(err, data) {
		if (err) {
			return next(err);
		} else {
			saveFeed(data, function(err, success) {
				if (err) {
                    console.log(err);
                    return next(err);
                } else {
                    res.json(data)
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

        // todo: handle sort

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


function getBookmarkedChallenges(ids, callback) {
    var results = [];

    db.collection('challenges', function(err, collection) {
        if (err) {
            return callback(err);
        } else {
            var count = ids.length;
            ids.forEach(function(id) {
                var oid = BSON.ObjectID(id);
                collection.findOne({_id: oid}, function(err, challenge) {
                    if (err) {
                        return callback(err);
                    } else {
                        console.log(challenge);
                        results.push(challenge);

                        count--;
                        if(!count) {
                            callback(null, results);
                        }
                    }
                });
            });
        }
    });
};




