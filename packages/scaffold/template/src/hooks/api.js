import React, { useState, useRef, useEffect } from 'react';
import { fromJS } from 'immutable';
import axios from 'axios';

const api = axios.create({
	baseURL: process.env.TEST_API,
	timeout: 3000,
	headers: { 'X-Custom-Header': 'foobar' }
});

export const useApi = (url = '/get', opts = {}) => {
	const options = { url, method: 'get', ...opts };
	if (opts.method == 'post' && !options.data) console.warn('use "options.data" to send post body.');
	const [data, setData] = useState(getSnapData(url));

	const [status, setStatus] = useState({ loading: false, error: false, loaded: !!data });
	const updateStatus = newStatus => {
		setStatus(status => ({ ...status, newStatus }));
	};

	const loadData = useRef(async customOpts => {
		try {
			updateStatus({ error: false, loading: true });
			const res = await api({ ...options, ...customOpts });
			setData(res.data);
			setSnapData(url, res.data);
			setStatus({
				...status,
				error: false,
				loading: false,
				loaded: true,
				status: res.status,
				statusText: res.statusText
			});
			return res.data;
		} catch (error) {
			if (error.response) {
				updateStatus({
					loading: false,
					error: error.response.data.message || error.response.data,
					status: error.response.status,
					statusText: error.response.statusText
				});
				console.warn(error.response);
			} else if (error.request) {
				updateStatus({ loading: false, error: "Server didn't respond" });
				console.error(error.request);
			} else {
				updateStatus({ loading: false, error: error.message });
				console.error('Error', error.message);
			}
			return false;
		}
	});

	useEffect(() => {
		if (!opts.manual) loadData.current();
	}, []);

	return [data, loadData.current, status];
};

// SSR Cache handling
// using react-snap
// react-snap stores the keys of the returned object of window.snapSaveState()
// in window[key] to be used on the client.

const isSnap = navigator.userAgent == 'ReactSnap';
const storeKey = '__SNAP_STORE__';
window[storeKey] = window[storeKey] || {};
if (isSnap) {
	window.snapSaveState = () => {
		return { [storeKey]: window[storeKey] };
	};
}

const setSnapData = (key, data) => {
	if (isSnap) window[storeKey][key] = data;
};

const getSnapData = key => {
	if (isSnap) return;
	const cache = window[storeKey][key];
	// we only need it once
	delete window[storeKey][key];
	return cache;
};
