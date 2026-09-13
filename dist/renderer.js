"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // react-shim:react
  var require_react = __commonJS({
    "react-shim:react"(exports, module) {
      module.exports = globalThis.__agentgrid_react;
    }
  });

  // react-shim:react/jsx-runtime
  var require_jsx_runtime = __commonJS({
    "react-shim:react/jsx-runtime"(exports) {
      var React = globalThis.__agentgrid_react;
      function jsx4(type, props, key) {
        if (key !== void 0) {
          props = Object.assign({}, props, { key });
        }
        return React.createElement(type, props);
      }
      exports.jsx = jsx4;
      exports.jsxs = jsx4;
      exports.Fragment = React.Fragment;
    }
  });

  // src/renderer/index.tsx
  var import_react = __toESM(require_react());

  // src/renderer/preload-bridge.ts
  function getPluginsApi() {
    return window.electronAPI.plugins;
  }
  async function invokeCommand(commandId, payload) {
    return getPluginsApi().executeCommand({ commandId, payload });
  }
  function getChromeExtBridge() {
    try {
      getPluginsApi();
    } catch {
      return null;
    }
    return {
      install: (args) => invokeCommand("chromeExt.install", args),
      uninstall: (args) => invokeCommand("chromeExt.uninstall", args),
      toggle: (args) => invokeCommand("chromeExt.toggle", args),
      list: () => invokeCommand("chromeExt.list"),
      update: (args) => invokeCommand("chromeExt.update", args),
      updateAll: () => invokeCommand("chromeExt.updateAll"),
      loadIntoPartition: (args) => invokeCommand("chromeExt.loadIntoPartition", args),
      resolvePopupUrl: (args) => invokeCommand("chromeExt.resolvePopupUrl", args),
      openPopup: (args) => invokeCommand("chromeExt.openPopup", args)
    };
  }

  // src/renderer/ExtToolbarIcon.tsx
  var import_jsx_runtime = __toESM(require_jsx_runtime());
  function ExtToolbarIcon({ ext }) {
    if (ext.iconDataUri) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: ext.iconDataUri, alt: ext.name, className: "cdp-ext-toolbar-icon-img" });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cdp-ext-toolbar-icon-letter", children: ext.name.charAt(0).toUpperCase() });
  }

  // src/renderer/ExtensionSidebar.tsx
  var import_jsx_runtime2 = __toESM(require_jsx_runtime());
  function ExtensionSidebar({ extensions, partition, chromeExt, onNavigate, onClose, onRefresh }) {
    const handleUninstall = async (extensionId) => {
      await chromeExt.uninstall({ extensionId, partition });
      onRefresh();
    };
    const handleToggle = async (extensionId, enabled) => {
      await chromeExt.toggle({ extensionId, enabled });
      onRefresh();
    };
    const openWebStore = () => {
      onNavigate("https://chromewebstore.google.com");
      onClose();
    };
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-ext-sidebar", onMouseDown: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-ext-sidebar-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-ext-sidebar-title", children: "Extensions" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-ext-count", children: extensions.length }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "browser-ext-sidebar-close", onClick: onClose, title: "Close panel", children: "\xD7" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "browser-ext-sidebar-list", children: extensions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-ext-empty-state", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "36", height: "36", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", style: { opacity: 0.25 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M14.5 4h-5V2a2 2 0 0 1 4 0v2z" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 10h18" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-ext-empty-label", children: "No extensions installed" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-ext-empty-hint", children: "Browse the Chrome Web Store to find extensions" })
      ] }) : extensions.map((ext) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-ext-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "browser-ext-card-icon", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ExtToolbarIcon, { ext }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-ext-card-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-ext-card-name", children: ext.name }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "browser-ext-card-version", children: [
            "v",
            ext.version
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-ext-card-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "browser-ext-switch", title: ext.enabled ? "Disable" : "Enable", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                type: "checkbox",
                checked: ext.enabled,
                onChange: () => void handleToggle(ext.id, !ext.enabled)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-ext-switch-slider" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: "browser-ext-remove-btn",
              onClick: () => void handleUninstall(ext.id),
              title: "Remove",
              children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 6h18" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 6V4h8v2" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" })
              ] })
            }
          )
        ] })
      ] }, ext.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "browser-ext-sidebar-footer", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { className: "browser-ext-webstore-btn", onClick: openWebStore, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polygon", { points: "12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26", fill: "currentColor", stroke: "none" })
        ] }),
        "Chrome Web Store"
      ] }) })
    ] });
  }

  // src/renderer/index.tsx
  var import_jsx_runtime3 = __toESM(require_jsx_runtime());
  var api = globalThis.__agentgrid_slot_api;
  var extId = globalThis.__agentgrid_extension_id;
  var defaultState = { panelOpen: false, popup: null };
  var paneStates = /* @__PURE__ */ new Map();
  var stateListeners = /* @__PURE__ */ new Set();
  function getPaneState(paneId) {
    return paneStates.get(paneId) ?? defaultState;
  }
  function updatePaneState(paneId, patch) {
    const prev = getPaneState(paneId);
    paneStates.set(paneId, { ...prev, ...patch });
    for (const fn of stateListeners) fn();
  }
  function subscribeState(fn) {
    stateListeners.add(fn);
    return () => {
      stateListeners.delete(fn);
    };
  }
  function usePanelOpen(paneId) {
    return (0, import_react.useSyncExternalStore)(subscribeState, () => getPaneState(paneId).panelOpen);
  }
  function usePopup(paneId) {
    return (0, import_react.useSyncExternalStore)(subscribeState, () => getPaneState(paneId).popup);
  }
  function useBrowserExtensions(partition) {
    const chromeExt = (0, import_react.useMemo)(() => getChromeExtBridge(), []);
    const [extensions, setExtensions] = (0, import_react.useState)([]);
    const refreshExtensions = (0, import_react.useCallback)(() => {
      if (!chromeExt) {
        return;
      }
      void chromeExt.list().then(setExtensions).catch(() => {
      });
    }, [chromeExt]);
    (0, import_react.useEffect)(() => {
      if (!partition || !chromeExt) {
        return;
      }
      void chromeExt.loadIntoPartition({ partition }).catch(() => {
      });
      refreshExtensions();
    }, [partition, chromeExt, refreshExtensions]);
    return { chromeExt, extensions, refreshExtensions };
  }
  function useWebviewUrl(webviewRef) {
    const [url, setUrl] = (0, import_react.useState)("");
    (0, import_react.useEffect)(() => {
      const wv = webviewRef?.current;
      if (!wv?.addEventListener) {
        return;
      }
      const handler = (e) => setUrl(e.url ?? "");
      wv.addEventListener("did-navigate", handler);
      wv.addEventListener("did-navigate-in-page", handler);
      if (wv.getURL) {
        try {
          setUrl(wv.getURL());
        } catch {
        }
      }
      return () => {
        wv.removeEventListener("did-navigate", handler);
        wv.removeEventListener("did-navigate-in-page", handler);
      };
    }, [webviewRef]);
    return url;
  }
  function BrowserNavbarTrailing(props) {
    const paneId = props.paneId || "";
    const partition = props.partition || "";
    const webviewRef = props.webviewRef;
    const chromeExt = (0, import_react.useMemo)(() => getChromeExtBridge(), []);
    const [extensions, setExtensions] = (0, import_react.useState)([]);
    const [installState, setInstallState] = (0, import_react.useState)("idle");
    const panelOpen = usePanelOpen(paneId);
    const currentUrl = useWebviewUrl(webviewRef);
    const refreshExtensions = (0, import_react.useCallback)(() => {
      if (!chromeExt) {
        return;
      }
      void chromeExt.list().then(setExtensions).catch(() => {
      });
    }, [chromeExt]);
    (0, import_react.useEffect)(() => {
      if (!partition || !chromeExt) {
        return;
      }
      void chromeExt.loadIntoPartition({ partition }).catch(() => {
      });
      refreshExtensions();
    }, [partition, chromeExt, refreshExtensions]);
    const webStoreExtensionId = (0, import_react.useMemo)(() => {
      const match = /chromewebstore\.google\.com\/detail\/[^/]+\/([a-z]{32})/.exec(currentUrl);
      return match?.[1] ?? null;
    }, [currentUrl]);
    const handleInstall = (0, import_react.useCallback)(async () => {
      if (!webStoreExtensionId || !partition || !chromeExt) {
        return;
      }
      setInstallState("loading");
      try {
        const result = await chromeExt.install({ extensionId: webStoreExtensionId, partition });
        if (result.ok) {
          setInstallState("done");
          refreshExtensions();
          setTimeout(() => setInstallState("idle"), 3e3);
        } else {
          setInstallState("error");
          setTimeout(() => setInstallState("idle"), 3e3);
        }
      } catch {
        setInstallState("error");
        setTimeout(() => setInstallState("idle"), 3e3);
      }
    }, [webStoreExtensionId, partition, chromeExt, refreshExtensions]);
    const handleExtIconClick = (ext) => {
      if (!ext.popupPath || !ext.extensionDir || !partition || !chromeExt) {
        return;
      }
      const currentPopup = getPaneState(paneId).popup;
      if (currentPopup?.extensionId === ext.id) {
        updatePaneState(paneId, { popup: null });
        return;
      }
      void chromeExt.resolvePopupUrl({
        partition,
        extensionDir: ext.extensionDir,
        popupPath: ext.popupPath
      }).then((result) => {
        console.log("[ext-popup] resolvePopupUrl result:", result);
        if (result.ok && result.url) {
          updatePaneState(paneId, {
            popup: {
              extensionId: ext.id,
              popupUrl: result.url,
              chromeExtUrl: result.extensionUrl || "",
              preload: result.preload || null,
              partition: result.partition || null
            }
          });
        }
      });
    };
    if (!chromeExt || !partition) {
      return null;
    }
    const enabledExtensions = extensions.filter((e) => e.enabled);
    const installButtonLabel = installState === "loading" ? "Installing..." : installState === "done" ? "Installed" : installState === "error" ? "Failed" : "Add to AgentGrid";
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
      webStoreExtensionId && installState !== "done" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          className: "browser-ext-install-inline-btn",
          onClick: () => void handleInstall(),
          disabled: installState === "loading",
          title: "Install this extension into AgentGrid",
          children: [
            installState !== "loading" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
            ] }),
            installButtonLabel
          ]
        }
      ),
      installState === "done" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "browser-ext-install-done-badge", children: "Installed" }),
      enabledExtensions.map((ext) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          className: `cdp-ext-toolbar-icon${!ext.popupPath ? " cdp-ext-toolbar-icon-disabled" : ""}`,
          onClick: () => handleExtIconClick(ext),
          title: ext.name,
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ExtToolbarIcon, { ext })
        },
        ext.id
      )),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          className: `browser-nav-btn${panelOpen ? " browser-nav-btn-active" : ""}`,
          onClick: () => updatePaneState(paneId, { panelOpen: !panelOpen }),
          title: "Extensions",
          children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M14.5 4h-5V2a2 2 0 0 1 4 0v2z" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M3 10h18" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "7", y: "14", width: "4", height: "4", rx: "1" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "13", y: "14", width: "4", height: "4", rx: "1" })
          ] })
        }
      )
    ] });
  }
  function BrowserSidebar(props) {
    const paneId = props.paneId || "";
    const partition = props.partition || "";
    const panelOpen = usePanelOpen(paneId);
    const { chromeExt, extensions, refreshExtensions } = useBrowserExtensions(partition);
    if (!chromeExt || !partition || !panelOpen) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      ExtensionSidebar,
      {
        extensions,
        partition,
        chromeExt,
        onNavigate: () => {
        },
        onClose: () => updatePaneState(paneId, { panelOpen: false }),
        onRefresh: refreshExtensions
      }
    );
  }
  function ExtensionPopupOverlay(props) {
    const paneId = props.paneId || "";
    const partition = props.partition || "";
    const popup = usePopup(paneId);
    (0, import_react.useEffect)(() => {
      if (!popup) {
        return;
      }
      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          updatePaneState(paneId, { popup: null });
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    }, [paneId, popup]);
    (0, import_react.useEffect)(() => {
      const detail = {
        paneId,
        url: popup?.popupUrl ?? null,
        preload: popup?.preload ?? null,
        partition: popup?.partition ?? null,
        width: 380,
        height: 520
      };
      console.log("[ext-popup] dispatching plugin:webview-overlay", detail);
      window.dispatchEvent(new CustomEvent("plugin:webview-overlay", { detail }));
    }, [paneId, popup]);
    if (!popup) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        style: {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 50
        },
        onClick: () => updatePaneState(paneId, { popup: null })
      }
    );
  }
  if (api && extId) {
    api.registerSlotComponent("browser-navbar-trailing", extId, BrowserNavbarTrailing);
    api.registerSlotComponent("browser-sidebar", extId, BrowserSidebar);
    api.registerSlotComponent("browser-overlay", extId, ExtensionPopupOverlay);
  }
})();
