const express = require('express');
const request = require('supertest');
const bodyParser = require('body-parser');

const processResponse = require('../lib/process-response');

async function testResponse(assertion, response) {
  const app = express();
  app.use(bodyParser.json());
  app.post('/*', (req, res) => {
    res.once('finish', assertion.bind(null, res));

    // This is done in the main middleware by
    // overwriting res.write/end
    res._body = response;

    res.json(response);
  });

  return request(app)
    .post('/')
    .expect(200);
}

describe('processResponse()', () => {
  describe('options', () => {
    it('should strip blacklisted properties', () => {
      expect.hasAssertions();
      return testResponse(res => {
        expect(processResponse(res, { blacklist: ['password', 'apiKey'] }).content.text).toStrictEqual(
          JSON.stringify({ another: 'Hello world' })
        );
      }, JSON.stringify({ password: '123456', apiKey: 'abcdef', another: 'Hello world' }));
    });

    it('should only send whitelisted properties', () => {
      expect.hasAssertions();
      return testResponse(res => {
        expect(processResponse(res, { whitelist: ['password', 'apiKey'] }).content.text).toStrictEqual(
          JSON.stringify({ password: '123456', apiKey: 'abcdef' })
        );
      }, JSON.stringify({ password: '123456', apiKey: 'abcdef', another: 'Hello world' }));
    });

    it('should not be applied for plain text bodies', () => {
      expect.hasAssertions();
      const body = 'hello world: dasdsas';
      return testResponse(res => {
        expect(processResponse(res, { blacklist: ['password', 'apiKey'] }).content.text).toStrictEqual(
          JSON.stringify(body)
        );
      }, body);
    });
  });

  it('#status', () =>
    testResponse(res => {
      expect(processResponse(res).status).toBe(200);
    }));

  it('#statusText', () =>
    testResponse(res => {
      expect(processResponse(res).statusText).toBe('OK');
    }));

  it('#headers', () => {
    return testResponse(res => {
      expect(processResponse(res).headers.filter(header => header.name !== 'date')).toStrictEqual([
        { name: 'x-powered-by', value: 'Express' },
        {
          name: 'content-type',
          value: 'application/json; charset=utf-8',
        },
      ]);
    });
  });

  describe('#content', () => {
    it('#size', () => {
      expect.hasAssertions();
      const body = { a: 1, b: 2, c: 3 };
      return testResponse(res => {
        // `.content.size` returns a string, while `.length` is integer, and Jest doesn't have any
        // assertions that do just a `==` so we need to coax the response a bit.
        expect(parseInt(processResponse(res).content.size, 10)).toBe(JSON.stringify(body).length);
      }, body);
    });

    it('#mimeType', () =>
      testResponse(res => {
        expect(processResponse(res).content.mimeType).toStrictEqual('application/json; charset=utf-8');
      }));

    it('#text', () => {
      const body = { a: 1, b: 2, c: 3 };
      return testResponse(res => {
        expect(processResponse(res).content.text).toStrictEqual(JSON.stringify(body));
      }, JSON.stringify(body));
    });

    it('#text should work with plain text body', () => {
      const body = 'hello world: dasdsas';
      return testResponse(res => {
        expect(processResponse(res).content.text).toStrictEqual(JSON.stringify(body));
      }, body);
    });
  });
});
