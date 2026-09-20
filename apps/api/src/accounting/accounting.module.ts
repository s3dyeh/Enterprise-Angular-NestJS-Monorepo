import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountCreditEntity } from './persistence/account-credit.entity';
import { CreditEntryEntity } from './persistence/credit-entry.entity';
import { CurrencyEntity } from './persistence/currency.entity';
import { CurrenciesController } from './currencies.controller';
import { AccountCreditsController } from './account-credits.controller';
import { AccountCreditsService } from './account-credits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountCreditEntity,
      CreditEntryEntity,
      CurrencyEntity,
    ]),
  ],
  controllers: [CurrenciesController, AccountCreditsController],
  providers: [AccountCreditsService],
})
export class AccountingModule {}
