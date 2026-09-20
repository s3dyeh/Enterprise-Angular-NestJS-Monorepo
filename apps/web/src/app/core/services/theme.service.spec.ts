import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  it('follows the system until the user chooses a persistent preference', () => {
    const system = new BehaviorSubject({ matches: false });
    const storage = jasmine.createSpyObj('StorageService', ['get', 'set']);
    storage.get.and.returnValue(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: BreakpointObserver, useValue: { observe: () => system } },
        { provide: StorageService, useValue: storage },
      ],
    });
    const theme = TestBed.inject(ThemeService);
    expect(theme.dark()).toBeFalse();
    system.next({ matches: true });
    TestBed.tick();
    expect(theme.dark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
    expect(storage.set).not.toHaveBeenCalled();
    theme.toggle();
    expect(storage.set).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    system.next({ matches: false });
    system.next({ matches: true });
    TestBed.tick();
    expect(theme.dark()).toBeFalse();
    expect(document.documentElement.classList.contains('dark-theme')).toBeFalse();
  });
});
