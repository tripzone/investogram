import React, { Component } from 'react';
import Rx from 'rxjs/Rx';
import { observer } from 'mobx-react';
import { observable, action} from 'mobx';

import './App.css';
import * as payloaders from './payloaders';
import { apiGet, dbPost, dbPatch, dbGet } from './utils/apis';

// const yahooDividendUrl = ticker => 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.dividendhistory%20where%20symbol%20%3D%20%22' + ticker + '%22%20and%20startDate%20%3D%20%221900-01-01%22%20and%20endDate%20%3D%20%222013-12-31%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
const morningStarUrl = ticker => 'http://financials.morningstar.com/ajax/exportKR2CSV.html?region=USA&t=' + ticker;

const edgarKey = 'q645uzsnjxgcrbhgensdbxfp'
const edgarPeriod = {annual : 'ann', quarter: 'qtr', ttm: 'ttm'}
const edgarUrl = (
	ticker,
	period = edgarPeriod.annual,
	numberOfPeriods = period === edgarPeriod.annual ? 5 : 20) => 'http://edgaronline.api.mashery.com/v2/corefinancials/'+period+'.json?primarysymbols='+ticker+'&numperiods='+numberOfPeriods+'&debug=true&appkey='+edgarKey;
const edgarAnnUrl = (x) => edgarUrl(x, edgarPeriod.annual);
const edgarQtrUrl = (x) => edgarUrl(x, edgarPeriod.quarter);
const edgarTtmUrl = (x) => edgarUrl(x, edgarPeriod.ttm);


const collections = { morningstar: 'morningstar', edgarAnn: 'edgarAnnual', edgarQtr: 'edgarQuarter',edgarTtm: 'edgarTtm', dividend: 'dividend'}
// const stockArray = ['AAPL', 'MSFT', 'SPY', 'IBM'];
const stockArray = ['AAPL'];

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
	@observable morningstar = new Flow('morningstar')
	@observable edgarAnnual = new Flow('edgarAnnual')
	@observable edgarQuarter = new Flow('edgarQuarter')
	@observable edgarTtm = new Flow('edgarTtm')
	@observable run = true;
	constructor(ticker) {
		this.ticker= ticker;
	}
	toggleActive = function() {
		this.run ? this.run = false : this.run = true;
	}
}

class Stream {
	@observable run = true;

	toggleActive = function () {
		this.run = !this.run;
	}
}

const appState = observable({
	stocks: {},
	db:{},
	stream:{
		morningstar: new Stream(),
		edgarAnnual: new Stream(),
		edgarQuarter: new Stream(),
		edgarTtm: new Stream(),
	}
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
		appState.db && !!appState.db[stock] ? resolve(dbPatch(stock, collection, data)) : resolve(dbPost(stock, collection, data));
	});
}

const newStream = (interval, apiUrl, flow, payloader) => {
	return Rx.Observable
		.interval(interval)
		.take(stockArray.length)
		.map(x => stockArray[x])
		.mergeMap(x => !appState.stocks[x].run ? Rx.Observable.empty() : Rx.Observable.fromPromise(apiGet(apiUrl(x)))
			.catch((err)=>{
					console.log( x, "Error in getting", flow)
					appState.stocks[x][flow].callFailed();
					return Rx.Observable.empty();
				})
			.map(y => payloader(y))
			.do(y => {console.log(x, ': got', flow); appState.stocks[x][flow].apiCalled()})
			.mergeMap(y => { return !y ? Rx.Observable.empty() : Rx.Observable.fromPromise(saveToDatabase(x, flow, y))
				.catch((err)=>{
					console.log( x, "Error in Save", err)
					appState.stocks[x][flow].saveFailed();
					return Rx.Observable.empty();
				})
			})
			.do(y=> {console.log(x, ': saved ', flow); appState.stocks[x][flow].saveSucceeded()})
		)
}

const streams = appState.stream;
const msStream$ = streams.morningstar.run ? newStream(1000, morningStarUrl, collections.morningstar, payloaders.morningstar) : Rx.Observable.empty();
const edgarAnnStream$ = streams.edgarAnnual.run ? newStream(1000, edgarAnnUrl, collections.edgarAnn , payloaders.edgarAnn) : Rx.Observable.empty();
const edgarQtrStream$ = streams.edgarQuarter.run ? newStream(2000, edgarQtrUrl, collections.edgarQtr , payloaders.edgarQtr) : Rx.Observable.empty();
const edgarTtmStream$ = streams.edgarTtm.run ? newStream(2000, edgarTtmUrl, collections.edgarTtm , payloaders.edgarQtr) : Rx.Observable.empty();

// const allStreams$ = Rx.Observable.merge(msStream$, edgarAnnStream$, edgarQtrStream$, edgarTtmStream$ );

const clicked = (streams) => {
	console.log(streams.morningstar.run, streams.edgarAnnual.run)
	if (streams.morningstar.run) { msStream$.subscribe()};
	if (streams.edgarAnnual.run) {edgarAnnStream$.subscribe()};
	if (streams.edgarQuarter.run) {edgarQtrStream$.subscribe()};
	if (streams.edgarTtm.run) {edgarTtmStream$.subscribe()};
	// allStreams$.subscribe(
	// 	x => {},
	// 	err => { console.log('ERROR', err)},
	// 	comp => { console.log('COMPLETED') }
	// );
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

@observer class TitleBox extends Component {
	render() {
		return (
			<div
				onClick={()=> this.props.stream.toggleActive()}
				className={`app-stocks-title-text flow-text col s2 ${this.props.stream.run ? 'greenBG' : null}`}
			>
				{this.props.stream.run ? 'y' :'n'}
				{this.props.text}
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
				<a className="waves-effect waves-light btn" onClick={() => clicked(appState.stream)}>Get All</a>
				{Object.keys(appState.db).map((x)=>{return x})}
				<button id="cancelBtn" onClick={() => canceled()}>Cancel</button>
				<div className="app-stocks-row row">
					<div className="app-stocks-title pp-stocks-cell col s12">
						<div className="app-stocks-title-text flow-text col s2 ">
							Stock
						</div>
						<TitleBox stream={appState.stream.morningstar} text='Morning Star'/>
						<TitleBox stream={appState.stream.edgarAnnual} text='Edgar Annual'/>
						<TitleBox stream={appState.stream.edgarQuarter} text='Edgar Quarter'/>
						<TitleBox stream={appState.stream.edgarTtm} text='Edgar Ttm'/>
					</div>
				</div>
				<div className="app-stocks ">
				{Object.keys(appState.stocks).map((x)=>{
				return (
					<div className={`app-stocks-row row ${appState.stocks[x].run ? 'greenBG' : null}`}>
						<div className="app-stocks-cell col s12">
							<div className="app-stocks-cell-text col s2" onClick={() => appState.stocks[x].toggleActive()}>{appState.stocks[x].ticker}</div>
							{appState.stocks[x].run ? 'yes' : 'no'}
							<FlowBox flow={appState.stocks[x].morningstar} />
							<FlowBox flow={appState.stocks[x].edgarAnnual} />
							<FlowBox flow={appState.stocks[x].edgarQuarter} />
							<FlowBox flow={appState.stocks[x].edgarTtm} />
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
