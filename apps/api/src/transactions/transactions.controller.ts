import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Transactions')
@UseGuards(JwtAuthGuard)
@Controller({ version: '1', path: 'transactions' })
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('chart')
  getChartData(
    @CurrentUser() user: JwtPayload,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.transactionsService.getChartData(user.sub, days ?? 7);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtPayload,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.transactionsService.getSummary(user.sub, dateFrom, dateTo);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(user.sub, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transactionsService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  @ApiBody({
    type: CreateTransactionDto,
    examples: {
      expense: {
        summary: 'Expense',
        value: { accountId: '<account-id>', categoryId: '<category-id>', type: 'EXPENSE', amount: 50000, description: 'Lunch', date: '2026-10-12T12:00:00.000Z' },
      },
      income: {
        summary: 'Income',
        value: { accountId: '<account-id>', type: 'INCOME', amount: 3840000, description: 'Salary', date: '2026-10-01T08:00:00.000Z' },
      },
      transfer: {
        summary: 'Transfer',
        value: { accountId: '<from-account-id>', toAccountId: '<to-account-id>', type: 'TRANSFER', amount: 200000, description: 'Move to savings', date: '2026-10-12T10:00:00.000Z' },
      },
    },
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.transactionsService.remove(user.sub, id);
  }
}
