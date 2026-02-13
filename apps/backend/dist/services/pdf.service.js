"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAchievementReport = generateAchievementReport;
const pdfkit_1 = __importDefault(require("pdfkit"));
const achievement_model_1 = require("../models/achievement.model");
const user_model_1 = require("../models/user.model");
async function generateAchievementReport(userId) {
    const user = user_model_1.UserModel.findById(userId);
    const achievements = achievement_model_1.AchievementModel.findByUser(userId);
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // Header
        doc.fontSize(20).text('Achievement Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(user ? user.name : `User #${userId}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated: ${new Date().toISOString().slice(0, 10)}`, { align: 'center' });
        doc.moveDown(2);
        // Achievements list
        if (achievements.length === 0) {
            doc.fontSize(12).text('No achievements recorded yet.');
        }
        else {
            for (const achievement of achievements) {
                doc.fontSize(12).font('Helvetica-Bold').text(achievement.title);
                if (achievement.description) {
                    doc.fontSize(10).font('Helvetica').text(achievement.description);
                }
                doc.fontSize(9).font('Helvetica').text(`Awarded: ${achievement.awarded_at}`, { color: '#666' });
                doc.moveDown();
            }
        }
        doc.end();
    });
}
//# sourceMappingURL=pdf.service.js.map