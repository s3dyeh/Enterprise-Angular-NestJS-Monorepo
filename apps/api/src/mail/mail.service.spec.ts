import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { I18nModule, HeaderResolver } from 'nestjs-i18n';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import { MailService } from './mail.service';
import { MailTransportService } from './mail-transport.service';

describe('Account mail', () => {
  it('renders every email without request context using the fallback language', async () => {
    const transport = { sendMail: jest.fn().mockResolvedValue(undefined) };
    const config = new ConfigService({
      app: {
        fallbackLanguage: 'en',
        frontendDomain: 'https://example.com/',
        name: 'Enterprise',
      },
    });
    const module = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          resolvers: [HeaderResolver],
          loaderOptions: { path: join(__dirname, '../i18n'), watch: false },
        }),
      ],
      providers: [
        MailService,
        { provide: ConfigService, useValue: config },
        { provide: MailTransportService, useValue: transport },
      ],
    }).compile();
    await module.init();
    try {
      const service = module.get(MailService);
      await service.userSignUp({
        to: 'test@example.com',
        data: { hash: 'a+b&c' },
      });
      await service.confirmNewEmail({
        to: 'test@example.com',
        data: { hash: 'a+b&c' },
      });
      await service.forgotPassword({
        to: 'test@example.com',
        data: { hash: 'a+b&c', tokenExpires: 123 },
      });
      for (const [mail] of transport.sendMail.mock.calls as [
        {
          subject: string;
          templatePath: string;
          context: Record<string, string>;
        },
      ][]) {
        expect(mail.subject).toBeTruthy();
        const url = new URL(mail.context.url);
        expect(url.searchParams.get('hash')).toBe('a+b&c');
        const html = Handlebars.compile(
          await readFile(mail.templatePath, 'utf8'),
          { strict: true },
        )(mail.context);
        expect(html).toContain('Enterprise');
        expect(html).not.toContain('undefined');
      }
      expect(transport.sendMail.mock.calls[2][0].context.url).toContain(
        'expires=123',
      );
    } finally {
      await module.close();
    }
  });
});
