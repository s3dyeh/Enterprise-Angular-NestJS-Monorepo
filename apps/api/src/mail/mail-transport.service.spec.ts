import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailTransportService } from './mail-transport.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

describe('MailTransportService', () => {
  it('returns a stable public error while retaining the transport cause for diagnostics', async () => {
    const cause = new Error('connect ECONNREFUSED ::1:1025');
    const sendMail = jest.fn().mockRejectedValue(cause);
    jest
      .mocked(nodemailer.createTransport)
      .mockReturnValue({ sendMail } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >);
    const service = new MailTransportService(new ConfigService());
    const result = service.sendMail({
      templatePath: '',
      context: {},
      to: 'test@example.test',
      subject: 'Test',
    });
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({
      cause,
      response: { status: 503, errors: { mail: 'mailDeliveryUnavailable' } },
    });
  });
});
