import Keycloak from 'keycloak-connect';
export declare const keycloakConfig: {
    realm: string;
    'auth-server-url': string;
    'ssl-required': string;
    resource: string;
    'confidential-port': number;
    'bearer-only': boolean;
};
export declare const keycloak: Keycloak.Keycloak;
