import { useEffect } from 'react'
import { getClientTheme, type ClientTheme } from '../lib/clientThemes'

const FONT_LINK_ID = 'client-theme-font'

export function useClientTheme(clientId?: string): ClientTheme {
  const theme = getClientTheme(clientId)

  useEffect(() => {
    const html = document.documentElement

    if (theme.key === 'default') {
      html.removeAttribute('data-theme')
    } else {
      html.setAttribute('data-theme', theme.key)
    }

    let fontLink = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
    if (theme.fontUrl) {
      if (!fontLink) {
        fontLink = document.createElement('link')
        fontLink.id = FONT_LINK_ID
        fontLink.rel = 'stylesheet'
        document.head.appendChild(fontLink)
      }
      fontLink.href = theme.fontUrl
    } else {
      fontLink?.remove()
    }

    return () => {
      html.removeAttribute('data-theme')
      document.getElementById(FONT_LINK_ID)?.remove()
    }
  }, [theme.key, theme.fontUrl])

  return theme
}
