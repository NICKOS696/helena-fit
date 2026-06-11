import { BadRequestException } from '@nestjs/common';
import { PaymeService } from './payme.service';

/**
 * Тесты на закрытие дыры «оплати 1 сум»: createPaymentLink обязан считать
 * цену на сервере из БД и игнорировать сумму, присланную клиентом.
 */
describe('PaymeService.createPaymentLink (server-side price)', () => {
  function setup(collection: any) {
    let createdData: any = null;
    const prisma: any = {
      workoutCollection: { findUnique: async () => collection },
      recipeCollection: { findUnique: async () => collection },
      transaction: {
        create: async (args: any) => {
          createdData = args.data;
          return { id: 'tx-1', ...args.data };
        },
      },
    };
    const config: any = {
      get: (k: string) =>
        ({
          PAYME_MERCHANT_ID: 'merchant',
          TELEGRAM_APP_URL: 'https://helena-fit.ru',
          PAYME_ENDPOINT: 'https://checkout.paycom.uz',
        })[k],
    };
    const service = new PaymeService(prisma, config);
    return { service, getCreated: () => createdData };
  }

  function amountFromUrl(url: string): number {
    const b64 = url.split('/').pop() as string;
    const decoded = Buffer.from(b64, 'base64').toString();
    const m = decoded.match(/a=(\d+)/);
    return m ? Number(m[1]) : NaN;
  }

  it('игнорирует amount клиента и берёт цену со скидкой из БД', async () => {
    const { service, getCreated } = setup({
      id: 'c1',
      isActive: true,
      price: 150000,
      discount: 20,
      discountType: 'PERCENTAGE',
      discountEndDate: null,
    });

    const url = await service.createPaymentLink({
      userId: 'u1',
      collectionId: 'c1',
      collectionType: 'WORKOUT',
      amount: 1, // попытка заплатить 1 сум
    });

    // 150000 - 20% = 120000, а не 1
    expect(getCreated().amount).toBe(120000);
    // в ссылке Payme сумма в тийинах = 120000 * 100
    expect(amountFromUrl(url)).toBe(12000000);
  });

  it('без скидки берёт полную цену', async () => {
    const { service, getCreated } = setup({
      id: 'c2',
      isActive: true,
      price: 99000,
      discount: 0,
      discountType: 'PERCENTAGE',
      discountEndDate: null,
    });

    await service.createPaymentLink({
      userId: 'u1',
      collectionId: 'c2',
      collectionType: 'RECIPE',
      amount: 5,
    });

    expect(getCreated().amount).toBe(99000);
  });

  it('истёкшая скидка игнорируется', async () => {
    const { service, getCreated } = setup({
      id: 'c3',
      isActive: true,
      price: 50000,
      discount: 50,
      discountType: 'PERCENTAGE',
      discountEndDate: new Date('2000-01-01'),
    });

    await service.createPaymentLink({
      userId: 'u1',
      collectionId: 'c3',
      collectionType: 'WORKOUT',
    });

    expect(getCreated().amount).toBe(50000);
  });

  it('отклоняет неактивный/несуществующий сборник', async () => {
    const { service } = setup(null);
    await expect(
      service.createPaymentLink({
        userId: 'u1',
        collectionId: 'missing',
        collectionType: 'WORKOUT',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
