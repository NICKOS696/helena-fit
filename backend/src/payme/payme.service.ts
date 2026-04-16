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
    
    // account - это наш ID транзакции для отслеживания
    const account = {
      transaction_id: transaction.id,
    };

    // Кодируем account в base64
    const accountEncoded = Buffer.from(JSON.stringify(account)).toString('base64');

    // Формируем параметры для m
    const mParams = `m=${merchantId};ac.transaction_id=${transaction.id};a=${amountInTiyin}`;
    const mEncoded = Buffer.from(mParams).toString('base64');

    // Формируем URL (правильный формат для Payme)
    const paymentUrl = `${this.config.get('PAYME_ENDPOINT')}/${mEncoded}`;

    console.log('Payment URL:', paymentUrl); // Для отладки
    return paymentUrl;
  }

  /**
   * Обработка webhook от Payme
   */
  async handleWebhook(body: any, authorization: string): Promise<any> {
    // Проверяем авторизацию
    if (!this.verifyAuthorization(authorization)) {
      return {
        error: {
          code: -32504,
          message: 'Unauthorized',
        },
      };
    }

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
    const { account } = params;
    const transactionId = account.transaction_id;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return {
        error: {
          code: -31050,
          message: 'Transaction not found',
        },
      };
    }

    if (transaction.status !== 'PENDING') {
      return {
        error: {
          code: -31051,
          message: 'Transaction already processed',
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
    const { id, account, amount } = params;
    const transactionId = account.transaction_id;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return {
        error: {
          code: -31050,
          message: 'Transaction not found',
        },
      };
    }

    // Обновляем транзакцию
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymeTransactionId: id,
        paymentId: id,
      },
    });

    return {
      result: {
        create_time: Date.now(),
        transaction: transactionId,
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

    // Обновляем статус на COMPLETED
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
      },
    });

    // Выдаем доступ к сборнику
    await this.grantAccess(transaction);

    return {
      result: {
        transaction: transaction.id,
        perform_time: Date.now(),
        state: 2,
      },
    };
  }

  /**
   * CancelTransaction - отмена транзакции
   */
  private async cancelTransaction(params: any) {
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

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
      },
    });

    return {
      result: {
        transaction: transaction.id,
        cancel_time: Date.now(),
        state: -1,
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

    let state = 1;
    if (transaction.status === 'COMPLETED') state = 2;
    if (transaction.status === 'FAILED') state = -1;

    return {
      result: {
        create_time: transaction.createdAt.getTime(),
        perform_time: transaction.updatedAt.getTime(),
        cancel_time: 0,
        transaction: transaction.id,
        state,
      },
    };
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
}
