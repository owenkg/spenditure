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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Budgets')
@UseGuards(JwtAuthGuard)
@Controller({ version: '1', path: 'budgets' })
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'List budgets with live spent/remaining' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.budgetsService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single budget' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.budgetsService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a budget' })
  @ApiBody({
    examples: {
      monthly: {
        summary: 'Monthly food budget',
        value: { categoryId: '<category-id>', amount: 500000, period: 'MONTHLY', startDate: '2026-10-01' },
      },
      weekly: {
        summary: 'Weekly transport budget',
        value: { categoryId: '<category-id>', amount: 100000, period: 'WEEKLY', startDate: '2026-10-06' },
      },
    },
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update budget amount, period, or end date' })
  @ApiBody({
    examples: {
      increase: {
        value: { amount: 700000 },
      },
      end: {
        summary: 'Set end date',
        value: { endDate: '2026-12-31' },
      },
    },
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.budgetsService.remove(user.sub, id);
  }
}
