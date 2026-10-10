import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportService } from './import.service';
import type { ImportResult } from './dto/import-result.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

const upload = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
};

@Controller({ version: '1', path: 'import' })
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('dfcu')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', upload))
  importDfcu(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    return this.importService.importDfcu(user.sub, file);
  }

  @Post('momo')
  @Version('1')
  @UseInterceptors(FileInterceptor('file', upload))
  importMomo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    return this.importService.importMomo(user.sub, file);
  }
}
