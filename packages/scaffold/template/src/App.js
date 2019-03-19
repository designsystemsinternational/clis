import React, { Component } from "react";
import { Switch, Route, withRouter } from "react-router-dom";

import Home from "./pages/Home";

import css from "./App.css";

class App extends Component {
  render() {
    return (
      <div className={css.root}>
        <Switch>
          <Route path="/" component={Home} />
        </Switch>
      </div>
    );
  }
}

export default withRouter(App);
