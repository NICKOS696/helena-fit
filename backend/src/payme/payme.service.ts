import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymeService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Создать ссылку на оплату
   */
  async createPaymentLink(params: {
    userId: string;
    collectionId: string;
    collectionType: 'WORKOUT' | 'RECIPE';
    amount: number;
  }): Promise<string> {
    const { userId, collectionId, collectionType, amount } = params;

    // Создаем транзакцию в БД
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        itemType: collectionType === 'WORKOUT' ? 'WORKOUT_COLLECTION' : 'RECIPE_COLLECTION',
        itemId: collectionId,
        amount,
        status: 'PENDING',
        paymentMethod: 'PAYME',
      },
    });

    // Формируем параметры для Payme
    const merchantId = this.config.get('PAYME_MERCHANT_ID');
    const amountInTiyin = amount * 100; // Payme работает в тийинах (1 сум = 100 тийин)
    const telegramAppUrl = this.config.get('TELEGRAM_APP_URL');
    
    // Формируем параметры в формате key=value с разделителем ;
    // c - URL возврата после оплаты (пользователь вернётся в бот)
    // l - язык интерфейса (ru)
    const paymentParams = `m=${merchantId};ac.order_id=${transaction.id};a=${amountInTiyin};c=${telegramAppUrl};l=ru`;

    // Кодируем в base64
    const paramsEncoded = Buffer.from(paymentParams).toString('base64');

    // Формируем URL (правильный формат для Payme)
    const paymentUrl = `${this.config.get('PAYME_ENDPOINT')}/${paramsEncoded}`;

    console.log('Payment URL:', paymentUrl); // Для отладки
    return paymentUrl;
  }

  /**
   * Обработка webhook от Payme
   */
  async handleWebhook(body: any, authorization: string): Promise<any> {
    console.log('=== PAYME WEBHOOK ===');
    console.log('Method:', body?.method);
    console.log('Authorization present:', !!authorization);
    console.log('Body:', JSON.stringify(body));

    // Проверяем авторизацию
    if (!this.verifyAuthorization(authorization)) {
      console.log('AUTH FAILED! Authorization header:', authorization?.substring(0, 20) + '...');
      return {
        error: {
          code: -32504,
          message: 'Unauthorized',
        },
      };
    }
    console.log('AUTH OK');

    const { method, params } = body;

    switch (method) {
      case 'CheckPerformTransaction':
        return await this.checkPerformTransaction(params);
      
      case 'CreateTransaction':
        return await this.createTransaction(params);
      
      case 'PerformTransaction':
        return await this.performTransaction(params);
      
      case 'CancelTransaction':
        return await this.cancelTransaction(params);
      
      case 'CheckTransaction':
        return await this.checkTransaction(params);
      
      case 'GetStatement':
        return await this.getStatement(params);
      
      default:
        return {
          error: {
            code: -32601,
            message: 'Method not found',
          },
        };
    }
  }

  /**
   * Проверка авторизации
   */
  private verifyAuthorization(authorization: string): boolean {
    if (!authorization || !authorization.startsWith('Basic ')) {
      return false;
    }

    const credentials = Buffer.from(authorization.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    const merchantId = this.config.get('PAYME_MERCHANT_ID');
    const testKey = this.config.get('PAYME_TEST_KEY');
    const prodKey = this.config.get('PAYME_PROD_KEY');

    return username === 'Paycom' && (password === testKey || password === prodKey);
  }

  /**
   * CheckPerformTransaction - проверка возможности выполнения транзакции
   */
  private async checkPerformTransaction(params: any) {
    const { account, amount } = params;
    const orderId = account.order_id || account.transaction_id;

    // Проверяем существует ли заказ
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: orderId },
    });

    if (!transaction) {
      return {
        error: {
          code: -31050,
          message: {
            ru: 'Заказ не найден',
            uz: 'Buyurtma topilmadi',
            en: 'Order not found',
          },
        },
      };
    }

    // Проверяем статус заказа - только PENDING можно оплачивать
    if (transaction.status !== 'PENDING') {
      return {
        error: {
          code: -31099,
          message: {
            ru: 'Заказ недоступен для оплаты',
            uz: 'Buyurtma to\'lov uchun mavjud emas',
            en: 'Order not available for payment',
          },
        },
      };
    }

    // Проверяем сумму
    const expectedAmount = transaction.amount * 100; // в тийинах
    if (amount !== expectedAmount) {
      return {
        error: {
          code: -31001,
          message: {
            ru: 'Неверная сумма',
            uz: 'Noto\'g\'ri summa',
            en: 'Invalid amount',
          },
        },
      };
    }

    return {
      result: {
        allow: true,
      },
    };
  }

  /**
   * CreateTransaction - создание транзакции в Payme
   */
  private async createTransaction(params: any) {
    const { id, time, account, amount } = params;
    const orderId = account.order_id || account.transaction_id;

    console.log('CreateTransaction called:', { id, orderId, amount });

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: orderId },
    });

    console.log('Transaction found:', transaction ? transaction.id : 'NOT FOUND');

    if (!transaction) {
      return {
        error: {
          code: -31050,
          message: 'Transaction not found',
        },
      };
    }

    // Если транзакция уже создана с этим paymeTransactionId, возвращаем существующий результат
    if (transaction.paymeTransactionId === id) {
      console.log('Transaction already exists with this paymeTransactionId:', id);
      return {
        result: {
          create_time: Number(transaction.paymeCreateTime),
          transaction: transaction.id,
          state: 1,
        },
      };
    }

    // Если транзакция уже имеет другой paymeTransactionId, это ошибка
    if (transaction.paymeTransactionId && transaction.paymeTransactionId !== id) {
      return {
        error: {
          code: -31099,
          message: 'Transaction already exists with different ID',
        },
      };
    }

    // Проверяем сумму
    const expectedAmount = transaction.amount * 100;
    if (amount !== expectedAmount) {
      return {
        error: {
          code: -31001,
          message: 'Invalid amount',
        },
      };
    }

    // Сохраняем create_time из параметров запроса Payme
    const createTime = time || Date.now();

    // Обновляем транзакцию
    await this.prisma.transaction.update({
      where: { id: orderId },
      data: {
        paymeTransactionId: id,
        paymentId: id,
        paymeCreateTime: BigInt(createTime),
      },
    });

    console.log('Transaction updated with paymeTransactionId:', id);

    return {
      result: {
        create_time: createTime,
        transaction: orderId,
        state: 1,
      },
    };
  }

  /**
   * PerformTransaction - выполнение транзакции (списание средств)
   */
  private async performTransaction(params: any) {
    const { id } = params;

    const transaction = await this.prisma.transaction.findFirst({
      where: { paymeTransactionId: id },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: 'Transaction not found',
        },
      };
    }

    // Если уже выполнена, возвращаем существующий результат
    if (transaction.status === 'COMPLETED') {
      return {
        result: {
          transaction: transaction.id,
          perform_time: Number(transaction.paymePerformTime),
          state: 2,
        },
      };
    }

    // Проверяем что транзакция в состоянии PENDING (state = 1)
    if (transaction.status !== 'PENDING') {
      return {
        error: {
          code: -31008,
          message: 'Cannot perform transaction',
        },
      };
    }

    // Проверяем таймаут (12 часов = 43200000 мс)
    const createdTime = transaction.createdAt.getTime();
    const currentTime = Date.now();
    if (currentTime - createdTime > 43200000) {
      // Отменяем транзакцию по таймауту
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
        },
      });
      return {
        error: {
          code: -31008,
          message: 'Transaction timeout',
        },
      };
    }

    const performTime = Date.now();

    // Обновляем статус на COMPLETED
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        paymePerformTime: BigInt(performTime),
      },
    });

    // Выдаем доступ к сборнику
    await this.grantAccess(transaction);

    return {
      result: {
        transaction: transaction.id,
        perform_time: performTime,
        state: 2,
      },
    };
  }

  /**
   * CancelTransaction - отмена транзакции
   */
  private async cancelTransaction(params: any) {
    const { id, reason } = params;

    const transaction = await this.prisma.transaction.findFirst({
      where: { paymeTransactionId: id },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: 'Transaction not found',
        },
      };
    }

    // Если уже отменена, возвращаем существующий результат
    if (transaction.status === 'FAILED' || transaction.status === 'REFUNDED') {
      const state = transaction.status === 'FAILED' ? -1 : -2;
      return {
        result: {
          transaction: transaction.id,
          cancel_time: Number(transaction.paymeCancelTime),
          state,
          reason: transaction.paymeReason,
        },
      };
    }

    // Если транзакция в состоянии PENDING (state = 1), отменяем
    if (transaction.status === 'PENDING') {
      const cancelTime = Date.now();
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          paymeCancelTime: BigInt(cancelTime),
          paymeReason: reason || null,
        },
      });

      return {
        result: {
          transaction: transaction.id,
          cancel_time: cancelTime,
          state: -1,
          reason: reason || null,
        },
      };
    }

    // Если транзакция выполнена (state = 2), проверяем возможность возврата
    if (transaction.status === 'COMPLETED') {
      const cancelTime = Date.now();
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'REFUNDED',
          paymeCancelTime: BigInt(cancelTime),
          paymeReason: reason || null,
        },
      });

      // Отзываем доступ
      await this.revokeAccess(transaction);

      return {
        result: {
          transaction: transaction.id,
          cancel_time: cancelTime,
          state: -2,
          reason: reason || null,
        },
      };
    }

    return {
      error: {
        code: -31008,
        message: 'Cannot cancel transaction',
      },
    };
  }

  /**
   * CheckTransaction - проверка статуса транзакции
   */
  private async checkTransaction(params: any) {
    const { id } = params;

    const transaction = await this.prisma.transaction.findFirst({
      where: { paymeTransactionId: id },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: 'Transaction not found',
        },
      };
    }

    const state = this.getTransactionState(transaction.status);
    const performTime = (transaction.status === 'COMPLETED' || transaction.status === 'REFUNDED')
      ? Number(transaction.paymePerformTime) || 0
      : 0;
    const cancelTime = (transaction.status === 'FAILED' || transaction.status === 'REFUNDED')
      ? Number(transaction.paymeCancelTime) || 0
      : 0;

    return {
      result: {
        create_time: Number(transaction.paymeCreateTime) || transaction.createdAt.getTime(),
        perform_time: performTime,
        cancel_time: cancelTime,
        transaction: transaction.id,
        state,
        reason: transaction.paymeReason ?? null,
      },
    };
  }

  /**
   * Отозвать доступ к сборнику при возврате
   */
  private async revokeAccess(transaction: any) {
    const { userId, itemType, itemId } = transaction;

    if (itemType === 'WORKOUT_COLLECTION') {
      await this.prisma.workoutCollectionAccess.deleteMany({
        where: {
          userId,
          collectionId: itemId,
        },
      });
    } else if (itemType === 'RECIPE_COLLECTION') {
      await this.prisma.recipeCollectionAccess.deleteMany({
        where: {
          userId,
          collectionId: itemId,
        },
      });
    }
  }

  /**
   * Выдать доступ к сборнику после успешной оплаты
   */
  private async grantAccess(transaction: any) {
    const { userId, itemType, itemId } = transaction;

    if (itemType === 'WORKOUT_COLLECTION') {
      // Проверяем, нет ли уже доступа
      const existing = await this.prisma.workoutCollectionAccess.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId: itemId,
          },
        },
      });

      if (!existing) {
        await this.prisma.workoutCollectionAccess.create({
          data: {
            userId,
            collectionId: itemId,
          },
        });
      }
    } else if (itemType === 'RECIPE_COLLECTION') {
      // Проверяем, нет ли уже доступа
      const existing = await this.prisma.recipeCollectionAccess.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId: itemId,
          },
        },
      });

      if (!existing) {
        await this.prisma.recipeCollectionAccess.create({
          data: {
            userId,
            collectionId: itemId,
          },
        });
      }
    }
  }

  /**
   * GetStatement - получение списка транзакций за период
   */
  private async getStatement(params: any) {
    const { from, to } = params;

    // Получаем транзакции за указанный период (по времени создания в Payme)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        paymeTransactionId: {
          not: null,
        },
        createdAt: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Формируем ответ в формате Payme
    const result = {
      transactions: transactions.map((transaction) => {
        const state = this.getTransactionState(transaction.status);
        const performTime = transaction.status === 'COMPLETED' ? transaction.updatedAt.getTime() : 0;
        const cancelTime = (transaction.status === 'FAILED' || transaction.status === 'REFUNDED') ? transaction.updatedAt.getTime() : 0;

        return {
          id: transaction.paymeTransactionId,
          time: transaction.createdAt.getTime(),
          amount: transaction.amount * 100,
          account: {
            order_id: transaction.id,
          },
          create_time: transaction.createdAt.getTime(),
          perform_time: performTime,
          cancel_time: cancelTime,
          transaction: transaction.id,
          state,
          reason: null,
        };
      }),
    };

    return { result };
  }

  /**
   * Преобразование статуса транзакции в state для Payme
   */
  private getTransactionState(status: string): number {
    switch (status) {
      case 'PENDING':
        return 1; // Создана
      case 'COMPLETED':
        return 2; // Выполнена
      case 'FAILED':
        return -1; // Отменена до выполнения
      case 'REFUNDED':
        return -2; // Отменена после выполнения
      default:
        return 1;
    }
  }
}
