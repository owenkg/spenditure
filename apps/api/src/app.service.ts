import { Injectable } from '@nestjs/common';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CategoriesService } from './categories/categories.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const user = await this.prisma.user.findFirst();
      if (!user) return;

      const count = await this.prisma.category.count({ where: { userId: user.id } });
      if (count === 0) {
        await this.categories.seedDefaults(user.id);
      }
    } catch (err: unknown) {
      // DB tables don't exist yet (migration pending) — server still starts,
      // requests will fail at the HTTP level with a clear error.
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[AppService] bootstrap check skipped — DB not ready:', message);
    }
  }
}
