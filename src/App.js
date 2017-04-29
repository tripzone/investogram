import React, { Component } from 'react';
import Rx from 'rxjs/Rx';

import './App.css';
import * as payloaders from './payloaders';
import { apiGet, apiPost } from './utils/apis';

const yahooDividendUrl = ticker => 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.dividendhistory%20where%20symbol%20%3D%20%22' + ticker + '%22%20and%20startDate%20%3D%20%221900-01-01%22%20and%20endDate%20%3D%20%222013-12-31%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
const morningStarUrl = ticker => 'http://financials.morningstar.com/ajax/exportKR2CSV.html?region=USA&t=' + ticker;

const stockArray = ['AAPL', 'MSFT'];

const yahooDividendStream$ = Rx.Observable
	.interval(1000)
	.take(stockArray.length)
	.map(x => stockArray[x])
	.mergeMap(x => Rx.Observable.fromPromise(apiGet(yahooDividendUrl(x)))
		.map(y => payloaders.yahooDivs(y))
		.mergeMap(y => Rx.Observable.fromPromise(apiPost(x, 'dividends', y))
			// .catch(z => {console.log('error inside the post'); throw 'error inside the post'})
		)
		// .catch(z => {console.log('error inside the get'); throw 'error inside the get'})
	)

const msStream$ = Rx.Observable
	.interval(3000)
	.take(stockArray.length)
	.map(x => stockArray[x])
	.mergeMap(x => Rx.Observable.fromPromise(apiGet(morningStarUrl(x)))
		.map(y => payloaders.morningStar(y))
		.do(y => console.log('payload from ms', y))
		.mergeMap(y => Rx.Observable.fromPromise(apiPost(x, 'ms', y))
			// .catch(z => {console.log('error inside the post'); throw 'error inside the post'})
		)
		// .catch(z => {console.log('error inside the get'); throw 'error inside the get'})
	);

const allStreams$ = Rx.Observable.merge(yahooDividendStream$, msStream$);

const clicked = () => {
	allStreams$.subscribe(
		x => {},
		err => { console.log('ERROR', err)},
		comp => { console.log('COMPLETED') }
	);
};

const canceled = () => {
	console.log('holla cancel');
};

class App extends Component {
	render() {
		return (
			<div className="App">
				<input id="input" />
				<button id="btn" onClick={() => clicked()}>Click</button>
				<button id="cancelBtn" onClick={() => canceled()}>Cancel</button>
			</div>
		);
	}
}

export default App;
