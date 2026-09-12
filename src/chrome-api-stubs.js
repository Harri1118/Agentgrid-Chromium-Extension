// Shim service worker for Chrome extensions running in Electron.
// Patches missing Chrome APIs onto the global chrome object so
// extension service workers and popups can initialize their UI.

;(function () {
  if (typeof chrome === 'undefined') return

  function noopListener () {
    return {
      addListener () {},
      removeListener () {},
      hasListener () { return false },
      addRules () {},
      removeRules () {},
      getRules () {},
    }
  }

  function ensureNamespace (obj, name, stubs) {
    var existing = null
    try { existing = obj[name] } catch (e) {}

    if (!existing) {
      try { obj[name] = stubs } catch (e) {
        try {
          Object.defineProperty(obj, name, {
            value: stubs, writable: true, configurable: true, enumerable: true,
          })
        } catch (e2) {}
      }
      return
    }

    var keys = Object.keys(stubs)
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      try {
        if (typeof existing[k] === 'undefined') {
          try { existing[k] = stubs[k] } catch (e) {
            try {
              Object.defineProperty(existing, k, {
                value: stubs[k], writable: true, configurable: true, enumerable: true,
              })
            } catch (e2) {}
          }
        }
      } catch (e) {}
    }
  }

  ensureNamespace(chrome, 'windows', {
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
    onBoundsChanged: noopListener(),
    WINDOW_ID_NONE: -1,
    WINDOW_ID_CURRENT: -2,
  })

  ensureNamespace(chrome, 'commands', {
    getAll: function () { return Promise.resolve([]) },
    onCommand: noopListener(),
  })

  ensureNamespace(chrome, 'webNavigation', {
    onBeforeNavigate: noopListener(),
    onCommitted: noopListener(),
    onCompleted: noopListener(),
    onCreatedNavigationTarget: noopListener(),
    onDOMContentLoaded: noopListener(),
    onErrorOccurred: noopListener(),
    onHistoryStateUpdated: noopListener(),
    onReferenceFragmentUpdated: noopListener(),
    onTabReplaced: noopListener(),
    getAllFrames: function () { return Promise.resolve([]) },
    getFrame: function () { return Promise.resolve(null) },
  })

  ensureNamespace(chrome, 'contextMenus', {
    create: function () { return 0 },
    update: function () { return Promise.resolve() },
    remove: function () { return Promise.resolve() },
    removeAll: function () { return Promise.resolve() },
    onClicked: noopListener(),
  })

  ensureNamespace(chrome, 'notifications', {
    create: function () { return Promise.resolve('') },
    update: function () { return Promise.resolve(false) },
    clear: function () { return Promise.resolve(false) },
    getAll: function () { return Promise.resolve({}) },
    onClicked: noopListener(),
    onClosed: noopListener(),
    onButtonClicked: noopListener(),
  })

  ensureNamespace(chrome, 'declarativeNetRequest', {
    updateDynamicRules: function () { return Promise.resolve() },
    updateSessionRules: function () { return Promise.resolve() },
    getDynamicRules: function () { return Promise.resolve([]) },
    getSessionRules: function () { return Promise.resolve([]) },
    getEnabledRulesets: function () { return Promise.resolve([]) },
    updateEnabledRulesets: function () { return Promise.resolve() },
    isRegexSupported: function () { return Promise.resolve({ isSupported: true }) },
    getMatchedRules: function () { return Promise.resolve({ rulesMatchedInfo: [] }) },
    onRuleMatchedDebug: noopListener(),
    MAX_NUMBER_OF_DYNAMIC_RULES: 30000,
    MAX_NUMBER_OF_ENABLED_STATIC_RULESETS: 50,
    DYNAMIC_RULESET_ID: '_dynamic',
    GETMATCHEDRULES_QUOTA_INTERVAL: 10,
    MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL: 20,
  })

  ensureNamespace(chrome, 'webRequest', {
    onBeforeRequest: noopListener(),
    onBeforeSendHeaders: noopListener(),
    onSendHeaders: noopListener(),
    onHeadersReceived: noopListener(),
    onAuthRequired: noopListener(),
    onResponseStarted: noopListener(),
    onCompleted: noopListener(),
    onErrorOccurred: noopListener(),
    handlerBehaviorChanged: function () { return Promise.resolve() },
  })

  ensureNamespace(chrome, 'identity', {
    getRedirectURL: function () { return 'https://localhost/' },
    getAuthToken: function () { return Promise.resolve({ token: '' }) },
    removeCachedAuthToken: function () { return Promise.resolve() },
    launchWebAuthFlow: function () { return Promise.resolve('') },
    getProfileUserInfo: function () { return Promise.resolve({ email: '', id: '' }) },
    onSignInChanged: noopListener(),
  })

  ensureNamespace(chrome, 'sidePanel', {
    setOptions: function () { return Promise.resolve() },
    getOptions: function () { return Promise.resolve({}) },
    open: function () { return Promise.resolve() },
    setPanelBehavior: function () { return Promise.resolve() },
    getPanelBehavior: function () { return Promise.resolve({}) },
  })

  ensureNamespace(chrome, 'offscreen', {
    createDocument: function () { return Promise.resolve() },
    closeDocument: function () { return Promise.resolve() },
    hasDocument: function () { return Promise.resolve(false) },
    Reason: { TESTING: 'TESTING', AUDIO_PLAYBACK: 'AUDIO_PLAYBACK', IFRAME_SCRIPTING: 'IFRAME_SCRIPTING' },
  })

  ensureNamespace(chrome, 'scripting', {
    executeScript: function () { return Promise.resolve([]) },
    insertCSS: function () { return Promise.resolve() },
    removeCSS: function () { return Promise.resolve() },
    registerContentScripts: function () { return Promise.resolve() },
    unregisterContentScripts: function () { return Promise.resolve() },
    getRegisteredContentScripts: function () { return Promise.resolve([]) },
    updateContentScripts: function () { return Promise.resolve() },
  })

  ensureNamespace(chrome, 'action', {
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

  ensureNamespace(chrome, 'alarms', {
    create: function () { return Promise.resolve() },
    get: function () { return Promise.resolve(null) },
    getAll: function () { return Promise.resolve([]) },
    clear: function () { return Promise.resolve(true) },
    clearAll: function () { return Promise.resolve(true) },
    onAlarm: noopListener(),
  })

  // Patch tabs events if tabs exists but events are missing
  if (chrome.tabs) {
    var tabEvents = {
      onRemoved: noopListener(),
      onUpdated: noopListener(),
      onCreated: noopListener(),
      onActivated: noopListener(),
      onReplaced: noopListener(),
    }
    var tabKeys = Object.keys(tabEvents)
    for (var i = 0; i < tabKeys.length; i++) {
      var tk = tabKeys[i]
      try {
        if (typeof chrome.tabs[tk] === 'undefined') {
          try { chrome.tabs[tk] = tabEvents[tk] } catch (e) {
            try {
              Object.defineProperty(chrome.tabs, tk, {
                value: tabEvents[tk], writable: true, configurable: true, enumerable: true,
              })
            } catch (e2) {}
          }
        }
      } catch (e) {}
    }
  }

  // Message responder: reply to common extension popup commands
  // so the popup UI can render even without the real background logic.
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (!message) return false

      var command = message.command || message.type

      if (command === 'getCurrentTabInfo') {
        sendResponse({
          id: message.tabId || 1,
          url: 'https://example.com',
          paused: false,
          domainPaused: false,
          disabledSite: false,
          whitelisted: false,
          customFilterCount: 0,
          newBadgeTextReason: '',
          settings: {
            color_themes: { popup_menu: 'default_theme' },
            show_advanced_options: false,
          },
          totalBlockedCount: 0,
        })
        return true
      }

      if (command === 'adblockIsPaused') {
        sendResponse(false)
        return true
      }

      if (command === 'adblockIsDomainPaused') {
        sendResponse(false)
        return true
      }

      if (command === 'pageIsWhitelisted') {
        sendResponse(false)
        return true
      }

      if (command === 'getBlockedPerPage') {
        sendResponse(0)
        return true
      }

      if (command === 'resetBadgeText' || command === 'updateButtonUIAndContextMenus') {
        sendResponse({})
        return true
      }

      if (command === 'openTab') {
        sendResponse({})
        return true
      }

      if (command === 'ewe:api-call') {
        sendResponse(null)
        return true
      }

      if (command === 'ewe:telemetry-log' || command === 'ewe:sentry-error') {
        sendResponse(null)
        return true
      }

      return false
    })
  }

  // browser.* polyfill mirrors
  if (typeof browser !== 'undefined') {
    var mirrorKeys = [
      'webNavigation', 'contextMenus', 'notifications', 'declarativeNetRequest',
      'webRequest', 'identity', 'sidePanel', 'offscreen', 'scripting',
      'action', 'windows', 'commands', 'alarms',
    ]
    for (var i = 0; i < mirrorKeys.length; i++) {
      var mk = mirrorKeys[i]
      try {
        if (!browser[mk] && chrome[mk]) {
          try { browser[mk] = chrome[mk] } catch (e) {
            try {
              Object.defineProperty(browser, mk, {
                value: chrome[mk], writable: true, configurable: true, enumerable: true,
              })
            } catch (e2) {}
          }
        }
      } catch (e) {}
    }
  }
})()
