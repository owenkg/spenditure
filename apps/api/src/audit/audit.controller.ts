import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Audit')
@Controller({ version: '1', path: 'audit' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit snapshots (last 12 months)' })
  listAudits(@CurrentUser() user: JwtPayload) {
    return this.auditService.listAudits(user.sub);
  }

  @Post('run')
  @ApiOperation({ summary: 'Trigger audit for the last 3 months' })
  async runAudit(@CurrentUser() user: JwtPayload) {
    await this.auditService.runAuditForRecentMonths(user.sub);
    return this.auditService.listAudits(user.sub);
  }

  @Get(':period')
  @ApiOperation({ summary: 'Get audit for a specific period (YYYY-MM)' })
  getAudit(
    @CurrentUser() user: JwtPayload,
    @Param('period') period: string,
  ) {
    return this.auditService.getAudit(user.sub, period);
  }
}
