import { BadRequestException, Injectable } from '@nestjs/common';
import { PersonStatus } from '@prisma/client';
import { Workbook } from 'exceljs';
import type { Cell, Row } from 'exceljs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import {
  CommitPeopleImportDto,
  CommitPeopleImportRowDto,
  ImportedGiftHistoryDto,
  ImportedPersonDto,
} from './dto/commit-people-import.dto';

type ExcelWorkbookBuffer = Parameters<Workbook['xlsx']['load']>[0];

type ImportColumnKey =
  | 'fullName'
  | 'birthDate'
  | 'email'
  | 'department'
  | 'giftName'
  | 'year'
  | 'comment';

type ImportColumnMap = Partial<Record<ImportColumnKey, number>>;

type ParsedImportRow = {
  rowNumber: number;
  person: ImportedPersonDto;
  giftHistory: ImportedGiftHistoryDto | null;
  errors: string[];
};

export type UploadedImportFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type PeopleImportPreviewRow = {
  rowNumber: number;
  valid: boolean;
  person: ImportedPersonDto | null;
  giftHistory: ImportedGiftHistoryDto | null;
  errors: string[];
};

export type PeopleImportPreviewResponse = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: PeopleImportPreviewRow[];
};

export type PeopleImportCommitError = {
  rowNumber?: number;
  fullName?: string;
  message: string;
};

export type PeopleImportCommitResponse = {
  createdPeople: number;
  createdGiftHistory: number;
  skippedRows: number;
  errors: PeopleImportCommitError[];
};

export type PeopleImportTemplateBuffer = Buffer;

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const EXPECTED_HEADERS: Record<ImportColumnKey, string> = {
  fullName: 'ФИО',
  birthDate: 'Дата рождения',
  email: 'Email',
  department: 'Группа/отдел',
  giftName: 'Прошлый подарок',
  year: 'Год подарка',
  comment: 'Комментарий',
};

const REQUIRED_COLUMNS: ImportColumnKey[] = ['fullName', 'birthDate'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_GIFT_OCCASION = 'Birthday';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly teamsService: TeamsService,
  ) {}

  async previewPeopleImport(
    teamId: string,
    userId: string,
    file?: UploadedImportFile,
  ): Promise<PeopleImportPreviewResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    this.validateUploadedFile(file);

    const parsedRows = await this.readPeopleRows(file.buffer);
    await this.markDuplicateRows(teamId, parsedRows);

    const rows = parsedRows.map((row) => this.toPreviewRow(row));
    const validRows = rows.filter((row) => row.valid).length;

    return {
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      rows,
    };
  }

  async commitPeopleImport(
    teamId: string,
    userId: string,
    commitPeopleImportDto: CommitPeopleImportDto,
  ): Promise<PeopleImportCommitResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);

    const result: PeopleImportCommitResponse = {
      createdPeople: 0,
      createdGiftHistory: 0,
      skippedRows: 0,
      errors: [],
    };

    for (const row of commitPeopleImportDto.rows) {
      try {
        const savedRow = await this.saveImportedRow(teamId, row);

        if (!savedRow.saved) {
          result.skippedRows += 1;
          result.errors.push(savedRow.error);
          continue;
        }

        result.createdPeople += 1;

        if (savedRow.createdGiftHistory) {
          result.createdGiftHistory += 1;
        }
      } catch (error) {
        result.skippedRows += 1;
        result.errors.push({
          rowNumber: row.rowNumber,
          fullName: row.person.fullName,
          message:
            error instanceof Error
              ? error.message
              : 'Не удалось сохранить строку импорта',
        });
      }
    }

    return result;
  }

  async createPeopleImportTemplate(
    teamId: string,
    userId: string,
  ): Promise<PeopleImportTemplateBuffer> {
    await this.teamsService.ensureTeamMember(teamId, userId);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('People import');
    const headers = Object.values(EXPECTED_HEADERS);

    worksheet.addRow(headers);
    worksheet.addRow([
      'Иванова Анна Сергеевна',
      '15.05.1992',
      'anna.ivanova@example.com',
      'Маркетинг',
      'Сертификат в книжный магазин',
      2025,
      'Любит бумажные книги',
    ]);
    worksheet.addRow([
      'Петров Алексей Игоревич',
      '03.11.1988',
      'alexey.petrov@example.com',
      'Разработка',
      'Термокружка',
      2024,
      'Не указывать реальные данные в шаблоне',
    ]);

    worksheet.columns = [
      { width: 28 },
      { width: 18 },
      { width: 28 },
      { width: 22 },
      { width: 30 },
      { width: 14 },
      { width: 36 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5D50' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDE4EC' } },
          left: { style: 'thin', color: { argb: 'FFDDE4EC' } },
          bottom: { style: 'thin', color: { argb: 'FFDDE4EC' } },
          right: { style: 'thin', color: { argb: 'FFDDE4EC' } },
        };
      });
    });

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async readPeopleRows(fileBuffer: Buffer): Promise<ParsedImportRow[]> {
    const workbook = new Workbook();

    try {
      await workbook.xlsx.load(fileBuffer as unknown as ExcelWorkbookBuffer);
    } catch {
      throw new BadRequestException('Не удалось прочитать файл .xlsx');
    }

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('В файле нет листов с данными');
    }

    const columns = this.readHeaderColumns(worksheet.getRow(1));
    const rows: ParsedImportRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      if (
        this.isEmptyRow(row.cellCount, (index) =>
          this.getCellText(row.getCell(index)),
        )
      ) {
        continue;
      }

      rows.push(
        this.parseRow(rowNumber, columns, (index) => row.getCell(index)),
      );
    }

    return rows;
  }

  private readHeaderColumns(headerRow: Row): ImportColumnMap {
    const columns: ImportColumnMap = {};

    headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const normalizedHeader = this.normalizeHeader(this.getCellText(cell));
      const columnKey = this.findColumnKey(normalizedHeader);

      if (columnKey) {
        columns[columnKey] = columnNumber;
      }
    });

    const missingColumns = REQUIRED_COLUMNS.filter(
      (columnKey) => !columns[columnKey],
    );

    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `В файле нет обязательных колонок: ${missingColumns
          .map((columnKey) => EXPECTED_HEADERS[columnKey])
          .join(', ')}`,
      );
    }

    return columns;
  }

  private parseRow(
    rowNumber: number,
    columns: ImportColumnMap,
    getCell: (columnNumber: number) => Cell,
  ): ParsedImportRow {
    const errors: string[] = [];
    const fullName = this.getOptionalCellText(columns.fullName, getCell);
    const email = this.getOptionalCellText(
      columns.email,
      getCell,
    )?.toLowerCase();
    const department = this.getOptionalCellText(columns.department, getCell);
    const giftName = this.getOptionalCellText(columns.giftName, getCell);
    const comment = this.getOptionalCellText(columns.comment, getCell);
    const birthDate = this.parseBirthDateCell(columns.birthDate, getCell);
    const giftYear = this.parseGiftYearCell(columns.year, getCell, errors);

    if (!fullName) {
      errors.push('Не заполнено ФИО');
    }

    if (!birthDate) {
      errors.push(
        'Дата рождения не заполнена или имеет неподдерживаемый формат',
      );
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      errors.push('Email имеет неверный формат');
    }

    const person: ImportedPersonDto = {
      fullName: fullName ?? '',
      birthDate: birthDate ?? '',
      ...(email ? { email } : {}),
      ...(department ? { department } : {}),
    };

    const giftHistory =
      giftName || giftYear !== undefined || comment
        ? {
            ...(giftName ? { giftName } : {}),
            ...(giftYear !== undefined ? { year: giftYear } : {}),
            ...(comment ? { comment } : {}),
          }
        : null;

    return {
      rowNumber,
      person,
      giftHistory,
      errors,
    };
  }

  private async markDuplicateRows(
    teamId: string,
    rows: ParsedImportRow[],
  ): Promise<void> {
    const validRows = rows.filter((row) => row.errors.length === 0);
    const names = [...new Set(validRows.map((row) => row.person.fullName))];

    const existingPeople = await this.prismaService.person.findMany({
      where: {
        teamId,
        fullName: {
          in: names,
        },
      },
      select: {
        fullName: true,
        birthDate: true,
      },
    });

    const existingKeys = new Set(
      existingPeople.map((person) =>
        this.getDuplicateKey(
          person.fullName,
          this.formatDateOnly(person.birthDate),
        ),
      ),
    );
    const seenKeys = new Set<string>();

    for (const row of validRows) {
      const duplicateKey = this.getDuplicateKey(
        row.person.fullName,
        row.person.birthDate,
      );

      if (existingKeys.has(duplicateKey)) {
        row.errors.push(
          'Участник с таким ФИО и датой рождения уже есть в коллективе',
        );
        continue;
      }

      if (seenKeys.has(duplicateKey)) {
        row.errors.push('Такая строка уже есть в импортируемом файле');
        continue;
      }

      seenKeys.add(duplicateKey);
    }
  }

  private async saveImportedRow(
    teamId: string,
    row: CommitPeopleImportRowDto,
  ): Promise<
    | { saved: true; createdGiftHistory: boolean }
    | { saved: false; error: PeopleImportCommitError }
  > {
    return this.prismaService.$transaction(async (prisma) => {
      const birthDate = this.parseDateOnly(row.person.birthDate);
      const duplicatePerson = await prisma.person.findFirst({
        where: {
          teamId,
          fullName: row.person.fullName,
          birthDate,
        },
        select: { id: true },
      });

      if (duplicatePerson) {
        return {
          saved: false,
          error: {
            rowNumber: row.rowNumber,
            fullName: row.person.fullName,
            message:
              'Участник с таким ФИО и датой рождения уже есть в коллективе',
          },
        };
      }

      const person = await prisma.person.create({
        data: {
          teamId,
          fullName: row.person.fullName,
          birthDate,
          email: row.person.email,
          department: row.person.department,
          status: PersonStatus.ACTIVE,
        },
      });

      const giftHistory = row.giftHistory;
      const giftName = giftHistory?.giftName?.trim();

      if (!giftHistory || !giftName) {
        return { saved: true, createdGiftHistory: false };
      }

      await prisma.giftHistory.create({
        data: {
          personId: person.id,
          giftName,
          year: giftHistory.year ?? null,
          occasion: DEFAULT_GIFT_OCCASION,
          comment: giftHistory.comment,
        },
      });

      return { saved: true, createdGiftHistory: true };
    });
  }

  private validateUploadedFile(
    file: UploadedImportFile | undefined,
  ): asserts file is UploadedImportFile {
    if (!file) {
      throw new BadRequestException('Выберите файл .xlsx для импорта');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Поддерживаются только файлы .xlsx');
    }

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      throw new BadRequestException('Размер файла не должен превышать 5 МБ');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Файл пустой или не был передан');
    }
  }

  private isEmptyRow(
    cellCount: number,
    getCellText: (columnNumber: number) => string,
  ): boolean {
    for (let index = 1; index <= cellCount; index += 1) {
      if (getCellText(index).length > 0) {
        return false;
      }
    }

    return true;
  }

  private getOptionalCellText(
    columnNumber: number | undefined,
    getCell: (columnNumber: number) => Cell,
  ): string | undefined {
    if (!columnNumber) {
      return undefined;
    }

    const text = this.getCellText(getCell(columnNumber));
    return text.length > 0 ? text : undefined;
  }

  private getCellText(cell: Cell): string {
    const value = cell.value;

    if (value instanceof Date) {
      return this.formatDateParts(
        value.getFullYear(),
        value.getMonth() + 1,
        value.getDate(),
      );
    }

    return cell.text.trim();
  }

  private parseBirthDateCell(
    columnNumber: number | undefined,
    getCell: (columnNumber: number) => Cell,
  ): string | undefined {
    if (!columnNumber) {
      return undefined;
    }

    const cell = getCell(columnNumber);

    if (cell.value instanceof Date) {
      return this.formatDateParts(
        cell.value.getFullYear(),
        cell.value.getMonth() + 1,
        cell.value.getDate(),
      );
    }

    return this.parseDateText(this.getCellText(cell));
  }

  private parseGiftYearCell(
    columnNumber: number | undefined,
    getCell: (columnNumber: number) => Cell,
    errors: string[],
  ): number | undefined {
    if (!columnNumber) {
      return undefined;
    }

    const rawText = this.getCellText(getCell(columnNumber));

    if (!rawText) {
      return undefined;
    }

    const year = Number(rawText);

    if (!Number.isInteger(year)) {
      errors.push('Год подарка должен быть числом');
      return undefined;
    }

    return year;
  }

  private parseDateText(value: string): string | undefined {
    const normalizedValue = value.trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);

    if (isoMatch) {
      return this.parseDateParts(
        Number(isoMatch[1]),
        Number(isoMatch[2]),
        Number(isoMatch[3]),
      );
    }

    const ruMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(normalizedValue);

    if (ruMatch) {
      return this.parseDateParts(
        Number(ruMatch[3]),
        Number(ruMatch[2]),
        Number(ruMatch[1]),
      );
    }

    return undefined;
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (!this.isValidDateParts(date, year, month, day)) {
      throw new BadRequestException(
        'Дата должна существовать и иметь формат YYYY-MM-DD',
      );
    }

    return date;
  }

  private parseDateParts(
    year: number,
    month: number,
    day: number,
  ): string | undefined {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (!this.isValidDateParts(date, year, month, day)) {
      return undefined;
    }

    return this.formatDateParts(year, month, day);
  }

  private isValidDateParts(
    date: Date,
    year: number,
    month: number,
    day: number,
  ): boolean {
    return (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatDateParts(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0',
    )}`;
  }

  private toPreviewRow(row: ParsedImportRow): PeopleImportPreviewRow {
    return {
      rowNumber: row.rowNumber,
      valid: row.errors.length === 0,
      person: row.person.fullName || row.person.birthDate ? row.person : null,
      giftHistory: row.giftHistory,
      errors: row.errors,
    };
  }

  private findColumnKey(normalizedHeader: string): ImportColumnKey | undefined {
    const entries = Object.entries(EXPECTED_HEADERS) as [
      ImportColumnKey,
      string,
    ][];

    return entries.find(
      ([, header]) => this.normalizeHeader(header) === normalizedHeader,
    )?.[0];
  }

  private normalizeHeader(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private getDuplicateKey(fullName: string, birthDate: string): string {
    return `${fullName.trim().toLowerCase()}|${birthDate}`;
  }
}
