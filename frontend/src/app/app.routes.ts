import { Routes } from '@angular/router';
import { ImpexWorkspaceComponent } from './components/impex-workspace/impex-workspace.component';
import { BulkGeneratorComponent } from './components/bulk-generator/bulk-generator.component';

export const routes: Routes = [
  { path: '', redirectTo: 'workspace', pathMatch: 'full' },
  { path: 'workspace', component: ImpexWorkspaceComponent },
  { path: 'bulk-generator', component: BulkGeneratorComponent }
];