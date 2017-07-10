import Papa from 'papaparse';
import { dbGet } from './utils/apis';
import { streams } from './App.js';
import moment from 'moment';

export const yahooDivs = (x) => {
	const dividends = {};
	const response = x.query.results.quote;
	response.forEach((item) => {
		dividends[item.Date] = parseFloat(item.Dividends);
	});
	return {};
};

export const edgar = (x, reportType) => {
	return new Promise((resolve, reject)=> {
		if (x.result) {
			if(x.result.totalrows > 0) {
				const parsedResults =  x.result.rows.map((row) => {
					let rowObject = {}
					row.values.forEach((value) => {
						rowObject[value.field]=value.value;
					});
					return rowObject;
				})
				let periodObject = {}
				parsedResults.forEach((period) => {
					const keyValue = reportType === 'ann' ? period.fiscalyear : period.fiscalyear+'q'+period.fiscalquarter;
					periodObject[keyValue] = period;
				})
				resolve(periodObject);
			}
			resolve(null);
		}
		resolve(null);
	})
}

export const edgarAnnual = (x) => {
	return edgar(x, 'ann');
}
export const edgarQtr = (x) => {
	return edgar(x, 'qtr');
}

export const morningstar = (x) => {
	const skipFields = ['Margins % of Sales', 'Profitability', 'Year over Year', 'Cash Flow Ratios', 'Balance Sheet Items (in %)', 'Liquidity/Financial Health', 'Efficiency', '', '3-Year Average', '5-Year Average', '10-Year Average', 'Revenue', 'Total Assets', 'Gross Margin', 'Operating Margin %', 'Asset Turnover (Average)'];
	const addToTitle = {
		'COGS': ' % rev',
		'Gross Margin': ' % rev',
		'SG&A': ' % rev',
		'R&D': ' % rev',
		'Operating Margin': ' % rev',
		'Net Int Inc & Other': ' % rev',
		'EBT Margin': ' % rev',
		'Cash & Short-Term Investments': ' % assets',
		'Accounts Receivable': ' % assets',
		'Inventory': ' % assets',
		'Other Current Assets': ' % assets',
		'Total Current Assets': ' % assets',
		'Net PP&E': ' % assets',
		'Intangibles': ' % assets',
		'Other Long-Term Assets': ' % assets',
		'Total Assets': ' % assets',
		'Accounts Payable': ' % liab&eq',
		'Short-Term Debt': ' % liab&eq',
		'Taxes Payable': ' % liab&eq',
		'Accrued Liabilities': ' % liab&eq',
		'Other Short-Term Liabilities': ' % liab&eq',
		'Total Current Liabilities': ' % liab&eq',
		'Long-Term Debt': ' % liab&eq',
		'Other Long-Term Liabilities': ' % liab&eq',
		'Total Liabilities': ' % liab&eq',
		"Total Stockholders' Equity": ' % liab&eq',
	};
	const replaceText = [' CAD', ' USD', ' *', '#', '$', '[', ']'];
	const parsedText = Papa.parse(x, {
		dynamicTyping: true,
		skipEmptyLines: true,
	});

	return new Promise((resolve, reject)=> {
		// extract years
		if (parsedText.data.length !== 0) {
			const years = parsedText.data[2].map((item) => {
				if (item === 'TTM') {
					return 'TTM';
				}
				return new Date(item).getFullYear();
			});
			years.splice(0, 1);

			// map data to corresponding year
			const data = {};
			parsedText.data.forEach((item) => {
				let title = item[0];
				replaceText.forEach((y) => { title = title.replace(y, ''); });
				title = title.replace('/', '|');
				title = addToTitle[title] ? title + addToTitle[title] : title;
				if (item.length > 1 && !skipFields.includes(item[0])) {
					// get rid of the title
					const itemWithoutTitle = item.splice(1, item.length);
					itemWithoutTitle.forEach((value, index) => {
						if (!data[years[index]]) {
							data[years[index]] = {};
						}
						data[years[index]][title] = value;
					});
				}
			});
			resolve(data);
		}
		resolve(null);
	})	
};

const findPriceLine = (parsedData, targetDay) => {
	let arrayLength;
	let priceLine
	let count = 0;
	do {
		priceLine = parsedData.data.filter((x)=>x.Date === targetDay.format('YYYY-MM-DD'));
		arrayLength = priceLine.length;
		arrayLength === 0 ?  targetDay.add(-1, 'days') : null;		
		count ++;	
	}
	while (arrayLength === 0 && count < 8)
	return priceLine[0];
}

export const returns = (data, stock) =>{
	return new Promise((resolve, reject)=> {
		const collections = [Object.keys(streams)[2]];
		const parsedData = Papa.parse(data, {
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true,
		});

		collections.map((collection) => {
			let payload = {};
			dbGet(collection+'/'+stock).then((collectionData)=>{
				Object.keys(collectionData.data).map(
					(periodKey) => 
					{
						payload[periodKey]={};
						const targetDay = moment(collectionData.data[periodKey].periodenddate);
		
						let priceLine;

						const targetOffsets = [0, 7,14,30,90]
						const targetCopy = targetDay;

						let lastOffset = 0;
						targetOffsets.forEach((offset) => {
							targetCopy.add(offset - lastOffset, 'days')
							lastOffset= offset;
							priceLine = findPriceLine(parsedData, targetCopy)
							if (priceLine) {
								payload[periodKey][offset+'dayPrice'] = priceLine['Adj. Close'];
								payload[periodKey][offset+'dayDate'] = moment(priceLine['Date']).format('MM-DD-YYYY');
							}
						})
					}
				);
			console.log(stock, ':calculated returns')
			resolve(payload);
			}).catch((x) => {resolve(null)} )
		});
	})
}
