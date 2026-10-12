import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from './auth/decorators/public.decorator';

function buildWelcome(req: Request) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    name: 'Spenditure API',
    version: '1.0',
    description: 'Personal finance tracking — income, expenses, budgets, and imports',
    docs: `${base}/api/docs`,
    health: `${base}/api/health`,
    endpoints: {
      auth: `${base}/api/v1/auth`,
      accounts: `${base}/api/v1/accounts`,
      transactions: `${base}/api/v1/transactions`,
      categories: `${base}/api/v1/categories`,
      budgets: `${base}/api/v1/budgets`,
      recurring: `${base}/api/v1/recurring`,
      settings: `${base}/api/v1/settings`,
      import: `${base}/api/v1/import`,
      export: `${base}/api/v1/export`,
    },
  };
}

// Serves GET /api  (global prefix applied)
@Controller()
export class AppController {
  @Public()
  @Get()
  apiRoot(@Req() req: Request) {
    return buildWelcome(req);
  }
}

// Serves GET /  (excluded from global prefix in main.ts)
@Controller('/')
export class RootController {
  @Public()
  @Get()
  root(@Req() req: Request) {
    return buildWelcome(req);
  }
}
