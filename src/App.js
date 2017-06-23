import React, { Component } from 'react';
import Rx from 'rxjs/Rx';
import { observer } from 'mobx-react';

import './App.css';
import * as payloaders from './payloaders';
import { apiGet, dbPost, dbPatch, dbGet } from './utils/apis';
import {morningStarUrl, edgarAnnUrl, edgarQtrUrl, edgarTtmUrl} from './utils/urls';
import {appState, Stock, Stream, Flow} from './state/state'

const stockArray = ['AAPL', 'MSFT', 'SPY', 'IBM'];
// add new stream to this object, create RX stream, clicked handler
export const streams = {
	morningstar: 'Morning Star',
	edgarAnnual: 'Edgar Annual',
	edgarQtr: 'Edgar Quarter',
	edgarTtm: 'Edgar TTM'
}

// initialize state
appState.loadStocks = function() {
	stockArray.forEach(x => {
		this.stocks[x]= (new Stock(x))
		Object.keys(streams).forEach(y => {
			this.stocks[x].flows[y] = new Flow()
		})
	})
}
appState.loadDBKeys = function() {
	dbGet('keys').then(x=> {this.db = x.data})
}
appState.loadStreams = function() {
	Object.keys(streams).forEach(x =>{
		this.stream[x] = new Stream();
	})
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
					appState.stocks[x].flows[flow].callFailed();
					return Rx.Observable.empty();
				})
			.map(y => payloader(y))
			.do(y => {console.log(x, ': got', flow); appState.stocks[x].flows[flow].apiCalled()})
			.mergeMap(y => { return !y ? Rx.Observable.empty() : Rx.Observable.fromPromise(saveToDatabase(x, flow, y))
				.catch((err)=>{
					console.log( x, "Error in Save", err)
					appState.stocks[x].flows[flow].saveFailed();
					return Rx.Observable.empty();
				})
			})
			.do(y=> {console.log(x, ': saved ', flow); appState.stocks[x].flows[flow].saveSucceeded()})
		)
}

const msStream$ = newStream(1000, morningStarUrl, 'morningstar', payloaders.morningstar);
const edgarAnnStream$ = newStream(1000, edgarAnnUrl, 'edgarAnnual' , payloaders.edgarAnnual);
const edgarQtrStream$ = newStream(2000, edgarQtrUrl, 'edgarQtr' , payloaders.edgarQtr);
const edgarTtmStream$ = newStream(2000, edgarTtmUrl, 'edgarTtm' , payloaders.edgarQtr);
// const allStreams$ = Rx.Observable.merge(msStream$, edgarAnnStream$, edgarQtrStream$, edgarTtmStream$ );

const clicked = (streams) => {
	if (streams.morningstar.run) { msStream$.subscribe()};
	if (streams.edgarAnnual.run) {edgarAnnStream$.subscribe()};
	if (streams.edgarQtr.run) {edgarQtrStream$.subscribe()};
	if (streams.edgarTtm.run) {edgarTtmStream$.subscribe()};
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
				{this.props.text}
			</div>
		)
	}
}

@observer class App extends Component {
	componentWillMount() {
		appState.loadStocks();
		appState.loadDBKeys();
		appState.loadStreams();
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
						{Object.keys(streams).map((x) => {
							return <TitleBox stream={appState.stream[x]} text={streams[x]}/>
						})}
					</div>
				</div>
				<div className="app-stocks ">
				{Object.keys(appState.stocks).map((x)=>{
				return (
					<div className={`app-stocks-row row ${appState.stocks[x].run ? 'greenBG' : null}`}>
						<div className="app-stocks-cell col s12">
							<div className="app-stocks-cell-text col s2" onClick={() => appState.stocks[x].toggleActive()}>{appState.stocks[x].ticker}</div>
							{Object.keys(streams).map((y) => {
								return <FlowBox flow={appState.stocks[x].flows[y]} />
							})}
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
