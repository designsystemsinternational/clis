import React, { Component } from 'react';
import { actions, connect } from '../store';
import css from './Home.css';

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
		// Let's just show that in a list.
		const lis = Object.keys(headers).map(k => (
			<li key={k}>
				{k}: {headers[k]}
			</li>
		));

		return (
			<div className={css.root}>
				<h1>Sample API Response</h1>
				<ul>{lis}</ul>
			</div>
		);
	}
}

export default connect(({ loading, testData }) => ({ loading, testData }))(Home);
