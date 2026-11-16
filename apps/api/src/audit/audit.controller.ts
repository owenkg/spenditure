import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Audit')
@Controller({ version: '1', path: 'audit' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List auditable accounts with their last audit status' })
  listAccounts(@CurrentUser() user: JwtPayload) {
    return this.auditService.getAuditableAccounts(user.sub);
  }

  @Post('run')
  @ApiOperation({ summary: 'Run audit for all auditable accounts (last 3 months)' })
  async runAll(@CurrentUser() user: JwtPayload) {
    await this.auditService.runAuditForUser(user.sub);
    return this.auditService.getAuditableAccounts(user.sub);
  }

  @Get(':accountId/history')
  @ApiOperation({ summary: 'List audit history for a specific account' })
  listForAccount(
    @CurrentUser() user: JwtPayload,
    @Param('accountId') accountId: string,
  ) {
    return this.auditService.listAuditsForAccount(user.sub, accountId);
  }

  @Post(':accountId/run')
  @ApiOperation({ summary: 'Run audit for a specific account (last 3 months)' })
  async runForAccount(
    @CurrentUser() user: JwtPayload,
    @Param('accountId') accountId: string,
  ) {
    return this.auditService.runAuditForAccount(user.sub, accountId);
  }
}
