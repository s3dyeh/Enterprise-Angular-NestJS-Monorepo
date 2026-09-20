import { AccountCreditResponseDto } from './credit-response.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applySearch, paginateRaw } from '../admin/admin-query';
import { AdminMutationService } from '../admin/admin-mutation.service';
import { AdminQueryDto } from '../admin/admin-query.dto';
import { CreditAdjustmentDto } from './catalog.dto';
import { AccountCreditEntity } from './persistence/account-credit.entity';
import { CreditEntryEntity } from './persistence/credit-entry.entity';

@Injectable()
export class AccountCreditsService {
  constructor(
    @InjectRepository(AccountCreditEntity)
    private readonly credits: Repository<AccountCreditEntity>,
    private readonly mutations: AdminMutationService,
  ) {}

  list(query: AdminQueryDto) {
    const builder = this.credits
      .createQueryBuilder('credit')
      .innerJoin('credit.currency', 'currency')
      .select([]);
    for (const column of [
      'id',
      'account_id',
      'currency_id',
      'balance',
      'created_at',
      'updated_at',
    ]) {
      builder.addSelect('credit.' + column, column);
    }
    builder.addSelect('currency.name', 'currency');
    applySearch(builder, ['currency.name'], query.search);
    return paginateRaw<AccountCreditResponseDto, AccountCreditEntity>(
      builder,
      query,
      {
        id: 'credit.id',
        balance: 'credit.balance',
        currency: 'currency.name',
        created_at: 'credit.created_at',
        updated_at: 'credit.updated_at',
      },
      'credit.id',
    );
  }

  adjust(body: CreditAdjustmentDto, actor: number) {
    if (/^-?0+(\.0+)?$/.test(body.amount)) {
      throw new BadRequestException('Adjustment must be nonzero');
    }
    return this.mutations.mutate(async (manager) => {
      const credits = manager.getRepository(AccountCreditEntity);
      const entries = manager.getRepository(CreditEntryEntity);
      const identity = {
        account_id: body.account_id,
        currency_id: body.currency_id,
      };
      await credits
        .createQueryBuilder()
        .insert()
        .values(identity)
        .updateEntity(false)
        .orIgnore()
        .execute();
      const credit = await credits.findOneByOrFail(identity);
      const entry = {
        credit_id: credit.id,
        amount: body.amount,
        idempotency_key: body.idempotency_key,
        reason: body.reason,
        operator_id: actor,
      };

      // Claim the unique UUID before changing the balance. Concurrent inserts wait
      // for the winning transaction, including requests handled by other replicas.
      const inserted = await entries
        .createQueryBuilder()
        .insert()
        .values(entry)
        .updateEntity(false)
        .orIgnore()
        .returning('id')
        .execute();
      const insertedRows = inserted.raw as { id: string }[];
      if (insertedRows.length === 0) {
        // PostgreSQL compares decimals exactly, including equivalent representations.
        if (!(await entries.existsBy(entry))) {
          throw new ConflictException(
            'Idempotency key was already used for a different adjustment',
          );
        }
        const current = await credits.findOneByOrFail({ id: credit.id });
        return { data: { balance: current.balance, replayed: true } };
      }

      // An atomic database increment prevents lost updates for different keys.
      await credits.increment({ id: credit.id }, 'balance', body.amount);
      const updated = await credits.findOneByOrFail({ id: credit.id });
      await this.mutations.audit(manager, actor, 'credit.adjusted', credit.id);
      return { data: { balance: updated.balance, replayed: false } };
    });
  }
}
