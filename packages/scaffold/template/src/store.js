import createStore from "react-waterfall";
const { fromJS } = require("immutable");

const addActions = (config, defaultAction, funcs) => {
  const startAction = defaultAction + "Start";
  const successAction = defaultAction + "Success";
  const failAction = defaultAction + "Fail";

  config.actionsCreators[defaultAction] = (state, actions, ...args) => {
    if (actions[startAction]) actions[startAction]();
    funcs
      .request(state, actions, ...args)
      .then(res => {
        if (actions[successAction]) {
          actions[successAction](res, ...args);
        }
      })
      .catch(e => {
        if (actions[failAction]) {
          actions[failAction](e);
        }
      });
    return {};
  };

  if (funcs.onStart) config.actionsCreators[startAction] = funcs.onStart;
  if (funcs.onSuccess) config.actionsCreators[successAction] = funcs.onSuccess;
  if (funcs.onFail) config.actionsCreators[failAction] = funcs.onFail;
};

const config = {
  initialState: {},
  actionsCreators: {}
};

addActions(config, "loadTestData", {
  request: (state, actions, actionArg) => fetch(process.env.TEST_API),
  onStart: () => {
    return { loading: true };
  },
  onSuccess: (state, actions, res) =>
    res.json().then(json => {
      return { testData: fromJS(json), loading: false };
    }),
  onFail: () => {
    return {};
  }
});

export const { Provider, connect, actions } = createStore(config);
