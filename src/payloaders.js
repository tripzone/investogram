import Papa from 'papaparse';

export const yahooDivs = (x) => {
	const dividends = {};
	const response = x.query.results.quote;
	response.forEach((item) => {
		dividends[item.Date] = parseFloat(item.Dividends);
	});
	return {};
};

export const edgar = (x, reportType) => {
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
			return periodObject;
		}
		return null;
	}
	return null;
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
		return data;
	}
	return null;
};
