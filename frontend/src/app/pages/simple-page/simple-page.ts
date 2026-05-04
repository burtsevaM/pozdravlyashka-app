import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-simple-page',
  templateUrl: './simple-page.html',
  styleUrl: './simple-page.scss',
})
export class SimplePage {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => String(data['title'] ?? 'Раздел'))),
    { initialValue: 'Раздел' },
  );

  protected readonly description = toSignal(
    this.route.data.pipe(
      map((data) => String(data['description'] ?? 'Раздел находится в подготовке.')),
    ),
    { initialValue: 'Раздел находится в подготовке.' },
  );
}
