import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useApi } from '../hooks/api';

import css from './Home.css';

export default (props) => {
  const [data, loadData, status] = useApi('/get');

  return (
    <div className={css.root}>
      <Helmet>
        <title>Homepage</title>
      </Helmet>
      <Link to={'/page'}>Go to /page</Link>
      <h1>Sample API Response</h1>
      <ul>
        {status.loaded ? (
          Object.entries(data.headers).map((entry) => (
            <li key={entry[0]}>
              {entry[0]}: {entry[1]}
            </li>
          ))
        ) : (
          <p>Loading ...</p>
        )}
      </ul>
    </div>
  );
};
