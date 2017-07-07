import $ from 'jquery';
import axios from 'axios';
import { backendEndpoint } from '../private/server.js';

const instance = axios.create({
	baseURL: backendEndpoint,
	timeout: 2000,
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

export const dbPost = (url, collection, data) => {
	return instance.post(
		'/'+url,
		JSON.stringify(data),
		{ headers: { collection } });
};

export const dbPatch = (url, collection, data) => {
	return instance.patch(
		'/'+url,
		JSON.stringify(data),
		{ headers: { collection } });
};

export const dbGet = (url) => {
	return instance.get(
		'/'+url,
		);
};
