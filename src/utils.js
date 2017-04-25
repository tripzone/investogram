import $ from 'jquery';

export const apiCall = (url, type) => {
	return $.ajax({
		url,
		type,
		success: () => {
		},
		error: (jqXHR, textStatus, errorThrown) => {
			console.log('Error: ' + textStatus, errorThrown);
		},
		complete: () => {}
	})
}
