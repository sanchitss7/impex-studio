import { Routes } from '@angular/router';
import { ImpexWorkspaceComponent } from './components/impex-workspace/impex-workspace.component';


export const routes: Routes = [
  { path: '', redirectTo: 'workspace', pathMatch: 'full' },
  { path: 'workspace', component: ImpexWorkspaceComponent },
];