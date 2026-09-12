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

  // src/renderer/BrowserExtensionManager.tsx
  var import_react = __toESM(require_react());
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
    return /* @__PURE__ */ React.createElement("div", { ref: panelRef, className: "browser-ext-manager", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-nav-btn",
        onClick: () => setOpen(!open),
        title: "Extensions"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }), /* @__PURE__ */ React.createElement("path", { d: "M10 10.5a2.5 2.5 0 0 1 5 0V12h-5v-1.5z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12.5", cy: "16", r: "2.5" }))
    ), open && /* @__PURE__ */ React.createElement("div", { className: "browser-ext-panel" }, /* @__PURE__ */ React.createElement("div", { className: "browser-ext-panel-header" }, "Extensions"), /* @__PURE__ */ React.createElement("div", { className: "browser-ext-install-row" }, /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-ext-install-btn",
        onClick: () => void handleInstall(),
        disabled: installState === "loading"
      },
      installState === "loading" ? "..." : "Install"
    )), installState === "error" && /* @__PURE__ */ React.createElement("div", { className: "browser-ext-error" }, installError), installState === "success" && /* @__PURE__ */ React.createElement("div", { className: "browser-ext-success" }, "Installed! Reload page to activate."), /* @__PURE__ */ React.createElement("div", { className: "browser-ext-list" }, extensions.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "browser-ext-empty" }, "No extensions installed"), extensions.map((ext) => /* @__PURE__ */ React.createElement("div", { key: ext.id, className: "browser-ext-item" }, /* @__PURE__ */ React.createElement("div", { className: "browser-ext-item-info" }, /* @__PURE__ */ React.createElement("span", { className: "browser-ext-item-name" }, ext.name), /* @__PURE__ */ React.createElement("span", { className: "browser-ext-item-version" }, "v", ext.version)), /* @__PURE__ */ React.createElement("div", { className: "browser-ext-item-actions" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `browser-ext-toggle ${ext.enabled ? "enabled" : ""}`,
        onClick: () => void handleToggle(ext.id, !ext.enabled),
        title: ext.enabled ? "Disable" : "Enable"
      },
      ext.enabled ? "On" : "Off"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-ext-remove",
        onClick: () => void handleUninstall(ext.id),
        title: "Uninstall"
      },
      "\xD7"
    ))))), /* @__PURE__ */ React.createElement("div", { className: "browser-ext-tip" }, "Tip: Browse chrome.google.com/webstore, copy the extension URL, and paste above.")));
  }

  // src/renderer/BrowserProfilePicker.tsx
  var import_react2 = __toESM(require_react());
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
    return /* @__PURE__ */ React.createElement("div", { ref: panelRef, className: "browser-profile-picker", onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-profile-avatar",
        onClick: () => setOpen(!open),
        title: activeProfile ? `Profile: ${activeProfile.name}` : "Browser Profiles",
        style: { backgroundColor: avatarColor }
      },
      activeProfile ? displayInitial : /* @__PURE__ */ React.createElement("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "7", r: "4" }))
    ), open && /* @__PURE__ */ React.createElement("div", { className: "browser-profile-panel" }, /* @__PURE__ */ React.createElement("div", { className: "browser-profile-panel-header" }, "Profiles"), showDashlane && profiles.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "browser-profile-dashlane" }, /* @__PURE__ */ React.createElement("span", { className: "browser-profile-dashlane-icon" }, "\u{1F511}"), /* @__PURE__ */ React.createElement("span", null, "For password sync across profiles, we recommend ", /* @__PURE__ */ React.createElement("strong", null, "Dashlane"), ". Install it as a Chrome extension after creating a profile.")), /* @__PURE__ */ React.createElement("div", { className: "browser-profile-list" }, profiles.map((profile) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: profile.id,
        className: `browser-profile-item ${profile.id === activeId ? "active" : ""}`,
        onClick: () => void handleSwitch(profile)
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "browser-profile-item-avatar",
          style: { backgroundColor: profile.avatarColor }
        },
        profile.name[0]?.toUpperCase()
      ),
      /* @__PURE__ */ React.createElement("div", { className: "browser-profile-item-info" }, /* @__PURE__ */ React.createElement("span", { className: "browser-profile-item-name" }, profile.name), profile.id === activeId && /* @__PURE__ */ React.createElement("span", { className: "browser-profile-item-active" }, "Active")),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "browser-profile-item-delete",
          onClick: (e) => {
            e.stopPropagation();
            void handleDelete(profile.id);
          },
          title: "Delete profile"
        },
        "\xD7"
      )
    )), profiles.length === 0 && !creating && /* @__PURE__ */ React.createElement("div", { className: "browser-profile-empty" }, "No profiles yet. Create one to save cookies, sign-ins, and extensions separately.")), creating ? /* @__PURE__ */ React.createElement("div", { className: "browser-profile-create-row" }, /* @__PURE__ */ React.createElement(
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
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-profile-create-btn",
        onClick: () => void handleCreate()
      },
      "Add"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-profile-cancel-btn",
        onClick: () => {
          setCreating(false);
          setNewName("");
        }
      },
      "Cancel"
    )) : /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "browser-profile-add-btn",
        onClick: () => setCreating(true)
      },
      "+ New Profile"
    ), /* @__PURE__ */ React.createElement("div", { className: "browser-profile-tip" }, "Each profile has its own cookies, storage, and extensions \u2014 like Chrome's profile system.")));
  }

  // src/renderer/index.tsx
  var registry = window.__agentgrid_ext_components ??= {};
  registry["browser.extensionManager"] = BrowserExtensionManager;
  registry["browser.profilePicker"] = BrowserProfilePicker;
})();
