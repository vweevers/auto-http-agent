# auto-http-agent

**Create an [http agent](https://nodejs.org/api/http.html#http_class_http_agent) for proxies and/or keepAlive. Returns a proxy if a given URL should be proxied according to the `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` environment variables. Uses a global pool of agents for up to 8 combinations of options (for example, proxied https URLs will share an agent).**

[![npm status](http://img.shields.io/npm/v/auto-http-agent.svg)](https://www.npmjs.org/package/auto-http-agent)
[![node](https://img.shields.io/node/v/auto-http-agent.svg)](https://www.npmjs.org/package/auto-http-agent)
![Test](https://github.com/vweevers/auto-http-agent/workflows/Test/badge.svg?branch=main)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Usage

```js
const autoAgent = require('auto-http-agent')

const url = 'http://example.com'
const agent = autoAgent(url)

// Pass to your module of choice
request(url, { agent })
```

## API

### `autoAgent(url[, options])`

The `url` argument is required and must either be a string or a [WHATWG `URL`](https://nodejs.org/api/url.html) instance, with an HTTP or HTTPS protocol.

Options:

- `keepAlive` (boolean): reuse connections between requests, default `false`.

Returns an agent or `null` if the default agent can be used (i.e. `http.globalAgent` or `https.globalAgent`). Has a fast path for the common case of not having any configured proxy. The `autoAgent` module should behave the same as good old [`request`](https://github.com/request/request) and other software. It respects the following environment variables.

#### `HTTP_PROXY`

A proxy URL to use for HTTP requests, e.g. `http://localhost:3000`. The proxy itself can be either HTTP or HTTPS.

#### `HTTPS_PROXY`

A proxy URL to use for HTTPS requests. The proxy itself can be either HTTP or HTTPS.

#### `NO_PROXY`

A comma-separated list of hosts (including subdomains) that should not be proxied. Supported forms:

- `hostname:port`
- `hostname` or `.hostname` or `*.hostname`
- `*` to disable proxying for all URLs

## Install

With [npm](https://npmjs.org) do:

```
npm install auto-http-agent
```

## License

[MIT](LICENSE) © Vincent Weevers
