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
  }
}

export const getTelegramInitData = () => {
  return tg?.initData || ''
}

export const getTelegramUser = () => {
  return tg?.initDataUnsafe?.user
}
