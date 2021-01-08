import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import css from './Home.css';

export default (props) => {
  return (
    <div className={css.root}>
      <Helmet>
        <title>Homepage</title>
      </Helmet>
      <Link to={'/page'}>Go to /page</Link>
      <h1>Home page</h1>
      <p>
        Edit <code>src/pages/Home.js</code> to get started
      </p>
    </div>
  );
};
