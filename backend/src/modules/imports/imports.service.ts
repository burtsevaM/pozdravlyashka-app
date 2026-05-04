import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';

type ExcelWorkbookBuffer = Parameters<Workbook['xlsx']['load']>[0];

export type ImportedPersonRow = {
  fullName: string;
  birthDate?: Date;
  email?: string;
  department?: string;
  previousGift?: string;
  giftYear?: number;
  comment?: string;
};

@Injectable()
export class ImportsService {
  async readPeopleRows(fileBuffer: Buffer): Promise<ImportedPersonRow[]> {
    const workbook = new Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ExcelWorkbookBuffer);

    return [];
  }
}
