import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'cmp',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'cmp-app',
});

export default keycloak;
