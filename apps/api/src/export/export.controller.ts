import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@Controller({ version: '1', path: 'export' })
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('accountId') accountId?: string,
    @Res() res?: Response,
  ) {
    return this.exportService.exportCsv(user.sub, { dateFrom, dateTo, accountId }, res!);
  }

  @Get('excel')
  exportExcel(
    @CurrentUser() user: JwtPayload,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('accountId') accountId?: string,
    @Res() res?: Response,
  ) {
    return this.exportService.exportExcel(user.sub, { dateFrom, dateTo, accountId }, res!);
  }
}
