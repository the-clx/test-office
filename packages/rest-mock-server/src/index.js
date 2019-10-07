const { Observable } = require('rxjs');
const { map } = require('rxjs/operators');
const express = require('express');
const cors = require('cors');

function matchPath(mock, req) {
  if (!mock.request || !mock.request.path) {
    return true;
  }

  return mock.request.path === req.path;
}

function matchMock(req, mocks) {
  if (mocks.length < 1) {
    return undefined;
  }

  return mocks.find(mock => {
    return matchPath(mock, req);
  });
}

function getRequestCriteria(req) {
  return {
    path: req.url
  };
}

exports.start = function start(port = 3000, mocks = []) {
  const request$ = Observable.create(subscriber => {
    const app = express();
    app.use(cors()).use((req, res) =>
      subscriber.next({
        req,
        res
      })
    );
    const server = app.listen(port, () => {
      console.log(`server is listening on port ${port}`);
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        throw new Error(`Port ${err.port} is in use. Choose different port.`);
      }
    });
  });

  const searchMock = map(({ req, res }) => {
    const requestCriteria = getRequestCriteria(req);
    const matchedMock = matchMock(requestCriteria, mocks);

    return {
      mock: matchedMock,
      res
    };
  });

  request$.pipe(searchMock).subscribe(({ mock, res }) => {
    if (mock) {
      res.json(JSON.parse(mock.response.body));
      return;
    }

    res.status(404).end('rest-mock-server: mocks not found');
  });
};
