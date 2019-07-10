import React, { Component } from 'react';
import { render, hydrate } from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import App from './App.js';
import './index.css';

const rootElement = document.getElementById('root');
const app = (
	<Router>
		<App />
	</Router>
);

if (rootElement.hasChildNodes()) {
	hydrate(app, rootElement);
} else {
	render(app, rootElement);
}
