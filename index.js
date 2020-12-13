'use strict'

const tunnel = require('tunnel')
const https = require('https')
const http = require('http')
const URL = require('url').URL

function factory (pool, env) {
  agent.factory = factory

  const httpProxy = parse(env.http_proxy || env.HTTP_PROXY)
  const httpsProxy = parse(env.https_proxy || env.HTTPS_PROXY)
  const noProxy = env.no_proxy || env.NO_PROXY || ''
  const noProxies = noProxy.split(',').map(zone).filter(Boolean)
  const fastPath = (!httpProxy && !httpsProxy) || noProxies.includes('*')

  return agent

  function agent (url, options) {
    const keepAlive = options != null && options.keepAlive === true

    // Skip parsing url if we have no proxy and no keepAlive
    if (fastPath && !keepAlive) {
      return null
    }

    url = parse(url)

    if (!url) {
      throw new TypeError('The "url" argument is required and must be http(s)')
    }

    const secure = isSecure(url)
    const proxy = bypass(url, secure) ? null : secure ? httpsProxy : httpProxy
    const k = (proxy ? 'p' : 'd') + (secure ? 's' : 'i') + (keepAlive ? 'k' : 't')

    let agent = pool[k]

    if (agent === undefined) {
      if (proxy) {
        agent = pool[k] = tunneler(secure, isSecure(proxy))({
          keepAlive,
          proxy: {
            host: proxy.hostname,
            port: proxy.port,
            proxyAuth: auth(proxy)
          }
        })
      } else if (keepAlive) {
        agent = pool[k] = new (secure ? https.Agent : http.Agent)({ keepAlive })
      } else {
        agent = pool[k] = null
      }
    }

    return agent
  }

  function bypass (url, secure) {
    if (fastPath) {
      return true
    }

    if (noProxies.length === 0) {
      return false
    }

    const port = url.port || (secure ? 443 : 80)
    const sansPort = zone(url.hostname)
    const withPort = `${sansPort}:${port}`

    for (const item of noProxies) {
      if (sansPort.endsWith(item)) return true
      if (withPort.endsWith(item)) return true
    }

    return false
  }
}

const kPool = Symbol.for('auto-http-agent.pool')
const pool = global[kPool] = global[kPool] || {}

module.exports = factory(pool, process.env)

function zone (hostname) {
  hostname = hostname.trim().toLowerCase().replace(/^\*?\./, '')
  return hostname !== '' && hostname !== '*' ? '.' + hostname : hostname
}

function tunneler (secureUrl, secureProxy) {
  return secureUrl
    ? (secureProxy ? tunnel.httpsOverHttps : tunnel.httpsOverHttp)
    : (secureProxy ? tunnel.httpOverHttps : tunnel.httpOverHttp)
}

function parse (url) {
  if (url) {
    const parsed = typeof url === 'string' ? new URL(url) : url

    if (parsed.hostname && supportedProtocol(parsed)) {
      return parsed
    }
  }
}

function isSecure (url) {
  return url.protocol === 'https:'
}

function supportedProtocol (url) {
  return url.protocol === 'https:' || url.protocol === 'http:'
}

function auth (url) {
  if (url.username || url.password) {
    return `${url.username}:${url.password}`
  }
}
