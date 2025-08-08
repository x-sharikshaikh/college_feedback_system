import { Request, Response } from 'express';
import Joi from 'joi';
import { SurveyService } from '@services/survey.service';
import { prisma } from '@utils/prisma';

const createSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  isAnonymous: Joi.boolean().default(false),
  questions: Joi.object().required(), // expect a JSON structure { items: [...] }
});

const updateSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  isAnonymous: Joi.boolean(),
  questions: Joi.object(),
}).min(1);

const publishSchema = Joi.object({ isPublished: Joi.boolean().required() });

const submitSchema = Joi.object({ data: Joi.object().required() });

export class SurveysController {
  service = new SurveyService();

  list = async (req: Request, res: Response) => {
    const role = (req as any).user?.role as 'STUDENT' | 'FACULTY' | 'ADMIN' | undefined;
    if (role === 'STUDENT') {
      const surveys = await prisma.survey.findMany({ where: ({ isPublished: true } as any), orderBy: { createdAt: 'desc' } });
      return res.json({ items: surveys });
    }
    const surveys = await this.service.list();
    return res.json({ items: surveys });
  };

  get = async (req: Request, res: Response) => {
    const role = (req as any).user?.role as 'STUDENT' | 'FACULTY' | 'ADMIN' | undefined;
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    if (role === 'STUDENT' && !survey.isPublished) return res.status(404).json({ error: 'Not found' });
    return res.json({ survey });
  };

  create = async (req: Request, res: Response) => {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const user = (req as any).user as { sub: string };
    const created = await this.service.create({
      title: value.title,
      isAnonymous: value.isAnonymous,
      questions: value.questions,
      createdBy: user.sub,
    });
    return res.status(201).json({ survey: created });
  };

  update = async (req: Request, res: Response) => {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const exists = await this.service.get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Not found' });
    const updated = await this.service.update(req.params.id, value);
    return res.json({ survey: updated });
  };

  publish = async (req: Request, res: Response) => {
    const { error, value } = publishSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const exists = await this.service.get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Not found' });
    const updated = await this.service.publish(req.params.id, value.isPublished);
    return res.json({ survey: updated });
  };

  submit = async (req: Request, res: Response) => {
    const { error, value } = submitSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const role = (req as any).user?.role as 'STUDENT' | 'FACULTY' | 'ADMIN' | undefined;
    const userId = (req as any).user?.sub as string | undefined;
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    if (role === 'STUDENT' && !survey.isPublished) return res.status(403).json({ error: 'Forbidden' });
    // Enforce one response per student per survey when not anonymous
    if (role === 'STUDENT' && !survey.isAnonymous && userId) {
      const existing = await prisma.response.findFirst({ where: { surveyId: survey.id, userId } });
      if (existing) return res.status(409).json({ error: 'You have already submitted this survey' });
    }
    const response = await prisma.response.create({
      data: {
        surveyId: survey.id,
        userId: survey.isAnonymous ? null : userId || null,
        data: value.data,
      },
    });
    return res.status(201).json({ responseId: response.id });
  };

  responses = async (req: Request, res: Response) => {
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    const items = await prisma.response.findMany({
      where: { surveyId: survey.id },
      select: { id: true, createdAt: true, userId: true, data: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ count: items.length, items });
  };

  analytics = async (req: Request, res: Response) => {
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    // Optional date range filters
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let gte: Date | undefined;
    let lte: Date | undefined;
    try {
      if (startDate) gte = new Date(startDate);
      if (endDate) lte = new Date(endDate);
      if ((gte && isNaN(gte.getTime())) || (lte && isNaN(lte.getTime()))) throw new Error('Invalid date');
    } catch {
      return res.status(400).json({ error: 'Invalid startDate or endDate' });
    }
    const where: any = { surveyId: survey.id };
    if (gte || lte) where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    const responses = await prisma.response.findMany({ where, select: { data: true } });
    const totalResponses = responses.length;
    const questions = (survey as any).questions as any;
    const items = Array.isArray(questions?.items) ? questions.items : [];
    const likerts = items.filter((q: any) => q?.type?.toLowerCase?.() === 'likert' && q.key);
    const perLikert: Record<string, { label: string; scale: number; avg: number; counts: Record<string, number> }> = {};
    for (const q of likerts) {
      const scale = Number(q.scale || 5) || 5;
      const counts: Record<string, number> = {};
      for (let i = 1; i <= scale; i++) counts[String(i)] = 0;
      let sum = 0;
      let n = 0;
      for (const r of responses) {
        const v = (r.data as any)?.[q.key];
        const num = Number(v);
        if (!Number.isNaN(num) && num >= 1 && num <= scale) {
          counts[String(num)] = (counts[String(num)] || 0) + 1;
          sum += num;
          n++;
        }
      }
      perLikert[q.key] = { label: q.label ?? q.key, scale, avg: n ? sum / n : 0, counts };
    }
    return res.json({ totalResponses, likert: perLikert });
  };

  exportCsv = async (req: Request, res: Response) => {
    // Exports responses for a survey as CSV with optional date range
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let gte: Date | undefined;
    let lte: Date | undefined;
    try {
      if (startDate) gte = new Date(startDate);
      if (endDate) lte = new Date(endDate);
      if ((gte && isNaN(gte.getTime())) || (lte && isNaN(lte.getTime()))) throw new Error('Invalid date');
    } catch {
      return res.status(400).json({ error: 'Invalid startDate or endDate' });
    }
    const where: any = { surveyId: survey.id };
    if (gte || lte) where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    const responses = await prisma.response.findMany({
      where,
      select: { id: true, createdAt: true, userId: true, data: true },
      orderBy: { createdAt: 'asc' },
    });

    const questions = (survey as any).questions as any;
    const items = Array.isArray(questions?.items) ? questions.items : [];
    const keys: string[] = items.map((q: any) => q?.key).filter((k: any) => typeof k === 'string');

    // Build metadata header rows
    const rows: string[][] = [];
    rows.push(['Survey Title', String((survey as any).title || '')]);
    rows.push(['Survey ID', String((survey as any).id || '')]);
    rows.push(['Anonymous', String((survey as any).isAnonymous ?? false)]);
    if (startDate) rows.push(['Start Date', startDate]);
    if (endDate) rows.push(['End Date', endDate]);
    rows.push(['Generated At', new Date().toISOString()]);
    rows.push([]); // empty line

    // Column header and rows
    const header = ['id', 'createdAt', 'userId', ...keys];
    rows.push(header);
    for (const r of responses) {
      const row: string[] = [];
      row.push(String(r.id));
      row.push(new Date(r.createdAt).toISOString());
      row.push(r.userId ? String(r.userId) : '');
      for (const k of keys) {
        const v = (r.data as any)?.[k];
        if (v === null || v === undefined) {
          row.push('');
        } else if (typeof v === 'object') {
          row.push(JSON.stringify(v));
        } else {
          row.push(String(v));
        }
      }
      rows.push(row);
    }

    // Simple CSV serialization with escaping of quotes and commas
    const serializeCell = (cell: string) => {
      const needsQuotes = /[",\n\r]/.test(cell) || cell.includes(',');
      const c = cell.replace(/"/g, '""');
      return needsQuotes ? `"${c}` + `"` : c;
    };
    const csv = rows.map((row) => row.map((c) => serializeCell(c)).join(',')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${survey.id}.csv"`);
    return res.status(200).send('\uFEFF' + csv); // BOM for Excel compatibility
  };

  exportXlsx = async (req: Request, res: Response) => {
    // Lightweight XLSX export using dynamic import to avoid startup cost
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let gte: Date | undefined;
    let lte: Date | undefined;
    try {
      if (startDate) gte = new Date(startDate);
      if (endDate) lte = new Date(endDate);
      if ((gte && isNaN(gte.getTime())) || (lte && isNaN(lte.getTime()))) throw new Error('Invalid date');
    } catch {
      return res.status(400).json({ error: 'Invalid startDate or endDate' });
    }
    const where: any = { surveyId: survey.id };
    if (gte || lte) where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };

    const responses = await prisma.response.findMany({
      where,
      select: { id: true, createdAt: true, userId: true, data: true },
      orderBy: { createdAt: 'asc' },
    });

    const questions = (survey as any).questions as any;
    const items = Array.isArray(questions?.items) ? questions.items : [];
    const keys: string[] = items.map((q: any) => q?.key).filter((k: any) => typeof k === 'string');

    const rows: any[] = [];
    // metadata rows as objects for first sheet
    rows.push({ Field: 'Survey Title', Value: String((survey as any).title || '') });
    rows.push({ Field: 'Survey ID', Value: String((survey as any).id || '') });
    rows.push({ Field: 'Anonymous', Value: String((survey as any).isAnonymous ?? false) });
    if (startDate) rows.push({ Field: 'Start Date', Value: startDate });
    if (endDate) rows.push({ Field: 'End Date', Value: endDate });
    rows.push({ Field: 'Generated At', Value: new Date().toISOString() });

    const table = [
      { id: 'id', createdAt: 'createdAt', userId: 'userId', ...Object.fromEntries(keys.map(k => [k, k])) },
      ...responses.map((r) => ({
        id: r.id,
        createdAt: new Date(r.createdAt).toISOString(),
        userId: r.userId || '',
        ...Object.fromEntries(keys.map(k => {
          const v = (r.data as any)?.[k];
          return [k, v && typeof v === 'object' ? JSON.stringify(v) : (v ?? '')];
        }))
      }))
    ];

    // dynamic import exceljs
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const meta = wb.addWorksheet('Meta');
    meta.columns = [ { header: 'Field', key: 'Field', width: 20 }, { header: 'Value', key: 'Value', width: 50 } ];
    meta.addRows(rows);
    const ws = wb.addWorksheet('Responses');
    ws.columns = Object.keys(table[0]).map((k) => ({ header: k, key: k, width: 20 }));
    ws.addRows(table);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${(survey as any).id}.xlsx"`);
    const buffer = await wb.xlsx.writeBuffer();
    return res.status(200).send(Buffer.from(buffer));
  };

  exportPdf = async (req: Request, res: Response) => {
    // Minimal PDF summary report: title, date, counts per likert
    const survey = await this.service.get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Not found' });

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let gte: Date | undefined;
    let lte: Date | undefined;
    try {
      if (startDate) gte = new Date(startDate);
      if (endDate) lte = new Date(endDate);
      if ((gte && isNaN(gte.getTime())) || (lte && isNaN(lte.getTime()))) throw new Error('Invalid date');
    } catch {
      return res.status(400).json({ error: 'Invalid startDate or endDate' });
    }
    const where: any = { surveyId: survey.id };
    if (gte || lte) where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };

    const responses = await prisma.response.findMany({ where, select: { data: true } });
    const questions = (survey as any).questions as any;
    const items = Array.isArray(questions?.items) ? questions.items : [];
    const likerts = items.filter((q: any) => q?.type?.toLowerCase?.() === 'likert' && q.key);
    const perLikert: Record<string, { label: string; scale: number; counts: Record<string, number> }> = {};
    for (const q of likerts) {
      const scale = Number(q.scale || 5) || 5;
      const counts: Record<string, number> = {};
      for (let i = 1; i <= scale; i++) counts[String(i)] = 0;
      for (const r of responses) {
        const v = (r.data as any)?.[q.key];
        const num = Number(v);
        if (!Number.isNaN(num) && num >= 1 && num <= scale) counts[String(num)] = (counts[String(num)] || 0) + 1;
      }
      perLikert[q.key] = { label: q.label ?? q.key, scale, counts };
    }

    // dynamic import pdfkit for simple server-side PDF
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${(survey as any).id}.pdf"`);
    doc.pipe(res);
    doc.fontSize(18).text(String((survey as any).title || 'Survey Report'));
    doc.moveDown();
    doc.fontSize(10).text(`Survey ID: ${(survey as any).id}`);
    doc.text(`Anonymous: ${String((survey as any).isAnonymous ?? false)}`);
    if (startDate) doc.text(`Start Date: ${startDate}`);
    if (endDate) doc.text(`End Date: ${endDate}`);
    doc.text(`Generated At: ${new Date().toISOString()}`);
    doc.moveDown();
  for (const [, info] of Object.entries(perLikert)) {
      doc.fontSize(12).text(`${(info as any).label}`);
      const counts = (info as any).counts as Record<string, number>;
      doc.fontSize(10).text(Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join('  '));
      doc.moveDown(0.5);
    }
    doc.end();
  };
}
