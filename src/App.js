import React, { Component } from 'react';
import Rx from 'rxjs/Rx';

import './App.css';
import * as payloaders from './payloaders';
import { apiCall } from './utils';

const yahooUrl = ticker => 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.dividendhistory%20where%20symbol%20%3D%20%22' + ticker + '%22%20and%20startDate%20%3D%20%221900-01-01%22%20and%20endDate%20%3D%20%222013-12-31%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
const morningStarUrl = ticker => 'http://financials.morningstar.com/ajax/exportKR2CSV.html?region=USA&t=' + ticker;

const stockArray = ['MSFT'];

const yahooStream$ = Rx.Observable
	.interval(300)
	.take(stockArray.length)
	.map(x => stockArray[x])
	.mergeMap(x => apiCall(yahooUrl(x), 'GET'))
	.map(x => payloaders.yahooDivs(x));

const msStream$ = Rx.Observable
	.interval(100)
	.take(stockArray.length)
	.map(x => stockArray[x])
	.mergeMap(x => apiCall(morningStarUrl(x), 'GET'))
	.map(x => payloaders.morningStar(x));

const allStreams$ = Rx.Observable.merge(yahooStream$, msStream$);

const clicked = () => {
	allStreams$.subscribe(
		x => console.log(x),
		err => console.log(err),
		complete => console.log('completed')
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
