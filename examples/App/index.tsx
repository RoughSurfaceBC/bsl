import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Route, HashRouter } from 'react-router-dom';
import { Subscription, Context } from '../../app/core';
import App from '../../app/App';
import A from './A';
import B from './B';
import C from './C';

class Launcher extends React.Component {
  public render(): JSX.Element {
    return (
      <Subscription source={{}}>
        {(value: object) => (
          <Context.Provider value={value}>
            <HashRouter>
              <App>
                <Route exact key="a" path="/" component={A} />
                <Route exact key="aa" path="/a" component={A} />
                <Route exact key="b" path="/b" component={B} />
                <Route exact key="c" path="/c" component={C} />
              </App>
            </HashRouter>
          </Context.Provider>
        )}
      </Subscription>
    );
  }
}

ReactDOM.render(
  <Launcher />,
  document.getElementById('root')
);