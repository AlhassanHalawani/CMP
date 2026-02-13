"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keycloak = exports.keycloakConfig = void 0;
const keycloak_connect_1 = __importDefault(require("keycloak-connect"));
const env_1 = require("./env");
exports.keycloakConfig = {
    realm: env_1.env.keycloak.realm,
    'auth-server-url': env_1.env.keycloak.url,
    'ssl-required': env_1.env.isProd ? 'external' : 'none',
    resource: env_1.env.keycloak.clientId,
    'confidential-port': 0,
    'bearer-only': true,
};
exports.keycloak = new keycloak_connect_1.default({}, exports.keycloakConfig);
//# sourceMappingURL=keycloak.js.map