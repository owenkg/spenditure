import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Accounts')
@UseGuards(JwtAuthGuard)
@Controller({ version: '1', path: 'accounts' })
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts with live balance' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.accountsService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountsService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an account' })
  @ApiBody({
    type: CreateAccountDto,
    examples: {
      bank: {
        summary: 'Bank account',
        value: { name: 'DFCU Bank', type: 'BANK', color: '#1A2B22', icon: 'building-2', currency: 'UGX' },
      },
      mobile_money: {
        summary: 'Mobile money',
        value: { name: 'MTN MoMo', type: 'MOBILE_MONEY', color: '#FFCB00', icon: 'smartphone', currency: 'UGX' },
      },
      cash: {
        summary: 'Cash',
        value: { name: 'Cash', type: 'CASH', color: '#B87212', icon: 'wallet', currency: 'UGX' },
      },
    },
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account fields' })
  @ApiBody({
    type: UpdateAccountDto,
    examples: {
      rename: {
        value: { name: 'Stanbic Bank' },
      },
      recolor: {
        value: { color: '#2563EB' },
      },
    },
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-archive an account' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountsService.remove(user.sub, id);
  }

  @Get(':id/balance-history')
  @ApiOperation({ summary: 'Monthly balance snapshots for an account' })
  getBalanceHistory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountsService.getBalanceHistory(user.sub, id);
  }
}
