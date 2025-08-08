import { Request, Response } from 'express';
import { prisma } from '@utils/prisma';

export class DashboardController {
  summary = async (req: Request, res: Response) => {
    const user = (req as any).user as { sub: string; role: 'STUDENT' | 'FACULTY' | 'ADMIN' };
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (user.role === 'STUDENT') {
      const myResponses = await prisma.response.count({ where: { userId: user.sub } });
      const publishedSurveys = await prisma.survey.count({ where: { isPublished: true } as any });
      return res.json({ role: 'STUDENT', cards: { myResponses, publishedSurveys } });
    }

    if (user.role === 'FACULTY') {
      const mySurveys = await prisma.survey.findMany({ where: { createdBy: user.sub } });
      const total = mySurveys.length;
      const published = (mySurveys as any[]).filter(s => (s as any).isPublished).length;
      const drafts = total - published;
      // count responses for surveys created by this user
      const responses = await prisma.response.count({ where: { Survey: { createdBy: user.sub } as any } as any });
      return res.json({ role: 'FACULTY', cards: { mySurveys: total, published, drafts, responses } });
    }

    // ADMIN
    const totalUsers = await prisma.user.count();
    const totalSurveys = await prisma.survey.count();
    const published = await prisma.survey.count({ where: { isPublished: true } as any });
    const totalResponses = await prisma.response.count();
    return res.json({ role: 'ADMIN', cards: { totalUsers, totalSurveys, published, totalResponses } });
  };
}
