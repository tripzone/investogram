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
	@observable active = true;
	@observable running = false;
	toggleActive = function () {
		this.active = !this.active;
	}
}

export class Stock {
	@observable flows = {}
	@observable active = true;
	constructor(ticker) {
		this.ticker= ticker;
	}
	toggleActive = function() {
		this.active ? this.active = false : this.active = true;
	}
}

export const appState = observable({
	stocks: {},
	db: {},
	stream: {},
	cancel: false,
})
