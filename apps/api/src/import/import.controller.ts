import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
