export const morningStarUrl = ticker => 'http://financials.morningstar.com/ajax/exportKR2CSV.html?region=USA&t=' + ticker;

const edgarKey = 'q645uzsnjxgcrbhgensdbxfp'
const edgarPeriod = {annual : 'ann', quarter: 'qtr', ttm: 'ttm'}
const edgarUrl = (
	ticker,
	period = edgarPeriod.annual,
	numberOfPeriods = period === edgarPeriod.annual ? 5 : 20) => 'http://edgaronline.api.mashery.com/v2/corefinancials/'+period+'.json?primarysymbols='+ticker+'&numperiods='+numberOfPeriods+'&debug=true&appkey='+edgarKey;
export const edgarAnnUrl = (x) => edgarUrl(x, edgarPeriod.annual);
export const edgarQtrUrl = (x) => edgarUrl(x, edgarPeriod.quarter);
export const edgarTtmUrl = (x) => edgarUrl(x, edgarPeriod.ttm);

// const yahooDividendUrl = ticker => 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.dividendhistory%20where%20symbol%20%3D%20%22' + ticker + '%22%20and%20startDate%20%3D%20%221900-01-01%22%20and%20endDate%20%3D%20%222013-12-31%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
