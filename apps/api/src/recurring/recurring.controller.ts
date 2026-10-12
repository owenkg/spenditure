import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Recurring')
@UseGuards(JwtAuthGuard)
@Controller({ version: '1', path: 'recurring' })
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get()
  @ApiOperation({ summary: 'List all recurring transaction schedules' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.recurringService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single recurring entry' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Schedule a recurring transaction' })
  @ApiBody({
    type: CreateRecurringDto,
    examples: {
      salary: {
        summary: 'Monthly salary',
        value: { accountId: '<account-id>', type: 'INCOME', amount: 3840000, description: 'Salary', frequency: 'MONTHLY', nextDate: '2026-11-01', isActive: true },
      },
      subscription: {
        summary: 'Monthly subscription',
        value: { accountId: '<account-id>', type: 'EXPENSE', amount: 45000, description: 'Netflix', frequency: 'MONTHLY', nextDate: '2026-10-15', isActive: true },
      },
      rent: {
        summary: 'Monthly rent',
        value: { accountId: '<account-id>', type: 'EXPENSE', amount: 800000, description: 'Rent', frequency: 'MONTHLY', nextDate: '2026-11-01', endDate: '2027-12-31', isActive: true },
      },
    },
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring entry or pause/resume it' })
  @ApiBody({
    type: UpdateRecurringDto,
    examples: {
      pause: {
        summary: 'Pause',
        value: { isActive: false },
      },
      resume: {
        summary: 'Resume',
        value: { isActive: true },
      },
      update_amount: {
        summary: 'Update amount',
        value: { amount: 4200000 },
      },
    },
  })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRecurringDto) {
    return this.recurringService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove recurring schedule (past transactions kept)' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recurringService.remove(user.sub, id);
  }
}
