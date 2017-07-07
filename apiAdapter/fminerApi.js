const express = require('express');
const bodyParser = require('body-parser');
// const mongo = require('./mongoAdapter.js');
const firebase = require('./firebaseAdapter.js');
const Rx = require('rxjs/Rx');
// const diff = require('deep-diff').diff;
const Papa = require('babyparse');
const fs = require('fs');
var path = require('path');

const app = express();

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, HEAD, OPTIONS, PUT')
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, collection');
	next();
});

app.use(bodyParser.json());

const portListen = 7500;
app.listen(portListen);
console.log('Listening on port ' + portListen + '...');

// ENDPOINTS
app.get('/', getAll);
app.get('/keys', getRootKeys);
app.get('/getStocks', getStocks)
app.get('/:id', getId);
app.post('/:id' , post);
app.patch('/:id', patch);
app.delete('/:id', deleteId);
app.get('/:id/keys', getKeys);
app.get('/:id/keysdeep', getKeysDeep);
app.get('/:id/:child', getChild);
// app.get('/:id/test', testId);

const collection = 'collection';
const mongoData = 'data';
const success = { success: 1 };
const fail = { success: 0 };

function post(req, res) {
	// set up request parameters
	const data = req.body;
	const collect = req.header('collection');
	const stock = req.params.id;
	let mongoBody = req;
	mongoBody = Object.assign({}, { data }, { _id: req.params.id, stock: req.params.id });

	// const mongoPost$ = new Rx.Observable.fromPromise(mongo.post(collect, mongoBody))
	// 	.catch(x => {
	// 		if (x.code === 11000) {
	// 			throw { error: 'MONGO_POST_FAILED_DUPLICATED_KEY', desc: x }
	// 		} else {
	// 			throw ({error: 'MONGO_POST_FAILED_GENERAL', desc: x})
	// 		}
	// 	})

	const firebasePost$ = new Rx.Observable.fromPromise(firebase.patchChild(collect, stock, data))
		.catch((x) => {console.log(x); throw({error: 'FIREBASE_POST_FAILED', desc: x}) })

	const post$ = new Rx.Observable.combineLatest(firebasePost$)
		.subscribe(
			x => {},
			err => res.status(500).send(err),
			comp => res.status(200).send(success)
		)
}

function getAll(req, res) {
	firebase.getId().then(
		x => res.status(200).send(x),
		err => res.status(500).send(err)
	);
}

function getId(req, res) {
	// mongo.getId(req.header(collection), req.params.id).then((x)=> res.status(200).send(x));
	const stock = req.params.id;
	firebase.getId(stock).then(
		x => res.status(200).send(x),
		err => res.status(500).send(err)
	);
}

function getChild(req, res ) {
	const stock = req.params.id;
	const child = req.params.child;
	firebase.getIdChild(stock, child).then(
		x => res.status(200).send(x),
		err => res.status(500).send(err)
	);
}

function patch(req, res) {
	// mongo.patch(req).then((x)=> res.status(200).send(success));
	const stock = req.params.id;
	const data = req.body;
	const collect = req.header(collection);
	// const mongoPatch$ = Rx.Observable.fromPromise(mongo.patchChild(stock, collect, data, mongoData))
	// 	.catch((x) => { throw({error: 'MONGO_PATCH_FAILED', desc: x }) })
	const firebasePatch$ = Rx.Observable.fromPromise(firebase.patchChild(collect, stock, data))
		.catch((x) => { throw {error: 'FIREBASE_PATCH_FAILED', desc: x } })

	return Rx.Observable.combineLatest(firebasePatch$)
		.subscribe(
			x => {},
			err => res.status(500).send(err),
			comp => res.status(200).send(success)
		)
}

function deleteId(req, res) {
	const stock = req.params.id;
	const collect = req.header(collection);
	// const mongoDelete$ = Rx.Observable.fromPromise(mongo.deleteId(stock, collect))
	// 	.catch(x => { throw({ error: 'MONGO_PATCH_FAILED', desc: x }) });
	const firebaseDelete$ = Rx.Observable.fromPromise(firebase.deleteId(collect, stock))
		.catch(x => { throw({ error: 'FIREBASE_PATCH_FAILED', desc: x }) });

	return Rx.Observable.combineLatest(firebaseDelete$)
		.subscribe(
			x => {},
			err => res.status(500).send(err),
			comp => res.status(200).send(success)
		)
}

function getRootKeys(req, res) {
	firebase.getAllKeys('').then(
		x=> res.status(200).send(x),
		err => res.status(500).send(err)
	)
}

function getKeys(req, res) {
	const stock = req.params.id;
	firebase.getKeys(stock).then(
		x => res.status(200).send(x),
		err => res.status(500).send(err)
	);
}

function getKeysDeep(req, res) {
	const stock = req.params.id;
	firebase.getKeysDeep(stock).then(
		x => res.status(200).send(x),
		err => res.status(500).send(err)
	);
}

// function testId(req, res) {
// 	const stock = req.params.id;
// 	const collect = req.header(collection);
//
// 	const mongoGetId$ = Rx.Observable.fromPromise(mongo.getId(collect, stock))
// 		.catch(x => { throw({ error: 'MONGO_GETID_FAILED', desc: x }) })
// 	const firebaseGetId$ = Rx.Observable.fromPromise(firebase.getIdChild(stock, collect))
// 		.catch(x => { throw({ error: 'FIREBASE_GETID_FAILED', desc: x }) })
//
// 	mongoGetId$.combineLatest(firebaseGetId$)
// 		.subscribe(
// 			x => {
// 				if (x && x[0] && x[1] && x[0][0]) {
// 					const mongo = x[0][0][mongoData];
// 					const fire = x[1];
// 					const response = diff(mongo, fire);
// 					res.status(200).send(!response ? success : Object.assign({}, response, fail))
// 				} else {
// 					res.status(500).send(Object.assign({}, fail, { body: 'no object returned in search' }))
// 				}
// 			},
// 			err => res.status(500).send(err)
// 		)
// }

function getStocks(req, res) {
	const file = (path.join(__dirname, '/../public/assets/stocks.csv'))
	const content = fs.readFileSync(file, { encoding: 'binary' });
	const payload = []
	Papa.parse(content, {
			header: true,
			step: function(row){
					payload.push({
						ticker: row.data[0].ticker,
						name: row.data[0].name,
						industry: row.data[0].industry,
						sector: row.data[0].sector,
						marketCap: row.data[0].marketCap,
						spy: !!row.data[0].spy,
						qqq: !!row.data[0].qqq,
						dow: !!row.data[0].dow,
					})
			},
			error: function(error) {
				res.status(500).send(error)
			}
		});
	res.status(200).send(payload);
}
