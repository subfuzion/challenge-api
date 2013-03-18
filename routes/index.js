var app, db;

module.exports = function(env) {
	app = env.app;
	db = env.db;

	app.get('/', index);
}

function index(req, res){
  res.render('index', { title: 'Challenge.gov API' });
};
