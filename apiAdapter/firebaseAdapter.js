// var firebase = require('firebase');
const admin = require('firebase-admin');
const request = require('request');
const Rx = require('rxjs/Rx');
const path = require('path');

const keys = require(path.join(__dirname, '/../private/keys.js'));
const secret = require(path.join(__dirname, '/../private/secret.json'));
const devkeys = require(path.join(__dirname, '/../private/devkeys.js'));
const devsecret = require(path.join(__dirname, '/../private/devsecret.json'));

const envUse = 'prod';

const secretUse = envUse === 'prod' ? secret : devsecret;
const fbUrl = envUse === 'prod' ? keys.firebaseUrl : devkeys.firebaseUrl;
const fbAuthId = envUse === 'prod' ? keys.firebaseAuthId : devkeys.firebaseAuthId;

admin.initializeApp({
	credential: admin.credential.cert(secretUse),
	databaseURL: fbUrl,
});
const db = admin.database();
const success = { success: 1 };
const fail = { success: 0 };
const queryUrl = '.json?auth=' + fbAuthId;
const shallowUrl = '&shallow=true';


const url = (home, child, shallow) => {
	const urlPath = shallow ? queryUrl + shallowUrl : queryUrl;
	return !child ? fbUrl + home + urlPath : fbUrl + home + '/' + child + urlPath;
};

const urlCatch = (home, child = false, shallow = false) => {
	return new Promise((resolve, reject) => {
		request(url(home, child, shallow), (err, response, body) => {
			return err ? reject(err) : resolve(body);
		});
	});
};

module.exports = {
	post: (home, data) => {
		const ref = db.ref(home);
		return new Promise((resolve, reject) => {
			ref.set(data,
				(err) => { err ? reject(err) : resolve(success); }
			);
		});
	},

	getId: (home) => {
		const ref = db.ref(home);
		return new Promise((resolve, reject) => {
			ref.once('value',
				result => resolve(result.val()),
				error => reject(error)
			);
		});
	},

	getIdChild: (home, child) => {
		return new Promise((resolve, reject) => {
			urlCatch(home, child)
				.then(x => resolve(JSON.parse(x)))
				.catch(err => reject(err))
		})
	},

	patchChild: (home, child, data) => {
		const ref = db.ref(home).child(child);
		return new Promise((resolve, reject) => {
			ref.update(data,
				(err) => { return err ? reject(err) : resolve(success) }
			);
		});
	},

	deleteId: (home, child) => {
		return new Promise((resolve, reject) => {
			if (child) {
				db.ref(home).child(child).remove((err) => {
					return err ? reject(err) : resolve(success);
				});
			} else {
				db.ref(home).remove((err) => {
					return err ? reject(err) : resolve(success);
				});
			}
		});
	},

	getAllKeys: ()=>{
		return new Promise((resolve, reject) => {
			urlCatch('', false, true)
			.then(x =>{
				resolve(x);
			}).catch( err => {reject(Object.assign(fail, { error: 'OBJECT_NOT_FOUND' }, {desc: err }))})
	})},

	getKeys: (home) => {
		return new Promise((resolve, reject) => {
			urlCatch(home, false, true).then(x => {
				if (!!x) {
					resolve(x)
				} else {
					reject(Object.assign(fail, { error: 'OBJECT_NOT_FOUND' }));
				}
			}).catch(err => {
				reject(Object.assign(fail, { error: 'OBJECT_NOT_FOUND' }, { desc: err }));
			});
		});
	},

	getKeysDeep: (home) => {
		const result = {};
		return new Promise((resolve, reject) => {
			urlCatch(home, false, true).then(x => {
				if (!!x) {
					const subRoots = Object.keys(JSON.parse(x));
					return Rx.Observable.from(subRoots)
							.mergeMap(x => Rx.Observable.fromPromise(urlCatch(home,x,true))
								.do(y => { return result[x] = Object.keys(JSON.parse(y)) })
							)
						.subscribe(x => { console.log('x', x) },
							err => reject(err),
							comp => resolve(result)
						)
				} else {
					reject(Object.assign(fail, { error: 'OBJECT_NOT_FOUND' }));
				}
			}).catch(err => {
				reject(Object.assign(fail, { error: 'OBJECT_NOT_FOUND' }, { desc: err }));
			});
		});
	},
};
