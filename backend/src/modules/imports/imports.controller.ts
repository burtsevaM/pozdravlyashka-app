import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CommitPeopleImportDto } from './dto/commit-people-import.dto';
import { ImportsService, MAX_IMPORT_FILE_SIZE_BYTES } from './imports.service';
import type { UploadedImportFile } from './imports.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('teams/:teamId/imports/people')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_IMPORT_FILE_SIZE_BYTES,
      },
    }),
  )
  previewPeopleImport(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @UploadedFile() file?: UploadedImportFile,
  ) {
    return this.importsService.previewPeopleImport(
      teamId,
      request.user.id,
      file,
    );
  }

  @Post('commit')
  commitPeopleImport(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() commitPeopleImportDto: CommitPeopleImportDto,
  ) {
    return this.importsService.commitPeopleImport(
      teamId,
      request.user.id,
      commitPeopleImportDto,
    );
  }

  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="people-import-template.xlsx"',
  )
  async downloadPeopleTemplate(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.importsService.createPeopleImportTemplate(
      teamId,
      request.user.id,
    );

    return new StreamableFile(buffer);
  }
}
