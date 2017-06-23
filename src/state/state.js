import { observable, action} from 'mobx';

export class Flow {
	@observable apiCall = 0;
	@observable saveCall = 0;
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

export class Stream {
	@observable run = true;
	toggleActive = function () {
		this.run = !this.run;
	}
}

export class Stock {
	@observable flows = {}
	@observable run = true;
	constructor(ticker) {
		this.ticker= ticker;
	}
	toggleActive = function() {
		this.run ? this.run = false : this.run = true;
	}
}

export const appState = observable({
	stocks: {},
	db: {},
	stream: {},
})
