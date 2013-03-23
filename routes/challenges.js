var mongo = require('mongodb');
var BSON = mongo.BSONPure;

var app, db;

module.exports = function(env) {
	app = env.app;
	db = env.db;

	app.get('/challenges', getChallenges);
	app.get('/challenges/:id', getChallenge);
	app.get('/challenges/:id/page', getChallengePage);
}

function getChallenges (req, res, next) {
	var sort = parseInt(req.query.sort);
	console.log("sort=" + sort);

	db.collection('challenges', function(err, collection) {
		if (err) {
			console.log(err);
			return next(err);
		} else {
			var feed = { challenges: [] };

			var stream;

			if (sort == 1) {
				var stream = collection.find().sort({ submission_period_end_date : 1 }).stream();
			} else if (sort == 2) {
				var stream = collection.find().sort({ prize_money : -1 }).stream();
			} else {
				var stream = collection.find().sort({ posted_date : -1 }).stream();
			}

			stream.on('data', function(item) {

				if (item.posted_date)
					item.posted_date = item.posted_date.toString().substr(4, 11);

				if (item.submission_period_start_date)
					item.submission_period_start_date = item.submission_period_start_date.toString().substr(4, 11);

				// HACK until v1.1
				if (item.submission_period_end_date)
					item.submission_period_end_date = fixDate(item.submission_period_end_date.toString());

				if (item.judging_period_start_date)
					item.judging_period_start_date = item.judging_period_start_date.toString().substr(4, 11);

				if (item.judging_period_end_date)
					item.judging_period_end_date = item.judging_period_end_date.toString().substr(4, 11);

				if (item.public_voting_period_start_date)
					item.public_voting_period_start_date = item.public_voting_period_start_date.toString().substr(4, 11);

				if (item.public_voting_period_end_date)
					item.public_voting_period_end_date = item.public_voting_period_end_date.toString().substr(4, 11);

				if (item.winners_announced_date)
					item.winners_announced_date = item.winners_announced_date.toString().substr(4, 11);

				feed.challenges.push(item);
			});

			stream.on('end', function() {
				res.json(feed);
			});
		}
	})
}

function fixDate(d) {
	if (d) {
		d = d.toString().substr(4, 6) + ', ' + d.toString().substr(11, 4);
	}
	return d;
}

function getChallenge (req, res, next) {
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
						res.json(entry);
					} else {
						res.end();
					}
				}
			});
		}
	})
}

function getChallengePage (req, res, next) {
	console.log('GET /challenges/' + req.params.id + '/page');

	var oid = req.params.id;
	oid = oid ? BSON.ObjectID(oid) : null;
	console.log('oid = ' + oid);

	db.collection('challenges', function(err, collection) {
		if (err) {
			console.log(err);
			return next(err);
		} else {
			collection.findOne({_id: oid}, function(err, challenge) {
				if (err) {
					console.log(err);
					return next(err);
				} else {
					if (challenge) {

						challenge.submission_period_start_date = fixDate(challenge.submission_period_start_date);
						challenge.submission_period_end_date = fixDate(challenge.submission_period_end_date);
						challenge.winners_announced_date = fixDate(challenge.winners_announced_date);

						res.render('challengeDetail', {
							title: challenge.title
							, imageURL: challenge.image_url
							, poster: challenge.poster
							, summary: challenge.summary
							, prizeMoney: '$' + challenge.prize_money
							, submissionPeriodStartDate: challenge.submission_period_start_date
							, submissionPeriodEndDate: challenge.submission_period_end_date
							, winnersAnnouncedDate: challenge.winners_announced_date
						});
					} else {
						res.end();
					}
				}
			});
		}
	})
}
