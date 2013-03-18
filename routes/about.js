var app, db;

module.exports = function(env) {
	app = env.app;
	db = env.db;

	app.get('/about', about);
}

function about(req, res){
	res.render('about', { title: 'About Challenge.gov API' });
};
