'use strict'

const test = require('tape')
const proxyquire = require('proxyquire')
const URL = require('url').URL

const kTunnel = Symbol('kTunnel')
const mockTunnel = (type) => (options) => ({ [kTunnel]: true, type, options })
const isTunnel = (agent) => agent[kTunnel] === true

const autoAgent = proxyquire('.', {
  tunnel: {
    httpsOverHttps: mockTunnel('httpsOverHttps'),
    httpsOverHttp: mockTunnel('httpsOverHttp'),
    httpOverHttps: mockTunnel('httpOverHttps'),
    httpOverHttp: mockTunnel('httpOverHttp')
  }
})

const factory = autoAgent.factory
const createURL = (v) => new URL(v)
const identity = (v) => v

test('empty environment', function (t) {
  const autoAgent = factory({}, {})

  t.is(autoAgent('http://example.com'), null)
  t.is(autoAgent('https://example.com'), null)
  t.end()
})

test('HTTP_PROXY', function (t) {
  for (const k of ['HTTP_PROXY', 'http_proxy']) {
    for (const proxyProtocol of ['http', 'https']) {
      for (const fn of [identity, createURL]) {
        const autoAgent = factory({}, { [k]: fn(proxyProtocol + '://localhost:1') })
        const agent = autoAgent('http://example.com')

        t.is(agent.type, proxyProtocol === 'http' ? 'httpOverHttp' : 'httpOverHttps')
        t.same(agent.options, {
          keepAlive: false,
          proxy: { host: 'localhost', port: '1', proxyAuth: undefined }
        })

        t.ok(autoAgent('http://other.com') === agent)
        t.is(autoAgent('https://example.com'), null)
        t.is(autoAgent('https://example.com'), null)
      }
    }
  }

  t.end()
})

test('HTTPS_PROXY', function (t) {
  for (const k of ['HTTPS_PROXY', 'https_proxy']) {
    for (const proxyProtocol of ['http', 'https']) {
      for (const fn of [identity, createURL]) {
        const autoAgent = factory({}, { [k]: fn(proxyProtocol + '://localhost:2') })
        const agent = autoAgent('https://example.com')

        t.is(agent.type, proxyProtocol === 'http' ? 'httpsOverHttp' : 'httpsOverHttps')
        t.same(agent.options, {
          keepAlive: false,
          proxy: { host: 'localhost', port: '2', proxyAuth: undefined }
        })

        t.ok(autoAgent('https://other.com') === agent)
        t.is(autoAgent('http://example.com'), null)
        t.is(autoAgent('http://example.com'), null)
      }
    }
  }

  t.end()
})

test('auth', function (t) {
  const autoAgent = factory({}, { HTTPS_PROXY: 'http://user:pw@localhost' })
  const agent = autoAgent('https://example.com')

  t.ok(isTunnel(agent))
  t.same(agent.options, {
    keepAlive: false,
    proxy: { host: 'localhost', port: '', proxyAuth: 'user:pw' }
  })

  t.ok(autoAgent('https://other.com') === agent)
  t.is(autoAgent('http://example.com'), null)
  t.is(autoAgent('http://example.com'), null)

  t.end()
})

test('proxy with keepalive', function (t) {
  const autoAgent = factory({}, { HTTPS_PROXY: 'https://localhost' })
  const agent = autoAgent('https://example.com', { keepAlive: true })

  t.ok(isTunnel(agent))
  t.same(agent.options, {
    keepAlive: true,
    proxy: { host: 'localhost', port: '', proxyAuth: undefined }
  })

  t.ok(autoAgent('https://other.com', { keepAlive: true }) === agent)
  t.is(isTunnel(autoAgent('http://example.com', { keepAlive: true })), false)
  t.is(isTunnel(autoAgent('http://example.com', { keepAlive: true })), false)

  t.end()
})

test('NO_PROXY domain', function (t) {
  const formats = [
    'example.com',
    '.example.com',
    '*.example.com',
    '.example.com,,',
    'example.com:80,example.com:443'
  ]

  for (const format of formats) {
    const autoAgent = factory({}, {
      HTTP_PROXY: 'http://localhost:1',
      HTTPS_PROXY: 'http://localhost:2',
      NO_PROXY: format
    })

    t.is(autoAgent('http://example.com'), null)
    t.is(autoAgent('https://example.com'), null)
    t.is(autoAgent('http://sub.example.com'), null)
    t.is(autoAgent('https://sub.example.com'), null)
    t.ok(autoAgent('http://example.net'))
    t.ok(autoAgent('https://example.net'))
    t.ok(autoAgent('http://other.com'))
    t.ok(autoAgent('https://other.com'))
  }

  t.end()
})

test('NO_PROXY all', function (t) {
  for (const format of ['*', 'example.com,*', 'example.com,*,,']) {
    const autoAgent = factory({}, {
      HTTP_PROXY: 'http://localhost:1',
      HTTPS_PROXY: 'http://localhost:2',
      NO_PROXY: format
    })

    t.is(autoAgent('http://example.com'), null)
    t.is(autoAgent('https://example.com'), null)
    t.is(autoAgent('http://other.com'), null)
    t.is(autoAgent('https://other.com'), null)
    t.is(isTunnel(autoAgent('http://example.com', { keepAlive: true })), false)
    t.is(isTunnel(autoAgent('https://example.com', { keepAlive: true })), false)
    t.is(isTunnel(autoAgent('http://other.com', { keepAlive: true })), false)
    t.is(isTunnel(autoAgent('https://other.com', { keepAlive: true })), false)
  }

  t.end()
})

test('ignores proxy with non-http protocol', function (t) {
  const autoAgent = factory({}, {
    HTTP_PROXY: 'ftp://localhost:1',
    HTTPS_PROXY: 'ftp://localhost:2'
  })

  t.is(autoAgent('http://example.com'), null)
  t.is(autoAgent('https://example.com'), null)
  t.is(autoAgent('http://other.com'), null)
  t.is(autoAgent('https://other.com'), null)
  t.is(isTunnel(autoAgent('http://example.com', { keepAlive: true })), false)
  t.is(isTunnel(autoAgent('https://example.com', { keepAlive: true })), false)
  t.is(isTunnel(autoAgent('http://other.com', { keepAlive: true })), false)
  t.is(isTunnel(autoAgent('https://other.com', { keepAlive: true })), false)

  t.end()
})

test('shares keepAlive agent', function (t) {
  const autoAgent = factory({}, {})
  const agent1 = autoAgent('http://example.com', { keepAlive: true })
  const agent2 = autoAgent('http://other.com', { keepAlive: true })

  t.ok(agent1 === agent2)
  t.end()
})

test('url must be http(s)', function (t) {
  t.throws(
    () => autoAgent(null, { keepAlive: true }),
    /^TypeError: The "url" argument is required and must be http\(s\)/
  )
  t.throws(
    () => autoAgent('', { keepAlive: true }),
    /^TypeError: The "url" argument is required and must be http\(s\)/
  )
  t.throws(
    () => autoAgent('ftp://foo.com', { keepAlive: true }),
    /^TypeError: The "url" argument is required and must be http\(s\)/
  )
  t.end()
})
