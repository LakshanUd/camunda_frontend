import { Routes } from '@angular/router';

import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';
import { LoginComponent } from './login/login.component';
import { ProcessesComponent } from './processes/processes.component';
import { ActiveTasksComponent } from './active-tasks/active-tasks.component';
import { CompletedTasksComponent } from './completed-tasks/completed-tasks.component';
import { UserListComponent } from './user-list/user-list.component';
import { UserCreateComponent } from './user-create/user-create.component';
import { UserEditComponent } from './user-edit/user-edit.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { GroupListComponent } from './group-list/group-list.component';
import { GroupCreateComponent } from './group-create/group-create.component';
import { GroupEditComponent } from './group-edit/group-edit.component';
import { TenantListComponent } from './tenant-list/tenant-list.component';
import { TenantCreateComponent } from './tenant-create/tenant-create.component';
import { TenantEditComponent } from './tenant-edit/tenant-edit.component';
import { AuthorizationsComponent } from './authorizations/authorizations.component';
import { MyTasksComponent } from './my-tasks/my-tasks.component';
import { ManageWorkflowsComponent } from './manage-workflows/manage-workflows.component';
import { WorkflowTasksComponent } from './workflow-tasks/workflow-tasks.component';
import { WorkflowAssignmentComponent } from './workflow-assignment/workflow-assignment.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: 'processes', component: ProcessesComponent, canActivate: [adminGuard] },
  { path: 'workflow-tasks', component: WorkflowTasksComponent, canActivate: [adminGuard] },
  { path: 'my-tasks', component: MyTasksComponent, canActivate: [authGuard] },
  { path: 'active-tasks', redirectTo: '/my-tasks', pathMatch: 'full' },
  { path: 'completed-tasks', component: CompletedTasksComponent, canActivate: [authGuard] },
  { path: 'my-profile', component: MyProfileComponent, canActivate: [authGuard] },
  { path: 'manage-workflows',      component: ManageWorkflowsComponent,      canActivate: [adminGuard] },
  { path: 'workflow-assignment',   component: WorkflowAssignmentComponent,   canActivate: [adminGuard] },

  // Protected Admin Routes
  { path: 'admin/users', component: UserListComponent, canActivate: [adminGuard] },
  { path: 'admin/users/create', component: UserCreateComponent, canActivate: [adminGuard] },
  { path: 'admin/users/edit/:id', component: UserEditComponent, canActivate: [adminGuard] },
  
  { path: 'admin/groups', component: GroupListComponent, canActivate: [adminGuard] },
  { path: 'admin/groups/create', component: GroupCreateComponent, canActivate: [adminGuard] },
  { path: 'admin/groups/edit/:id', component: GroupEditComponent, canActivate: [adminGuard] },
  
  { path: 'admin/tenants', component: TenantListComponent, canActivate: [adminGuard] },
  { path: 'admin/tenants/create', component: TenantCreateComponent, canActivate: [adminGuard] },
  { path: 'admin/tenants/edit/:id', component: TenantEditComponent, canActivate: [adminGuard] },
  
  { path: 'admin/authorizations', component: AuthorizationsComponent, canActivate: [adminGuard] },
  
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];