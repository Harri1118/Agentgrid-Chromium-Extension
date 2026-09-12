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

  // src/renderer/BrowserExtensionManager.tsx
  var import_react = __toESM(require_react());
  var import_jsx_runtime = __toESM(require_jsx_runtime());
  function BrowserExtensionManager({ partition }) {
    const [open, setOpen] = (0, import_react.useState)(false);
    const [extensions, setExtensions] = (0, import_react.useState)([]);
    const [installInput, setInstallInput] = (0, import_react.useState)("");
    const [installState, setInstallState] = (0, import_react.useState)("idle");
    const [installError, setInstallError] = (0, import_react.useState)("");
    const panelRef = (0, import_react.useRef)(null);
    const api = window.electronAPI;
    const refreshExtensions = (0, import_react.useCallback)(async () => {
      const list = await api.chromeExt.list();
      setExtensions(list);
    }, []);
    (0, import_react.useEffect)(() => {
      if (!open) {
        return;
      }
      void refreshExtensions();
    }, [open, refreshExtensions]);
    (0, import_react.useEffect)(() => {
      if (!open) {
        return;
      }
      const onClickOutside = (e) => {
        if (panelRef.current && !panelRef.current.contains(e.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);
    const extractExtensionId = (input) => {
      const trimmed = input.trim();
      const urlMatch = /(?:chrome\.google\.com\/webstore|chromewebstore\.google\.com)\/detail\/[^/]*\/([a-z]{32})/.exec(trimmed);
      if (urlMatch) {
        return urlMatch[1] ?? null;
      }
      const idMatch = /^[a-z]{32}$/.exec(trimmed);
      if (idMatch) {
        return idMatch[0];
      }
      return null;
    };
    const handleInstall = async () => {
      const extensionId = extractExtensionId(installInput);
      if (!extensionId) {
        setInstallState("error");
        setInstallError("Enter a valid extension ID or Chrome Web Store URL");
        return;
      }
      setInstallState("loading");
      setInstallError("");
      const result = await api.chromeExt.install({ extensionId, partition });
      if (!result.ok) {
        setInstallState("error");
        setInstallError(result.error ?? "Install failed");
        return;
      }
      setInstallState("success");
      setInstallInput("");
      await refreshExtensions();
      setTimeout(() => setInstallState("idle"), 2e3);
    };
    const handleUninstall = async (extensionId) => {
      await api.chromeExt.uninstall({ extensionId, partition });
      await refreshExtensions();
    };
    const handleToggle = async (extensionId, enabled) => {
      await api.chromeExt.toggle({ extensionId, enabled });
      await refreshExtensions();
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: panelRef, className: "browser-ext-manager", onMouseDown: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: "browser-nav-btn",
          onClick: () => setOpen(!open),
          title: "Extensions",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 10.5a2.5 2.5 0 0 1 5 0V12h-5v-1.5z" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12.5", cy: "16", r: "2.5" })
          ] })
        }
      ),
      open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "browser-ext-panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "browser-ext-panel-header", children: "Extensions" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "browser-ext-install-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              className: "browser-ext-install-input",
              placeholder: "Extension ID or Web Store URL",
              value: installInput,
              onChange: (e) => {
                setInstallInput(e.target.value);
                setInstallState("idle");
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  void handleInstall();
                }
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: "browser-ext-install-btn",
              onClick: () => void handleInstall(),
              disabled: installState === "loading",
              children: installState === "loading" ? "..." : "Install"
            }
          )
        ] }),
        installState === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "browser-ext-error", children: installError }),
        installState === "success" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "browser-ext-success", children: "Installed! Reload page to activate." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "browser-ext-list", children: [
          extensions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "browser-ext-empty", children: "No extensions installed" }),
          extensions.map((ext) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "browser-ext-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "browser-ext-item-info", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "browser-ext-item-name", children: ext.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "browser-ext-item-version", children: [
                "v",
                ext.version
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "browser-ext-item-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: `browser-ext-toggle ${ext.enabled ? "enabled" : ""}`,
                  onClick: () => void handleToggle(ext.id, !ext.enabled),
                  title: ext.enabled ? "Disable" : "Enable",
                  children: ext.enabled ? "On" : "Off"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "browser-ext-remove",
                  onClick: () => void handleUninstall(ext.id),
                  title: "Uninstall",
                  children: "\xD7"
                }
              )
            ] })
          ] }, ext.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "browser-ext-tip", children: "Tip: Browse chrome.google.com/webstore, copy the extension URL, and paste above." })
      ] })
    ] });
  }

  // src/renderer/BrowserProfilePicker.tsx
  var import_react2 = __toESM(require_react());
  var import_jsx_runtime2 = __toESM(require_jsx_runtime());
  function BrowserProfilePicker({ onProfileChange }) {
    const [open, setOpen] = (0, import_react2.useState)(false);
    const [profiles, setProfiles] = (0, import_react2.useState)([]);
    const [activeId, setActiveId] = (0, import_react2.useState)(null);
    const [creating, setCreating] = (0, import_react2.useState)(false);
    const [newName, setNewName] = (0, import_react2.useState)("");
    const [showDashlane, setShowDashlane] = (0, import_react2.useState)(false);
    const panelRef = (0, import_react2.useRef)(null);
    const api = window.electronAPI;
    const refreshProfiles = (0, import_react2.useCallback)(async () => {
      const [list, active] = await Promise.all([
        api.browserProfile.list(),
        api.browserProfile.getActive()
      ]);
      setProfiles(list);
      setActiveId(active);
      if (list.length === 0) {
        setShowDashlane(true);
      }
    }, []);
    (0, import_react2.useEffect)(() => {
      if (!open) {
        return;
      }
      void refreshProfiles();
    }, [open, refreshProfiles]);
    (0, import_react2.useEffect)(() => {
      if (!open) {
        return;
      }
      const onClickOutside = (e) => {
        if (panelRef.current && !panelRef.current.contains(e.target)) {
          setOpen(false);
          setCreating(false);
        }
      };
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }, [open]);
    const handleCreate = async () => {
      const trimmed = newName.trim();
      if (!trimmed) {
        return;
      }
      const result = await api.browserProfile.create({ name: trimmed });
      if (result.ok && result.profile) {
        setActiveId(result.profile.id);
        onProfileChange(result.profile.partition);
      }
      setNewName("");
      setCreating(false);
      await refreshProfiles();
    };
    const handleSwitch = async (profile) => {
      await api.browserProfile.setActive({ profileId: profile.id });
      setActiveId(profile.id);
      onProfileChange(profile.partition);
      setOpen(false);
    };
    const handleDelete = async (profileId) => {
      await api.browserProfile.delete({ profileId });
      await refreshProfiles();
    };
    const activeProfile = profiles.find((p) => p.id === activeId);
    const avatarColor = activeProfile?.avatarColor ?? "#5b8fff";
    const displayInitial = activeProfile?.name?.[0]?.toUpperCase() ?? "?";
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { ref: panelRef, className: "browser-profile-picker", onMouseDown: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          className: "browser-profile-avatar",
          onClick: () => setOpen(!open),
          title: activeProfile ? `Profile: ${activeProfile.name}` : "Browser Profiles",
          style: { backgroundColor: avatarColor },
          children: activeProfile ? displayInitial : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "7", r: "4" })
          ] })
        }
      ),
      open && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-profile-panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "browser-profile-panel-header", children: "Profiles" }),
        showDashlane && profiles.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-profile-dashlane", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-profile-dashlane-icon", children: "\u{1F511}" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
            "For password sync across profiles, we recommend ",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "Dashlane" }),
            ". Install it as a Chrome extension after creating a profile."
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-profile-list", children: [
          profiles.map((profile) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "div",
            {
              className: `browser-profile-item ${profile.id === activeId ? "active" : ""}`,
              onClick: () => void handleSwitch(profile),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "div",
                  {
                    className: "browser-profile-item-avatar",
                    style: { backgroundColor: profile.avatarColor },
                    children: profile.name[0]?.toUpperCase()
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-profile-item-info", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-profile-item-name", children: profile.name }),
                  profile.id === activeId && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "browser-profile-item-active", children: "Active" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "button",
                  {
                    className: "browser-profile-item-delete",
                    onClick: (e) => {
                      e.stopPropagation();
                      void handleDelete(profile.id);
                    },
                    title: "Delete profile",
                    children: "\xD7"
                  }
                )
              ]
            },
            profile.id
          )),
          profiles.length === 0 && !creating && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "browser-profile-empty", children: "No profiles yet. Create one to save cookies, sign-ins, and extensions separately." })
        ] }),
        creating ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "browser-profile-create-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "input",
            {
              className: "browser-profile-create-input",
              placeholder: "Profile name",
              value: newName,
              onChange: (e) => setNewName(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  void handleCreate();
                }
              },
              autoFocus: true
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: "browser-profile-create-btn",
              onClick: () => void handleCreate(),
              children: "Add"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              className: "browser-profile-cancel-btn",
              onClick: () => {
                setCreating(false);
                setNewName("");
              },
              children: "Cancel"
            }
          )
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            className: "browser-profile-add-btn",
            onClick: () => setCreating(true),
            children: "+ New Profile"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "browser-profile-tip", children: "Each profile has its own cookies, storage, and extensions \u2014 like Chrome's profile system." })
      ] })
    ] });
  }

  // src/renderer/index.tsx
  var registry = window.__agentgrid_ext_components ??= {};
  registry["browser.extensionManager"] = BrowserExtensionManager;
  registry["browser.profilePicker"] = BrowserProfilePicker;
})();
