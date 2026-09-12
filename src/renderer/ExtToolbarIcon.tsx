import type { ChromeExtMeta } from '../types'

export function ExtToolbarIcon({ ext }: { ext: ChromeExtMeta }) {
  if (ext.iconDataUri) {
    return <img src={ext.iconDataUri} alt={ext.name} className="cdp-ext-toolbar-icon-img" />
  }

  return (
    <span className="cdp-ext-toolbar-icon-letter">
      {ext.name.charAt(0).toUpperCase()}
    </span>
  )
}
