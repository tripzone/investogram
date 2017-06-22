import React, { Component } from 'react';
import Rx from 'rxjs/Rx';
import { observer } from 'mobx-react';
import { observable, action} from 'mobx';

import './App.css';
import * as payloaders from './payloaders';
import { apiGet, dbPost, dbPatch, dbGet } from './utils/apis';

const yahooDividendUrl = ticker => 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.dividendhistory%20where%20symbol%20%3D%20%22' + ticker + '%22%20and%20startDate%20%3D%20%221900-01-01%22%20and%20endDate%20%3D%20%222013-12-31%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
const morningStarUrl = ticker => 'http://financials.morningstar.com/ajax/exportKR2CSV.html?region=USA&t=' + ticker;
const collections = { ms: 'morningStar', dividend: 'dividend'}
const stockArray = ['SPY', 'MSFT'];
const sources = ['morningStar']

class Flow {
	@observable apiCall = 0;
	@observable saveCall = 0;
	constructor(source){
		this.source = source;
	}
	apiCalled = function() {
		this.apiCall = 1;
	}
	callFailed = function() {
		this.apiCall = 2;
	}
	saveSucceeded = function() {
		this.saveCall = 1
	}
	saveFailed = function() {
		this.saveCall = 2;
	}
}

class Stock {
	@observable msFlow = new Flow('ms')
	@observable edgarFlow = new Flow('edgarFlow')
	constructor(ticker) {
		this.ticker= ticker;
	}
}
const appState = observable({
	stocks: {},
	db:{},
})
appState.loadStocks = function() {
	stockArray.forEach(x => {
		this.stocks[x]= (new Stock(x))
	})
}
appState.loadDBKeys = function() {
	dbGet('keys').then(x=> {this.db = x.data})

}


const saveToDatabase = (stock, collection, data) =>{
	return new Promise((resolve, reject)=> {
		!!appState.db[stock] ? resolve(dbPatch(stock, collection, data)) : resolve(dbPost(stock, collection, data));
	});
}

// not working anymore
const yahooDividendStream$ = Rx.Observable
	.interval(1000)
	.take(stockArray.length)
	.map(x => stockArray[x])
	.mergeMap(x => Rx.Observable.fromPromise(apiGet(yahooDividendUrl(x)))
		.catch((err)=>{
				console.log( x, "Error in getting Edgar.")
				appState.stocks[x].edgarFlow.callFailed();
				return Rx.Observable.empty();
			})
		.map(y => payloaders.yahooDivs(y))
		.do(y => {console.log(x, ': got MS'); appState.stocks[x].edgarFlow.apiCalled()})
		.mergeMap(y => Rx.Observable.fromPromise(saveToDatabase({}, collections.dividend, y))
				.catch((err)=>{
					console.log( x, "Error in Save", err)
					appState.stocks[x].edgarFlow.saveFailed();
					return Rx.Observable.empty();
				}))
		.do(y=> {console.log(x, ': saved MS'); appState.stocks[x].edgarFlow.saveSucceeded()})
	)

const msStream$ = Rx.Observable
	.interval(1000)
	.take(stockArray.length)
	.map(x => stockArray[x])
	.mergeMap(x => Rx.Observable.fromPromise(apiGet(morningStarUrl(x)))
		.catch((err)=>{
				console.log( x, "Error in getting MS.")
				appState.stocks[x].msFlow.callFailed();
				return Rx.Observable.empty();
			})
		.map(y => payloaders.morningStar(y))
		.do(y => {console.log(x, ': got MS'); appState.stocks[x].msFlow.apiCalled()})
		.mergeMap(y => { return !y ? Rx.Observable.empty() : Rx.Observable.fromPromise(saveToDatabase(x, collections.ms, y))
			.catch((err)=>{
				console.log( x, "Error in Save", err)
				appState.stocks[x].msFlow.saveFailed();
				return Rx.Observable.empty();
			})
		})
		.do(y=> {console.log(x, ': saved MS'); appState.stocks[x].msFlow.saveSucceeded()})
	)
;

const allStreams$ = Rx.Observable.merge(msStream$, yahooDividendStream$);

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

@observer class FlowBox extends Component {
	render() {
		return(
			<div className="app-stock-cell-boxes col s2">
				<div className={`app-stocks-cell-box call-status-${this.props.flow.apiCall}`} >GET</div>
				<div className={`app-stocks-cell-box call-status-${this.props.flow.saveCall}`} >SAVE</div>
			</div>
		)
	}
}

@observer class App extends Component {
	componentWillMount() {
		appState.loadStocks();
		appState.loadDBKeys();
	}
	render() {
		return (
			<div className="app row">
				<a className="waves-effect waves-light btn" onClick={() => clicked()}>Get All</a>
				{Object.keys(appState.db).map((x)=>{return x})}
				<button id="cancelBtn" onClick={() => canceled()}>Cancel</button>
				<div className="app-stocks-row row">
					<div className="app-stocks-title pp-stocks-cell col s12">
						<div className="app-stocks-title-text flow-text col s2 ">
							Stock
						</div>
						<div className="app-stocks-title-text flow-text col s2 ">
							MS
						</div>
						<div className="app-stocks-title-text flow-text col s2 ">
							Edgar
						</div>
					</div>
				</div>
				<div className="app-stocks ">
				{Object.keys(appState.stocks).map((x)=>{
				return (
					<div className="app-stocks-row row">
						<div className="app-stocks-cell col s12">
							<div className="app-stocks-cell-text col s2">{appState.stocks[x].ticker}</div>
							<FlowBox flow={appState.stocks[x].msFlow} />
							<FlowBox flow={appState.stocks[x].edgarFlow} />
						</div>
					</div>
				)
				})}
				</div>
			</div>
		);
	}
}

export default App;
