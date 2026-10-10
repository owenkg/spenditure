import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

interface SeedEntry {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  children?: Array<{ name: string; icon: string; color: string }>;
}

const SEED_CATEGORIES: SeedEntry[] = [
  { name: 'Salary', type: 'INCOME', icon: 'trending-up', color: '#1A2B22' },
  { name: 'Freelance', type: 'INCOME', icon: 'laptop', color: '#2E4A38' },
  { name: 'Investment', type: 'INCOME', icon: 'bar-chart-2', color: '#B87212' },
  { name: 'Other Income', type: 'INCOME', icon: 'plus-circle', color: '#6B7280' },
  {
    name: 'Food & Drink',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#DC2626',
    children: [
      { name: 'Groceries', icon: 'shopping-cart', color: '#DC2626' },
      { name: 'Dining Out', icon: 'utensils', color: '#DC2626' },
      { name: 'Snacks & Coffee', icon: 'coffee', color: '#DC2626' },
    ],
  },
  {
    name: 'Transport',
    type: 'EXPENSE',
    icon: 'car',
    color: '#2563EB',
    children: [
      { name: 'Fuel', icon: 'fuel', color: '#2563EB' },
      { name: 'Public Transport', icon: 'bus', color: '#2563EB' },
      { name: 'Parking', icon: 'parking-circle', color: '#2563EB' },
    ],
  },
  {
    name: 'Housing',
    type: 'EXPENSE',
    icon: 'home',
    color: '#7C3AED',
    children: [
      { name: 'Rent', icon: 'key', color: '#7C3AED' },
      { name: 'Utilities', icon: 'zap', color: '#7C3AED' },
      { name: 'Internet', icon: 'wifi', color: '#7C3AED' },
    ],
  },
  {
    name: 'Health',
    type: 'EXPENSE',
    icon: 'heart-pulse',
    color: '#059669',
    children: [
      { name: 'Medical', icon: 'stethoscope', color: '#059669' },
      { name: 'Pharmacy', icon: 'pill', color: '#059669' },
      { name: 'Fitness', icon: 'dumbbell', color: '#059669' },
    ],
  },
  {
    name: 'Entertainment',
    type: 'EXPENSE',
    icon: 'music',
    color: '#DB2777',
    children: [
      { name: 'Streaming', icon: 'play-circle', color: '#DB2777' },
      { name: 'Events', icon: 'ticket', color: '#DB2777' },
      { name: 'Hobbies', icon: 'gamepad-2', color: '#DB2777' },
    ],
  },
  {
    name: 'Shopping',
    type: 'EXPENSE',
    icon: 'shopping-bag',
    color: '#EA580C',
    children: [
      { name: 'Clothing', icon: 'shirt', color: '#EA580C' },
      { name: 'Electronics', icon: 'smartphone', color: '#EA580C' },
      { name: 'Other Shopping', icon: 'package', color: '#EA580C' },
    ],
  },
  { name: 'Education', type: 'EXPENSE', icon: 'graduation-cap', color: '#0284C7' },
  {
    name: 'Family & Giving',
    type: 'EXPENSE',
    icon: 'users',
    color: '#B87212',
    children: [
      { name: 'Family Support', icon: 'heart-handshake', color: '#B87212' },
      { name: 'Gifts', icon: 'gift', color: '#B87212' },
      { name: 'Donations', icon: 'hand-heart', color: '#B87212' },
    ],
  },
  { name: 'Savings & Investment', type: 'EXPENSE', icon: 'piggy-bank', color: '#1A2B22' },
  { name: 'Other', type: 'EXPENSE', icon: 'more-horizontal', color: '#6B7280' },
];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaults(userId: string): Promise<void> {
    for (const entry of SEED_CATEGORIES) {
      const parent = await this.prisma.category.create({
        data: { userId, name: entry.name, type: entry.type, icon: entry.icon, color: entry.color },
      });
      if (entry.children) {
        for (const child of entry.children) {
          await this.prisma.category.create({
            data: {
              userId,
              name: child.name,
              type: entry.type,
              icon: child.icon,
              color: child.color,
              parentId: parent.id,
            },
          });
        }
      }
    }
  }

  async findAll(userId: string, type?: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        parentId: null,
        ...(type ? { type } : {}),
      },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return categories;
  }

  async findOne(userId: string, id: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, userId },
      include: { children: true },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, userId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }
    return this.prisma.category.create({
      data: { userId, ...dto },
      include: { children: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
      include: { children: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    const txCount = await this.prisma.transaction.count({
      where: { categoryId: id, userId },
    });
    if (txCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${txCount} transaction${txCount === 1 ? '' : 's'}. Re-assign them first.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!cat) throw new NotFoundException('Category not found');
  }
}
