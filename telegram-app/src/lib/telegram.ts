declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: any
        ready: () => void
        expand: () => void
        close: () => void
        openLink: (url: string) => void
        enableClosingConfirmation: () => void
        disableClosingConfirmation: () => void
        isClosingConfirmationEnabled: boolean
        disableVerticalSwipes: () => void
        isExpanded: boolean
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
      }
    }
  }
}

export const tg = window.Telegram?.WebApp

/**
 * Прокидывает safe-area отступы Telegram в CSS-переменные --app-safe-top/bottom.
 * В fullscreen системные кнопки Telegram перекрывают верх контента — этот отступ
 * сдвигает контент ниже них. Вне fullscreen insets = 0, поэтому вид не меняется.
 * Доступно с Bot API 8.0; на старых клиентах тихо ничего не делает.
 */
export const applySafeAreaInsets = () => {
  const w = tg as any
  if (!w) return
  const root = document.documentElement

  const update = () => {
    const sa = w.safeAreaInset || {}
    const csa = w.contentSafeAreaInset || {}
    const top = (sa.top || 0) + (csa.top || 0)
    const bottom = (sa.bottom || 0) + (csa.bottom || 0)
    root.style.setProperty('--app-safe-top', `${top}px`)
    root.style.setProperty('--app-safe-bottom', `${bottom}px`)
  }

  update()
  if (typeof w.onEvent === 'function') {
    w.onEvent('safeAreaChanged', update)
    w.onEvent('contentSafeAreaChanged', update)
    w.onEvent('fullscreenChanged', update)
    w.onEvent('viewportChanged', update)
  }
}

export const initTelegram = () => {
  if (tg) {
    tg.ready()
    tg.expand()

    // Отключаем вертикальные свайпы (доступно с версии 7.7)
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes()
    }

    // Включаем подтверждение закрытия (при свайпе вниз будет спрашивать)
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation()
    }

    // Прокидываем safe-area отступы (для корректного fullscreen)
    applySafeAreaInsets()
  }
}

/**
 * Тактильная отдача Telegram. Безопасна: если API недоступно (веб/старый клиент),
 * вызовы тихо игнорируются.
 */
export const haptic = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
    try {
      (tg as any)?.HapticFeedback?.impactOccurred(style)
    } catch {
      /* no-op */
    }
  },
  notify: (type: 'error' | 'success' | 'warning') => {
    try {
      (tg as any)?.HapticFeedback?.notificationOccurred(type)
    } catch {
      /* no-op */
    }
  },
  selection: () => {
    try {
      (tg as any)?.HapticFeedback?.selectionChanged()
    } catch {
      /* no-op */
    }
  },
}

export const getTelegramInitData = () => {
  return tg?.initData || ''
}

export const getTelegramUser = () => {
  return tg?.initDataUnsafe?.user
}
