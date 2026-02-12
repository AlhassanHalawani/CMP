import Keycloak from 'keycloak-connect';
import { env } from './env';

export const keycloakConfig = {
  realm: env.keycloak.realm,
  'auth-server-url': env.keycloak.url,
  'ssl-required': env.isProd ? 'external' : 'none',
  resource: env.keycloak.clientId,
  'confidential-port': 0,
  'bearer-only': true,
};

export const keycloak = new Keycloak({}, keycloakConfig as any);
