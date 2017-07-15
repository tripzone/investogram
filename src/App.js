import React, { Component } from 'react';
import Rx from 'rxjs/Rx';
import { observer } from 'mobx-react';
import classNames from 'classnames'

import './App.css';
import * as payloaders from './payloaders';
import { apiGet, dbPost, dbPatch, dbGet } from './utils/apis';
import {morningStarUrl, edgarAnnUrl, edgarQtrUrl, edgarTtmUrl, returnsUrl} from './utils/urls';
import {appState, Stock, Stream, Flow} from './state/state'


// const stockArray = ['AAPL', 'MSFT', 'SPY', 'IBM'];
// add new stream to this object, create RX stream, clicked handler

const saveToDatabase = (stock, collection, data) => {
	return new Promise((resolve, reject)=> {
		// appState.db && !!appState.db[stock] ? resolve(dbPatch(stock, collection, data)) : resolve(dbPost(stock, collection, data));
		resolve(dbPatch(stock, collection, data));
	});
}

const newStream = (interval, apiUrl, flow, payloader) => {
	const activeStocks = Object.keys(appState.stocks).filter((x)=>{return appState.stocks[x].active})
	return Rx.Observable
		.interval(interval)
		.takeWhile(function (x) { return !appState.cancel; })
		.take(activeStocks.length)
		.map(x => {return activeStocks[x]})
		.mergeMap(x => !appState.stocks[x].active ? Rx.Observable.empty() : Rx.Observable.fromPromise(apiGet(apiUrl(x)))
			.catch((err)=>{
					console.log( x, "Error in getting", flow)
					appState.stocks[x].flows[flow].callFailed();
					return Rx.Observable.empty();
				})
			.mergeMap(y => Rx.Observable.fromPromise(payloader(y, x)))
			.do(y => { console.log(x, ': got', flow); appState.stocks[x].flows[flow].apiCalled()})
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

// const allStreams$ = Rx.Observable.merge(msStream$, edgarAnnStream$, edgarQtrStream$, edgarTtmStream$ );

export const streams = {
	morningstar: {text: 'Morning Star'},
	edgarAnnual: {text: 'Edgar Annual'},
	edgarQtr: {text: 'Edgar Quarter'},
	edgarTtm: {text: 'Edgar TTM'},
	returnsP: {text: 'Returns'}
}

const runClicked = (streamState) => {
	const msStream$ = newStream(523, morningStarUrl, 	Object.keys(streams)[0], payloaders.morningstar);
	const edgarAnnStream$ = newStream(520, edgarAnnUrl, Object.keys(streams)[1] , payloaders.edgarAnnual);
	const edgarQtrStream$ = newStream(520, edgarQtrUrl, Object.keys(streams)[2] , payloaders.edgarQtr);
	const edgarTtmStream$ = newStream(500, edgarTtmUrl, Object.keys(streams)[3] , payloaders.edgarQtr);
	const returnsStream$ = newStream(1000, returnsUrl, Object.keys(streams)[4] , payloaders.returns);

	const streamFlows = {
		morningstar: msStream$,
		edgarAnnual: edgarAnnStream$,
		edgarQtr: edgarQtrStream$,
		edgarTtm: edgarTtmStream$,
		returnsP: returnsStream$,
	}

	appState.removeCancel();
	Object.keys(streamFlows).forEach((x)=>{
		if (streamState[x].active) {
			streamState[x].running = true;
			streamFlows[x].subscribe(x=>{}, err=>{}, comp=>{streamState[x].running = false;});
		}
	})
};

const cancelClicked = () => {
	appState.cancelIt();
};

// initialize state
appState.loadStocks = function() {
	dbGet('getStocks').then(stocksList => {
		stocksList.data.forEach(x => {
			this.stocks[x.ticker]= (new Stock(x.ticker))
			Object.keys(streams).forEach(y => {
				this.stocks[x.ticker].flows[y] = new Flow()
			})
		})
		this.loaded = true;
	})
}
appState.loadDBKeys = function() {
	dbGet('keys').then(
		x=> {this.db = x.data;
		console.log('DB loaded', x.data)
		}
	)
}
appState.loadStreams = function() {
	Object.keys(streams).forEach(x =>{
		this.stream[x] = new Stream();
	})
	console.log('streams loaded')
}
appState.activateAll = function() {
	Object.keys(this.stocks).forEach((x)=>{this.stocks[x].active=true});
}
appState.deActivateAll = function() {
	Object.keys(this.stocks).forEach((x)=>{this.stocks[x].active=false});
}
appState.selectFailed = function() {
	Object.keys(this.stocks).forEach((x)=>{
		this.stocks[x].active = false;
		Object.keys(this.stocks[x].flows).forEach((y)=> {
			if (this.stocks[x].flows[y].apiCall === 2 || this.stocks[x].flows[y].saveCall === 2) {
				this.stocks[x].active = true;
			}
		})
	})
}
appState.cancelIt = function() {
	this.cancel = true;
}
appState.removeCancel = function() {
	this.cancel = false;
}

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
				className={`app-stocks-title-text flow-text col s2 ${this.props.stream.active ? 'greenTopBorder' : null}`}
			>
				{this.props.text}
			</div>
		)
	}
}

@observer class App extends Component {
	componentWillMount() {
		appState.loadStocks();
		// appState.loadDBKeys();
		appState.loadStreams();
	}
	render() {

		let appRunning = false;
		Object.keys(appState.stream).forEach((x)=>{
			return appState.stream[x].running === true ? appRunning = true : null;
		})

		const cancelButtonStyle = classNames({
			"app-buttons-button waves-effect waves-light btn red ": true,
			"disabled": !appRunning,
		})

		return (
			<div className="app row">
				<div className="center app-buttons">
					<a className="app-buttons-button waves-effect waves-light btn-large" onClick={() => runClicked(appState.stream)}>Get All</a>
						<button className={cancelButtonStyle} id="cancelBtn" onClick={() => cancelClicked()}>Cancel</button>
				</div>
				<div className="center app-links">
					<a className="app-links-link" onClick={() => appState.activateAll()}>Select All</a>
					<a className="app-links-link" onClick={() => appState.deActivateAll()}>Select None</a>
					<a className="app-links-link" onClick={() => appState.selectFailed()}>Select Failed</a>
				</div>
				<div className="app-stocks-row row">
					<div className="app-stocks-title pp-stocks-cell col s12">
						<div className="app-stocks-title-text flow-text col s2 ">
							Stock
						</div>
						{Object.keys(streams).map((x) => {
							return <TitleBox key={x} stream={appState.stream[x]} text={streams[x].text}/>
						})}
					</div>
				</div>
				<div className="app-stocks ">
				{appState.loaded ? Object.keys(appState.stocks).map((x, index)=>{
				return (
					<div key={x} className={`app-stocks-row row ${appState.stocks[x].active ? 'greenBG' : null}`}>
						<div className="app-stocks-cell col s12">
							<div className="app-stocks-cell-index">{index}</div>

							<div className="app-stocks-cell-text col s2" onClick={() => appState.stocks[x].toggleActive()}>
								{appState.stocks[x].ticker}
							</div>
							{Object.keys(streams).map((y) => {
								return <FlowBox key={x+y} flow={appState.stocks[x].flows[y]} />
							})}
						</div>
					</div>
				)
				}) : null}
				</div>
			</div>
		);
	}
}

export default App;
