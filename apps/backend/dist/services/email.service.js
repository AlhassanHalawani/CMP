"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.env.smtp.host,
    port: env_1.env.smtp.port,
    secure: false,
    ...(env_1.env.smtp.user ? { auth: { user: env_1.env.smtp.user, pass: env_1.env.smtp.pass } } : {}),
});
async function sendEmail(options) {
    try {
        await transporter.sendMail({
            from: env_1.env.smtp.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        logger_1.logger.info(`Email sent to ${options.to}: ${options.subject}`);
    }
    catch (err) {
        logger_1.logger.error('Failed to send email', { error: err.message, to: options.to });
        throw err;
    }
}
//# sourceMappingURL=email.service.js.map