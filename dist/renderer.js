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
      exports.jsx = React.createElement;
      exports.jsxs = React.createElement;
      exports.Fragment = React.Fragment;
    }
  });

  // src/renderer/index.tsx
  var import_react2 = __toESM(require_react());

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
  function getCdpExtBridge() {
    try {
      getPluginsApi();
    } catch {
      return null;
    }
    return {
      openExtensionManager: (opts) => invokeCommand("cdp.openExtensionManager", opts),
      openExtensionPopup: (opts) => invokeCommand("cdp.openExtensionPopup", opts),
      listExtensions: (opts) => invokeCommand("cdp.listExtensions", opts),
      removeExtension: (opts) => invokeCommand("cdp.removeExtension", opts)
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
    const handleUninstall = async (extensionId2) => {
      await chromeExt.uninstall({ extensionId: extensionId2, partition });
      onRefresh();
    };
    const handleToggle = async (extensionId2, enabled) => {
      await chromeExt.toggle({ extensionId: extensionId2, enabled });
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

  // src/renderer/CdpExtensionPanel.tsx
  var import_react = __toESM(require_react());
  var import_jsx_runtime3 = __toESM(require_jsx_runtime());
  function loadPinnedIds() {
    try {
      const raw = localStorage.getItem("cdp-pinned-extensions");
      return raw ? new Set(JSON.parse(raw)) : /* @__PURE__ */ new Set();
    } catch {
      return /* @__PURE__ */ new Set();
    }
  }
  function ExtIcon({ ext }) {
    if (ext.iconPath) {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("img", { src: ext.iconPath, alt: ext.name, className: "cdp-ext-toolbar-icon-img" });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "cdp-ext-toolbar-icon-letter", children: ext.name.charAt(0).toUpperCase() });
  }
  function useCdpExtensions({ workspaceId, connected, cdpExt }) {
    const [extensions, setExtensions] = (0, import_react.useState)([]);
    const [extSidebarOpen, setExtSidebarOpen] = (0, import_react.useState)(false);
    const [pinnedIds, setPinnedIds] = (0, import_react.useState)(loadPinnedIds);
    (0, import_react.useEffect)(() => {
      if (!connected) {
        return;
      }
      void cdpExt.listExtensions({ workspaceId }).then(setExtensions);
    }, [connected, workspaceId, cdpExt]);
    const refreshExtensions = (0, import_react.useCallback)(() => {
      void cdpExt.listExtensions({ workspaceId }).then(setExtensions);
    }, [workspaceId, cdpExt]);
    return {
      extensions,
      extSidebarOpen,
      setExtSidebarOpen,
      pinnedIds,
      setPinnedIds,
      refreshExtensions
    };
  }
  function CdpExtensionToolbar({ extensions, sessionId, cdpExt, onOpenPopup }) {
    if (extensions.length === 0) {
      return null;
    }
    const handleOpenPopup = (ext) => {
      if (!ext.popupPath) {
        return;
      }
      if (onOpenPopup) {
        onOpenPopup(ext);
        return;
      }
      void cdpExt.openExtensionPopup({
        sessionId,
        extensionId: ext.id,
        popupPath: ext.popupPath
      });
    };
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "cdp-ext-toolbar", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "cdp-ext-toolbar-icons", children: extensions.map((ext) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        className: `cdp-ext-toolbar-icon${ext.popupPath ? "" : " cdp-ext-toolbar-icon-disabled"}`,
        onClick: () => handleOpenPopup(ext),
        title: ext.name,
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ExtIcon, { ext })
      },
      ext.id
    )) }) });
  }
  function CdpExtensionSidebar({ extensions, workspaceId, cdpExt, pinnedIds, onTogglePin, onRefresh, onClose }) {
    const handleRemoveExtension = (0, import_react.useCallback)((ext) => {
      void cdpExt.removeExtension({ workspaceId, extensionId: ext.id }).then(() => {
        onRefresh();
      });
    }, [workspaceId, cdpExt, onRefresh]);
    const handleInstallExtensions = (0, import_react.useCallback)(() => {
      onClose();
      void cdpExt.openExtensionManager({ workspaceId });
    }, [workspaceId, cdpExt, onClose]);
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "browser-ext-sidebar", onMouseDown: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "browser-ext-sidebar-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "browser-ext-sidebar-title", children: "Extensions" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "browser-ext-count", children: extensions.length }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { className: "browser-ext-sidebar-close", onClick: onClose, title: "Close panel", children: "\xD7" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "browser-ext-sidebar-list", children: extensions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "browser-ext-empty-state", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "36", height: "36", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", style: { opacity: 0.25 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M14.5 4h-5V2a2 2 0 0 1 4 0v2z" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M3 10h18" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "browser-ext-empty-label", children: "No extensions installed" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "browser-ext-empty-hint", children: "Use the buttons below to manage extensions" })
      ] }) : extensions.map((ext) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "browser-ext-card", title: ext.description, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "browser-ext-card-icon", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ExtIcon, { ext }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "browser-ext-card-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "browser-ext-card-name", children: ext.name }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "browser-ext-card-version", children: [
            "v",
            ext.version
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "browser-ext-card-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              className: `browser-ext-pin-btn${pinnedIds.has(ext.id) ? " browser-ext-pin-btn-active" : ""}`,
              onClick: () => onTogglePin(ext),
              title: pinnedIds.has(ext.id) ? "Unpin from toolbar" : "Pin to toolbar",
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: pinnedIds.has(ext.id) ? "currentColor" : "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M12 17v5" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z" })
              ] })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              className: "browser-ext-remove-btn",
              onClick: () => handleRemoveExtension(ext),
              title: "Remove extension",
              children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("polyline", { points: "3 6 5 6 21 6" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
              ] })
            }
          )
        ] })
      ] }, ext.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "browser-ext-sidebar-footer", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { className: "browser-ext-webstore-btn", onClick: handleInstallExtensions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "12", y1: "8", x2: "12", y2: "16" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "8", y1: "12", x2: "16", y2: "12" })
        ] }),
        "Chrome Web Store"
      ] }) })
    ] });
  }

  // src/renderer/index.tsx
  var import_jsx_runtime4 = __toESM(require_jsx_runtime());
  var api = globalThis.__agentgrid_slot_api;
  var extensionId = globalThis.__agentgrid_extension_id;
  function BrowserNavbarTrailing(props) {
    const partition = props.partition || "";
    const chromeExt = (0, import_react2.useMemo)(() => getChromeExtBridge(), []);
    const [extensions, setExtensions] = (0, import_react2.useState)([]);
    const [extPanelOpen, setExtPanelOpen] = (0, import_react2.useState)(false);
    const [extInstallState, setExtInstallState] = (0, import_react2.useState)("idle");
    const refreshExtensions = (0, import_react2.useCallback)(() => {
      if (!chromeExt) {
        return;
      }
      void chromeExt.list().then(setExtensions).catch(() => {
      });
    }, [chromeExt]);
    (0, import_react2.useEffect)(() => {
      if (!partition || !chromeExt) {
        return;
      }
      void chromeExt.loadIntoPartition({ partition }).catch(() => {
      });
      refreshExtensions();
    }, [partition, chromeExt, refreshExtensions]);
    if (!chromeExt || !partition) {
      return null;
    }
    const enabledExtensions = extensions.filter((e) => e.enabled);
    const handleExtIconClick = (ext, e) => {
      if (!ext.popupPath || !ext.extensionDir) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      void chromeExt.openPopup({
        partition,
        extensionDir: ext.extensionDir,
        popupPath: ext.popupPath,
        x: window.screenX + rect.right - 400,
        y: window.screenY + rect.bottom + 4
      });
    };
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      enabledExtensions.map((ext) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          className: `cdp-ext-toolbar-icon${!ext.popupPath ? " cdp-ext-toolbar-icon-disabled" : ""}`,
          onClick: (e) => handleExtIconClick(ext, e),
          title: ext.name,
          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ExtToolbarIcon, { ext })
        },
        ext.id
      )),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          className: `browser-nav-btn${extPanelOpen ? " browser-nav-btn-active" : ""}`,
          onClick: () => setExtPanelOpen((v) => !v),
          title: "Extensions",
          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M14.5 4h-5V2a2 2 0 0 1 4 0v2z" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M3 10h18" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "7", y: "14", width: "4", height: "4", rx: "1" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("rect", { x: "13", y: "14", width: "4", height: "4", rx: "1" })
          ] })
        }
      )
    ] });
  }
  function BrowserSidebar(props) {
    const partition = props.partition || "";
    const chromeExt = (0, import_react2.useMemo)(() => getChromeExtBridge(), []);
    const [extensions, setExtensions] = (0, import_react2.useState)([]);
    const [isOpen, setIsOpen] = (0, import_react2.useState)(false);
    const refreshExtensions = (0, import_react2.useCallback)(() => {
      if (!chromeExt) {
        return;
      }
      void chromeExt.list().then(setExtensions).catch(() => {
      });
    }, [chromeExt]);
    (0, import_react2.useEffect)(() => {
      if (!partition || !chromeExt) {
        return;
      }
      refreshExtensions();
    }, [partition, chromeExt, refreshExtensions]);
    if (!chromeExt || !partition || !isOpen) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ExtensionSidebar,
      {
        extensions,
        partition,
        chromeExt,
        onNavigate: () => {
        },
        onClose: () => setIsOpen(false),
        onRefresh: refreshExtensions
      }
    );
  }
  function CdpNavbarTrailing(props) {
    const workspaceId = props.workspaceId || "";
    const sessionId = props.sessionId || "";
    const cdpExt = (0, import_react2.useMemo)(() => getCdpExtBridge(), []);
    const { extensions } = useCdpExtensions({
      workspaceId,
      connected: Boolean(workspaceId && cdpExt),
      cdpExt
    });
    if (!cdpExt || !workspaceId || !sessionId) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      CdpExtensionToolbar,
      {
        extensions,
        sessionId,
        cdpExt
      }
    );
  }
  function CdpSidebar(props) {
    const workspaceId = props.workspaceId || "";
    const cdpExt = (0, import_react2.useMemo)(() => getCdpExtBridge(), []);
    const { extensions, pinnedIds, setPinnedIds, refreshExtensions } = useCdpExtensions({
      workspaceId,
      connected: Boolean(workspaceId && cdpExt),
      cdpExt
    });
    const [isOpen, setIsOpen] = (0, import_react2.useState)(false);
    const handleTogglePin = (0, import_react2.useCallback)((ext) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(ext.id)) {
          next.delete(ext.id);
        } else {
          next.add(ext.id);
        }
        return next;
      });
    }, [setPinnedIds]);
    if (!cdpExt || !workspaceId || !isOpen) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      CdpExtensionSidebar,
      {
        extensions,
        workspaceId,
        cdpExt,
        pinnedIds,
        onTogglePin: handleTogglePin,
        onRefresh: refreshExtensions,
        onClose: () => setIsOpen(false)
      }
    );
  }
  if (api && extensionId) {
    api.registerSlotComponent("browser-navbar-trailing", extensionId, BrowserNavbarTrailing);
    api.registerSlotComponent("browser-sidebar", extensionId, BrowserSidebar);
    api.registerSlotComponent("cdp-browser-navbar-trailing", extensionId, CdpNavbarTrailing);
    api.registerSlotComponent("cdp-browser-sidebar", extensionId, CdpSidebar);
  }
})();
