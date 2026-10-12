import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBody, ApiConsumes, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ImportService } from './import.service';
import type { ImportResult } from './dto/import-result.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

const upload = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
};

@ApiTags('Import')
@Controller({ version: '1', path: 'import' })
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('dfcu')
  @Version('1')
  @ApiOperation({ summary: 'Import DFCU Bank PDF statement' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'DFCU Bank PDF statement' } }, required: ['file'] } })
  @UseInterceptors(FileInterceptor('file', upload))
  importDfcu(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    return this.importService.importDfcu(user.sub, file);
  }

  @Post('momo')
  @Version('1')
  @ApiOperation({ summary: 'Import MTN MoMo .eml email statement' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'MTN MoMo .eml file' } }, required: ['file'] } })
  @UseInterceptors(FileInterceptor('file', upload))
  importMomo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    return this.importService.importMomo(user.sub, file);
  }

  @Post('ledger')
  @Version('1')
  @ApiOperation({ summary: 'Import personal ledger .xlsx spreadsheet' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'Ledger .xlsx file' } }, required: ['file'] } })
  @UseInterceptors(FileInterceptor('file', upload))
  importLedger(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    return this.importService.importLedger(user.sub, file);
  }

  @Get('ledger/template')
  @Version('1')
  @Public()
  @ApiOperation({ summary: 'Download blank ledger .xlsx template' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadLedgerTemplate(@Res() res: Response): Promise<void> {
    const buf = await this.importService.getLedgerTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="spenditure_ledger_template.xlsx"',
      'Content-Length': buf.length,
    });
    res.end(buf);
  }
}
