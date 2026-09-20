import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { join } from 'node:path';
import { AppConfiguration } from '../config/config.type';
import { MailData } from './interfaces/mail-data.interface';
import { MailTransportService } from './mail-transport.service';

type AccountMail = MailData<{ hash: string; tokenExpires?: number }>;

@Injectable()
export class MailService {
  constructor(
    private readonly mailTransport: MailTransportService,
    private readonly configService: ConfigService<AppConfiguration>,
    private readonly i18n: I18nService,
  ) {}

  userSignUp(data: MailData<{ hash: string }>) {
    return this.sendAccountMail(
      data,
      'confirm-email',
      'activation',
      'confirm-email',
      'confirmEmail',
    );
  }
  forgotPassword(data: MailData<{ hash: string; tokenExpires: number }>) {
    return this.sendAccountMail(
      data,
      'reset-password',
      'reset-password',
      'password-change',
      'resetPassword',
    );
  }
  confirmNewEmail(data: MailData<{ hash: string }>) {
    return this.sendAccountMail(
      data,
      'confirm-new-email',
      'confirm-new-email',
      'confirm-new-email',
      'confirmEmail',
    );
  }

  private sendAccountMail(
    mail: AccountMail,
    translations: string,
    template: string,
    route: string,
    titleKey: string,
  ): Promise<void> {
    const lang =
      I18nContext.current()?.lang ??
      this.configService.getOrThrow('app.fallbackLanguage', { infer: true });
    const title = this.i18n.t<string, string>(`common.${titleKey}`, { lang });
    const baseUrl = this.configService.getOrThrow('app.frontendDomain', {
      infer: true,
    });
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/${route}`);
    url.searchParams.set('hash', mail.data.hash);
    if (mail.data.tokenExpires !== undefined)
      url.searchParams.set('expires', String(mail.data.tokenExpires));
    const textCount = translations === 'reset-password' ? 4 : 3;
    const text = Object.fromEntries(
      Array.from({ length: textCount }, (_, index) => {
        const key = `text${index + 1}`;
        return [key, this.i18n.t(`${translations}.${key}`, { lang })];
      }),
    );
    return this.mailTransport.sendMail({
      to: mail.to,
      subject: title,
      text: `${url.toString()} ${title}`,
      templatePath: join(__dirname, 'mail-templates', `${template}.hbs`),
      context: {
        ...text,
        title,
        url: url.toString(),
        actionTitle: title,
        app_name: this.configService.getOrThrow('app.name', { infer: true }),
      },
    });
  }
}
