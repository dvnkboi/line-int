import { config } from "dotenv";

let environment = null as any;
let prefix = '';


//@ts-ignore
if (typeof window !== 'undefined') {
  try {
    // @ts-ignore
    environment = import.meta.env;
  }
  catch (e) {
    environment = {};
  }
}
else {
  config();
  environment = process.env;
}

//prefix management
const keys = Object.keys(environment);
keys.some((key) => key.startsWith("VITE_")) && (prefix = 'VITE_');

export const env = {
  // prisma: {
  //   databaseUrl: (environment[prefix + 'DATABASE_URL'] ?? '') as string,
  // },
  log: {
    level: (environment[prefix + 'LOG_LEVEL'] ?? 'info') as string,
    logDir: (environment[prefix + 'LOG_DIR'] ?? 'logs') as string,
    type: (environment[prefix + 'LOG_TYPE'] ?? 'console') as 'console' | 'file' | 'combined',
  },
  server: {
    port: (environment[prefix + 'SERVER_PORT'] != undefined ? Number(environment[prefix + 'SERVER_PORT']) : 3000) as number,
    apiHost: (environment[prefix + 'SERVER_HOST'] ?? 'http://localhost:3000') as string,
    webHost: (environment[prefix + 'WEB_HOST'] ?? 'http://localhost:3001') as string,
    storagePath: (environment[prefix + 'STORAGE_PATH'] ?? '') as string,
    cookieSecret: (environment[prefix + 'COOKIE_SECRET'] ?? '') as string,
    env: (environment[prefix + 'SERVER_ENV'] ?? 'development') as 'development' | 'production',
  },
  auth: {
    token: (environment[prefix + 'AUTH_TOKEN'] ?? '') as string,
  }
};

export const getPrefix = () => prefix;