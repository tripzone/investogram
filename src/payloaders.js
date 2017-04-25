import Papa from 'papaparse';

export const yahooDivs = (x) => {
	const dividends = {};
	const response = x.query.results.quote;
	response.forEach((item) => {
		dividends[item.Date] = parseFloat(item.Dividends);
	});
	return dividends;
};

export const morningStar = (x) => {
	const skipFields = ['Margins % of Sales', 'Profitability', 'Year over Year', 'Cash Flow Ratios', 'Balance Sheet Items (in %)', 'Liquidity/Financial Health', 'Efficiency', ''];
	const replaceText = [' CAD', ' USD', ' *'];
	const parsedText = Papa.parse(x, {
		dynamicTyping: true,
		skipEmptyLines: true,
	});

	// extract years
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
};
