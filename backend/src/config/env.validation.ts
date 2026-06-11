/**
 * Валидация переменных окружения при старте приложения.
 *
 * Принцип: жёстко падаем только для критичных для безопасности/работы
 * переменных (их отсутствие = дыра или неработающее приложение), а для
 * остальных пишем предупреждение, но даём стартовать. Так мы закрываем
 * худшие дыры, не рискуя уронить прод из-за второстепенной переменной.
 */
export function validateEnv(config: Record<string, any>): Record<string, any> {
  const isProd = config.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Критичные: без них падаем ---
  if (!config.JWT_SECRET || String(config.JWT_SECRET).length < 16) {
    errors.push('JWT_SECRET должен быть задан и быть длиной не менее 16 символов');
  }
  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL должен быть задан');
  }
  if (isProd && !config.TELEGRAM_BOT_TOKEN) {
    errors.push('TELEGRAM_BOT_TOKEN обязателен в production (нужен для проверки подписи Telegram)');
  }

  // --- Предупреждения: стартуем, но сигналим ---
  if (isProd && config.DISABLE_TELEGRAM_SIGNATURE_CHECK === 'true') {
    warnings.push(
      'DISABLE_TELEGRAM_SIGNATURE_CHECK=true — проверка подписи Telegram ОТКЛЮЧЕНА (небезопасно, только для аварийного отката)',
    );
  }
  if (!config.TELEGRAM_APP_URL) {
    warnings.push('TELEGRAM_APP_URL не задан — CORS откатится на localhost:5173');
  }
  if (!config.ADMIN_PANEL_URL) {
    warnings.push('ADMIN_PANEL_URL не задан — CORS откатится на localhost:5174');
  }
  if (isProd && !config.PAYME_PROD_KEY) {
    warnings.push('PAYME_PROD_KEY не задан — авторизация вебхука Payme работать не будет');
  }

  for (const w of warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[env] ВНИМАНИЕ: ${w}`);
  }
  if (errors.length > 0) {
    throw new Error(
      `[env] Некорректная конфигурация окружения:\n - ${errors.join('\n - ')}`,
    );
  }

  return config;
}
