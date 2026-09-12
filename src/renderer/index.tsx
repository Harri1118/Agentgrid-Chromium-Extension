import BrowserExtensionManager from './BrowserExtensionManager'
import BrowserProfilePicker from './BrowserProfilePicker'

type ComponentRegistry = Record<string, unknown>

const registry: ComponentRegistry = ((window as any).__agentgrid_ext_components ??= {})

registry['browser.extensionManager'] = BrowserExtensionManager
registry['browser.profilePicker'] = BrowserProfilePicker
