export type AppConfig = {
  nodeEnv: string;
  name: string;
  frontendDomain?: string;
  backendDomain: string;
  corsOrigins: string[];
  port: number;
  apiPrefix: string;
  fallbackLanguage: string;
  headerLanguage: string;
};
