import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Import RouterOutlet

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // Import RouterOutlet here
  template: `<router-outlet></router-outlet>` // Use outlet instead of component tag
})
export class AppComponent { }