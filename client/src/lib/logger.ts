const isDev = import.meta.env.DEV;

export const logger = {
  success: (message: string, data?: any) => {
    console.log(`✅ ${message}`, {
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    });
  },
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`, {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      details: error,
    });
  },
  info: (message: string, data?: any) => {
    if (isDev) {
      console.log(`ℹ️ ${message}`, {
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      });
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${message}`, {
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    });
  },
  // Custom format for specific requirements
  custom: (emoji: string, message: string, data?: any) => {
    console.log(`${emoji} ${message}`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  },
};
