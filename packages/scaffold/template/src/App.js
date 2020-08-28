import React from 'react';
import { Switch, Route, withRouter } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Home from './pages/Home';
import Page from './pages/Page';

import css from './App.css';

const App = (props) => {
  return (
    <div className={css.root}>
      <Helmet>
        <title>__My Project__</title>
      </Helmet>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route exact path="/page" component={Page} />
      </Switch>
    </div>
  );
};

export default withRouter(App);
