// Preload for extension popup webviews loaded via file:// URLs.
// Provides a chrome.* API surface so extension scripts don't bail
// with "This script should only be loaded in a browser extension".
// Injected before page scripts via contextIsolation=no + preload.

;(function () {
  console.log('[agentgrid-preload] popup-preload running, contextIsolation:', typeof process !== 'undefined' ? 'off (node available)' : 'unknown')

  var extensionId = '__EXTENSION_ID__'

  if (typeof chrome === 'undefined') {
    Object.defineProperty(globalThis, 'chrome', {
      value: {}, writable: true, configurable: true, enumerable: true,
    })
  }

  function noopListener () {
    return {
      addListener: function () {},
      removeListener: function () {},
      hasListener: function () { return false },
      addRules: function () {},
      removeRules: function () {},
      getRules: function () {},
    }
  }

  function noopPort (name) {
    return {
      name: name || '',
      postMessage: function () {},
      disconnect: function () {},
      onMessage: noopListener(),
      onDisconnect: noopListener(),
    }
  }

  function forceSet (obj, k, v) {
    try { obj[k] = v } catch (e) {
      try {
        Object.defineProperty(obj, k, {
          value: v, writable: true, configurable: true, enumerable: true,
        })
      } catch (e2) {}
    }
  }

  function ensure (obj, name, stubs) {
    var existing = null
    try { existing = obj[name] } catch (e) {}

    if (!existing) {
      forceSet(obj, name, stubs)
      return
    }

    var keys = Object.keys(stubs)
    for (var i = 0; i < keys.length; i++) {
      forceSet(existing, keys[i], stubs[keys[i]])
    }
  }

  ensure(chrome, 'runtime', {
    id: extensionId,
    getManifest: function () { return { manifest_version: 3, name: '', version: '0.0.0' } },
    getURL: function (p) { return 'chrome-extension://' + extensionId + '/' + p },
    sendMessage: function () { return Promise.resolve(null) },
    connect: function (opts) { return noopPort(opts && opts.name) },
    onMessage: noopListener(),
    onConnect: noopListener(),
    onInstalled: noopListener(),
    onStartup: noopListener(),
    onSuspend: noopListener(),
    onUpdateAvailable: noopListener(),
    getContexts: function () { return Promise.resolve([]) },
  })

  ensure(chrome, 'storage', {
    local: {
      get: function () { return Promise.resolve({}) },
      set: function () { return Promise.resolve() },
      remove: function () { return Promise.resolve() },
      clear: function () { return Promise.resolve() },
      onChanged: noopListener(),
    },
    sync: {
      get: function () { return Promise.resolve({}) },
      set: function () { return Promise.resolve() },
      remove: function () { return Promise.resolve() },
      clear: function () { return Promise.resolve() },
      onChanged: noopListener(),
    },
    session: {
      get: function () { return Promise.resolve({}) },
      set: function () { return Promise.resolve() },
      remove: function () { return Promise.resolve() },
      clear: function () { return Promise.resolve() },
      onChanged: noopListener(),
    },
    onChanged: noopListener(),
  })

  ensure(chrome, 'tabs', {
    query: function () { return Promise.resolve([]) },
    get: function () { return Promise.resolve(null) },
    create: function (opts) { return Promise.resolve({ id: 1, url: (opts && opts.url) || '' }) },
    update: function () { return Promise.resolve(null) },
    remove: function () { return Promise.resolve() },
    sendMessage: function () { return Promise.resolve(null) },
    connect: function () { return noopPort() },
    onUpdated: noopListener(),
    onCreated: noopListener(),
    onRemoved: noopListener(),
    onActivated: noopListener(),
    onReplaced: noopListener(),
  })

  ensure(chrome, 'action', {
    setBadgeText: function () { return Promise.resolve() },
    getBadgeText: function () { return Promise.resolve('') },
    setBadgeBackgroundColor: function () { return Promise.resolve() },
    setIcon: function () { return Promise.resolve() },
    setTitle: function () { return Promise.resolve() },
    setPopup: function () { return Promise.resolve() },
    getPopup: function () { return Promise.resolve('') },
    enable: function () { return Promise.resolve() },
    disable: function () { return Promise.resolve() },
    onClicked: noopListener(),
  })

  ensure(chrome, 'windows', {
    get: function () { return Promise.resolve(null) },
    getAll: function () { return Promise.resolve([]) },
    getCurrent: function () { return Promise.resolve({ id: 1, focused: true, state: 'normal', type: 'normal' }) },
    getLastFocused: function () { return Promise.resolve({ id: 1, focused: true, state: 'normal', type: 'normal' }) },
    create: function () { return Promise.resolve({ id: 1 }) },
    update: function () { return Promise.resolve(null) },
    remove: function () { return Promise.resolve() },
    onCreated: noopListener(),
    onRemoved: noopListener(),
    onFocusChanged: noopListener(),
    WINDOW_ID_NONE: -1,
    WINDOW_ID_CURRENT: -2,
  })

  ensure(chrome, 'alarms', {
    create: function () { return Promise.resolve() },
    get: function () { return Promise.resolve(null) },
    getAll: function () { return Promise.resolve([]) },
    clear: function () { return Promise.resolve(true) },
    clearAll: function () { return Promise.resolve(true) },
    onAlarm: noopListener(),
  })

  ensure(chrome, 'i18n', {
    getMessage: function (key) { return key },
    getUILanguage: function () { return 'en' },
    detectLanguage: function () { return Promise.resolve({ isReliable: true, languages: [{ language: 'en', percentage: 100 }] }) },
  })

  ensure(chrome, 'permissions', {
    contains: function () { return Promise.resolve(true) },
    request: function () { return Promise.resolve(true) },
    remove: function () { return Promise.resolve(true) },
    getAll: function () { return Promise.resolve({ permissions: [], origins: [] }) },
    onAdded: noopListener(),
    onRemoved: noopListener(),
  })

  ensure(chrome, 'scripting', {
    executeScript: function () { return Promise.resolve([]) },
    insertCSS: function () { return Promise.resolve() },
    removeCSS: function () { return Promise.resolve() },
    registerContentScripts: function () { return Promise.resolve() },
    unregisterContentScripts: function () { return Promise.resolve() },
    getRegisteredContentScripts: function () { return Promise.resolve([]) },
  })

  ensure(chrome, 'contextMenus', {
    create: function () { return 0 },
    update: function () { return Promise.resolve() },
    remove: function () { return Promise.resolve() },
    removeAll: function () { return Promise.resolve() },
    onClicked: noopListener(),
  })

  ensure(chrome, 'notifications', {
    create: function () { return Promise.resolve('') },
    clear: function () { return Promise.resolve(false) },
    getAll: function () { return Promise.resolve({}) },
    onClicked: noopListener(),
    onClosed: noopListener(),
  })

  ensure(chrome, 'webNavigation', {
    onBeforeNavigate: noopListener(),
    onCommitted: noopListener(),
    onCompleted: noopListener(),
    onDOMContentLoaded: noopListener(),
    onErrorOccurred: noopListener(),
    getAllFrames: function () { return Promise.resolve([]) },
    getFrame: function () { return Promise.resolve(null) },
  })

  ensure(chrome, 'identity', {
    getRedirectURL: function () { return 'https://localhost/' },
    getAuthToken: function () { return Promise.resolve({ token: '' }) },
    launchWebAuthFlow: function () { return Promise.resolve('') },
    getProfileUserInfo: function () { return Promise.resolve({ email: '', id: '' }) },
    onSignInChanged: noopListener(),
  })

  ensure(chrome, 'sidePanel', {
    setOptions: function () { return Promise.resolve() },
    getOptions: function () { return Promise.resolve({}) },
    open: function () { return Promise.resolve() },
  })

  ensure(chrome, 'offscreen', {
    createDocument: function () { return Promise.resolve() },
    closeDocument: function () { return Promise.resolve() },
    hasDocument: function () { return Promise.resolve(false) },
    Reason: { TESTING: 'TESTING' },
  })

  ensure(chrome, 'declarativeNetRequest', {
    updateDynamicRules: function () { return Promise.resolve() },
    getDynamicRules: function () { return Promise.resolve([]) },
    getSessionRules: function () { return Promise.resolve([]) },
    getEnabledRulesets: function () { return Promise.resolve([]) },
    onRuleMatchedDebug: noopListener(),
  })

  ensure(chrome, 'webRequest', {
    onBeforeRequest: noopListener(),
    onBeforeSendHeaders: noopListener(),
    onHeadersReceived: noopListener(),
    onCompleted: noopListener(),
    onErrorOccurred: noopListener(),
  })

  ensure(chrome, 'commands', {
    getAll: function () { return Promise.resolve([]) },
    onCommand: noopListener(),
  })

  // browser.* polyfill
  if (typeof browser === 'undefined') {
    try {
      Object.defineProperty(globalThis, 'browser', {
        value: chrome, writable: true, configurable: true, enumerable: true,
      })
    } catch (e) {}
  }
})()
