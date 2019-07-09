import createStore from 'react-waterfall';
import { fromJS } from 'immutable';
import { to } from './utils';

const config = {
	initialState: {},
	actionsCreators: {
		// generic set helper
		set: (store, __, obj) => {
			return obj;
		},

		// sample async action
		loadTestData: async (store, actions, params) => {
			actions.set({ loading: true }); // start
			try {
				const res = await fetch(process.env.TEST_API);
				const json = await res.json();
				return {
					loading: false,
					testData: fromJS(json)
				}; //success
			} catch (err) {
				return { loading: false, error: err.message }; // fail
			}
		}
	}
};

export const { Provider, connect, actions } = createStore(config);
