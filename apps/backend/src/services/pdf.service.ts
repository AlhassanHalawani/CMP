import PDFDocument from 'pdfkit';
import { AchievementModel } from '../models/achievement.model';
import { UserModel } from '../models/user.model';

export async function generateAchievementReport(userId: number): Promise<Buffer> {
  const user = UserModel.findById(userId);
  const achievements = AchievementModel.findByUser(userId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
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
    } else {
      for (const achievement of achievements) {
        doc.fontSize(12).font('Helvetica-Bold').text(achievement.title);
        if (achievement.description) {
          doc.fontSize(10).font('Helvetica').text(achievement.description);
        }
        doc.fontSize(9).font('Helvetica').fillColor('#666').text(`Awarded: ${achievement.awarded_at}`);
        doc.moveDown();
      }
    }

    doc.end();
  });
}
