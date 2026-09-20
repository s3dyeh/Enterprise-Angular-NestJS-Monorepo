import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';
import { UnsavedFormService } from '@app/core/services/unsaved-form.service';
import { createFormDialog } from './form-dialog';

@Component({ template: '' })
class DialogHost {
  readonly form = new FormGroup({ name: new FormControl('', Validators.required) });
  readonly dialog = createFormDialog(this.form);
}

describe('createFormDialog', () => {
  let ref: jasmine.SpyObj<MatDialogRef<unknown>>;
  let unsaved: jasmine.SpyObj<UnsavedFormService>;

  beforeEach(() => {
    ref = jasmine.createSpyObj('MatDialogRef', ['close']);
    unsaved = jasmine.createSpyObj('UnsavedFormService', ['begin', 'end', 'tryDiscard']);
    TestBed.configureTestingModule({
      imports: [DialogHost],
      providers: [
        { provide: MatDialogRef, useValue: ref },
        { provide: UnsavedFormService, useValue: unsaved },
      ],
    });
  });

  it('rejects invalid forms and ignores duplicate saves while a request is pending', () => {
    const host = TestBed.createComponent(DialogHost).componentInstance;
    const response = new Subject<unknown>();
    const request = jasmine.createSpy('request').and.returnValue(response);
    host.dialog.submit(request);
    expect(request).not.toHaveBeenCalled();
    expect(host.form.touched).toBeTrue();
    host.form.setValue({ name: 'Region' });
    host.form.markAsDirty();
    host.dialog.submit(request);
    host.dialog.submit(request);
    host.dialog.discard();
    expect(request).toHaveBeenCalledTimes(1);
    expect(host.dialog.saving()).toBeTrue();
    expect(unsaved.tryDiscard).not.toHaveBeenCalled();
    response.next({});
    response.complete();
    expect(ref.close).toHaveBeenCalledWith(true);
    expect(host.form.pristine).toBeTrue();
    expect(host.dialog.saving()).toBeFalse();
  });

  it('keeps failed forms open and allows another save', () => {
    const host = TestBed.createComponent(DialogHost).componentInstance;
    host.form.setValue({ name: 'Region' });
    host.dialog.submit(() => throwError(() => new Error('save failed')));
    expect(host.dialog.saving()).toBeFalse();
    expect(ref.close).not.toHaveBeenCalled();
    host.dialog.submit(() => of({}));
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('cancels requests and releases the unsaved-form registration on destruction', () => {
    const fixture = TestBed.createComponent(DialogHost);
    const cancel = jasmine.createSpy('cancel');
    fixture.componentInstance.form.setValue({ name: 'Region' });
    fixture.componentInstance.dialog.submit(() => new Observable(() => cancel));
    fixture.destroy();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(unsaved.end).toHaveBeenCalledWith(ref);
    expect(ref.close).not.toHaveBeenCalled();
  });
});
