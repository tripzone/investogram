import $ from 'jquery';
import axios from 'axios';

const instance = axios.create({
	baseURL: 'http://localhost:2500',
	timeout: 1000,
	headers: { 'Content-Type': 'application/json' }
});

export const apiGet = (url) => {
	return $.ajax({
		url,
		Type: 'GET',
		success: () => {
		},
		error: (jqXHR, textStatus, errorThrown) => {
			console.log('Error: ' + textStatus, errorThrown);
		},
		complete: () => {},
	});
};

// export const apiPost = (url, collection, data) => {
// 	return $.ajax({
// 		type: 'POST',
// 		beforeSend: (request) => {
// 			request.setRequestHeader('collection', collection);
// 			request.setRequestHeader('Content-Type', 'application/json');
// 		},
// 		url,
// 		data: JSON.stringify(data),
// 		processData: false,
// 		success: (response) => {
// 			console.log('sucess', response);
// 		},
// 	});
// };

export const apiPost = (url, collection, data) => {
	return instance.post(
		'/'+url,
		JSON.stringify(data),
		{ headers: { collection } })
	.then((response) => {
		console.log(url, ' ', collection, 'successfully recorded ');
	})
	.catch((error) => {
		console.log(url, ' ', collection, 'ERROR ', error);
	});
};
