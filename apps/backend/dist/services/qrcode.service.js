"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQr = generateQr;
const qrcode_1 = __importDefault(require("qrcode"));
async function generateQr(data) {
    return qrcode_1.default.toDataURL(data, { width: 300, margin: 2 });
}
//# sourceMappingURL=qrcode.service.js.map