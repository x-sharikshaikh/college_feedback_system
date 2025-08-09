import { prisma } from '@utils/prisma';

export class SurveyService {
  async create(input: { title: string; description?: string | null; isAnonymous?: boolean; questions: any; createdBy: string }) {
    return prisma.survey.create({ data: { ...input } });
  }

  async list() {
    return prisma.survey.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
  // Avoid strict selects to work across client regen windows
  return prisma.survey.findUnique({ where: { id } }) as any;
  }

  async update(id: string, input: Partial<{ title: string; description?: string | null; isAnonymous: boolean; questions: any; isCompleted: boolean }>) {
    return prisma.survey.update({ where: { id }, data: input });
  }

  async publish(id: string, isPublished: boolean) {
  // Cast to any to avoid typing mismatch if client types are stale
  return prisma.survey.update({ where: { id }, data: { ...( { isPublished } as any) } as any });
  }

  async setCompleted(id: string, isCompleted: boolean) {
  return prisma.survey.update({ where: { id }, data: ({ isCompleted } as any) as any });
  }

  async remove(id: string) {
  // Delete dependent responses first to satisfy FK constraints
  await prisma.response.deleteMany({ where: { surveyId: id } });
  return prisma.survey.delete({ where: { id } });
  }
}
