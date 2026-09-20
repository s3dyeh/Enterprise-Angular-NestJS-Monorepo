import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RecaptchaService } from './recaptcha.service';

describe('RecaptchaService streams', () => {
  let service: RecaptchaService;
  let backend: HttpTestingController;
  let script: HTMLScriptElement;
  let append: jasmine.Spy;
  let execute: jasmine.Spy;

  beforeEach(() => {
    script = document.createElement('script');
    append = jasmine.createSpy('appendChild');
    execute = jasmine.createSpy('execute').and.returnValue(Promise.resolve('fresh-token'));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DOCUMENT,
          useValue: {
            createElement: () => script,
            head: { appendChild: append },
            defaultView: { grecaptcha: { ready: (callback: () => void) => callback(), execute } },
          },
        },
      ],
    });
    service = TestBed.inject(RecaptchaService);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());
  function configure(enabled = true) {
    backend
      .expectOne('/api/v1/auth/browser/config')
      .flush({ recaptcha: { enabled, siteKey: 'site-key' } });
  }

  it('does not load Google when disabled', () => {
    const next = jasmine.createSpy('next');
    service.token('login').subscribe(next);
    configure(false);
    expect(next).toHaveBeenCalledWith(undefined);
    expect(append).not.toHaveBeenCalled();
  });

  it('cancels an unfinished script load when unsubscribed', () => {
    const remove = spyOn(script, 'remove');
    const subscription = service.token('login').subscribe();
    configure();
    subscription.unsubscribe();
    expect(remove).toHaveBeenCalled();
    expect(script.onload).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('retries script loading after a failure', () => {
    const error = jasmine.createSpy('error');
    service.token('login').subscribe({ error });
    configure();
    script.dispatchEvent(new Event('error'));
    expect(error).toHaveBeenCalled();
    const retry = service.token('login').subscribe();
    configure();
    expect(append).toHaveBeenCalledTimes(2);
    retry.unsubscribe();
  });

  it('times out and removes a stalled script', () => {
    jasmine.clock().install();
    try {
      const error = jasmine.createSpy('error');
      const remove = spyOn(script, 'remove');
      service.token('login').subscribe({ error });
      configure();
      jasmine.clock().tick(10001);
      expect(error).toHaveBeenCalled();
      expect(remove).toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('reuses the loaded script but requests a fresh token for each action', (done) => {
    service.token('login').subscribe({
      next: (value) => {
        expect(value).toBe('fresh-token');
        service.token('register').subscribe({
          next: () => {
            expect(append).toHaveBeenCalledTimes(1);
            expect(execute.calls.allArgs()).toEqual([
              ['site-key', { action: 'login' }],
              ['site-key', { action: 'register' }],
            ]);
            done();
          },
          error: done.fail,
        });
        configure();
      },
      error: done.fail,
    });
    configure();
    script.dispatchEvent(new Event('load'));
  });
});
