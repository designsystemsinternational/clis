import React, { Component } from "react";
import { actions, connect } from "../store";
import { Link } from "react-router-dom";
import css from "./Home.css";

import Input from "../components/Input";

class Home extends Component {
  componentDidMount() {
    actions.loadTestData();
  }

  render() {
    const { loading, testData } = this.props;

    if (loading || !testData) {
      return <p>Loading ...</p>;
    }

    const headers = testData.toJS().headers;

    // The api endpoint returns a JSON document with the headers
    // Let's just show that.
    const lis = Object.keys(headers).map(k => (
      <li key={k}>
        {k}: {headers[k]}
      </li>
    ));

    return (
      <div className={css.root}>
        <Input name="rune" value="Something" label="Something" />
        <h1>Home</h1>
        <Link to="/components">See components</Link>
        <h2>API Response</h2>
        <ul>{lis}</ul>
      </div>
    );
  }
}

export default connect(({ loading, testData }) => ({ loading, testData }))(
  Home
);
