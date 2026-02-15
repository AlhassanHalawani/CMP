export declare const env: {
    readonly nodeEnv: string;
    readonly port: number;
    readonly databasePath: string;
    readonly keycloak: {
        readonly url: string;
        readonly realm: string;
        readonly clientId: string;
        readonly clientSecret: string;
    };
    readonly jwt: {
        readonly secret: string;
    };
    readonly smtp: {
        readonly host: string;
        readonly port: number;
        readonly user: string;
        readonly pass: string;
        readonly from: string;
    };
    readonly allowedSignupDomains: string[];
    readonly isDev: boolean;
    readonly isProd: boolean;
};
