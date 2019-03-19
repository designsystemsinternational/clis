import React, { Component } from "react";
import { actions } from "../store";
import css from "./Components.css";

import Checkbox from "../components/Checkbox";

class Components extends Component {
  render() {
    return (
      <div className={css.root}>
        <h1>Components</h1>
        <Checkbox checked={true} label="Checkbox" />
      </div>
    );
  }
}

export default Components;
