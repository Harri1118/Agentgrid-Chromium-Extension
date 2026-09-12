import BrowserExtensionManager, { ExtensionToolbar } from './BrowserExtensionManager'
import BrowserProfilePicker from './BrowserProfilePicker'

type ComponentRegistry = Record<string, unknown>

const registry: ComponentRegistry = ((window as any).__agentgrid_ext_components ??= {})

registry['browser.extensionManager'] = BrowserExtensionManager
registry['browser.extensionToolbar'] = ExtensionToolbar
registry['browser.profilePicker'] = BrowserProfilePicker
