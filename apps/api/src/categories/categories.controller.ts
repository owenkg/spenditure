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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Categories')
@UseGuards(JwtAuthGuard)
@Controller({ version: '1', path: 'categories' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (optionally filter by type)' })
  findAll(@CurrentUser() user: JwtPayload, @Query('type') type?: string) {
    return this.categoriesService.findAll(user.sub, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.categoriesService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  @ApiBody({
    examples: {
      expense: {
        summary: 'Expense category',
        value: { name: 'Food & Drink', type: 'EXPENSE', icon: 'utensils', color: '#FF6B35' },
      },
      income: {
        summary: 'Income category',
        value: { name: 'Salary', type: 'INCOME', icon: 'briefcase', color: '#22C55E' },
      },
      subcategory: {
        summary: 'Sub-category',
        value: { name: 'Restaurants', type: 'EXPENSE', icon: 'fork-knife', color: '#F97316', parentId: '<parent-category-id>' },
      },
    },
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiBody({
    examples: {
      rename: {
        value: { name: 'Groceries' },
      },
      recolor: {
        value: { color: '#EAB308' },
      },
    },
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.categoriesService.remove(user.sub, id);
  }
}
