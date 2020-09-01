import React, { Component } from 'react';
import { render, hydrate } from 'react-dom';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';

import { BrowserRouter, StaticRouter, Route } from 'react-router-dom';

import Html from './Html';
import App from './App.js';
import './index.css';

import { isClient } from './utils';

if (isClient) {
  const root = document.getElementById('root');
  const app = (
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  );
  if (root.hasChildNodes()) {
    hydrate(app, root);
  } else {
    render(app, root);
  }
}

export default (locals) => {
  const assets = Object.keys(locals.webpackStats.compilation.assets);

  HelmetProvider.canUseDOM = false;
  const helmetCtx = {};
  const routerCtx = {};
  const body = renderToString(
    <StaticRouter location={locals.path} context={routerCtx}>
      <HelmetProvider context={helmetCtx}>
        <App />
      </HelmetProvider>
    </StaticRouter>
  );
  return (
    '<!DOCTYPE html> ' +
    renderToString(<Html assets={assets} body={body} context={helmetCtx} />)
  );
};
