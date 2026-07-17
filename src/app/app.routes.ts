import { Routes } from '@angular/router';

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
import { TaskDispatcherComponent } from './admin/task-dispatcher/task-dispatcher.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: 'my-tasks', component: MyTasksComponent },

  { path: 'processes', component: ProcessesComponent },
  { path: 'active-tasks', component: ActiveTasksComponent },
  { path: 'completed-tasks', component: CompletedTasksComponent },

  { path: 'admin/users', component: UserListComponent },
  { path: 'admin/users/create', component: UserCreateComponent },
  { path: 'admin/users/edit/:id', component: UserEditComponent },

  { path: 'admin/groups', component: GroupListComponent },
  { path: 'admin/groups/create', component: GroupCreateComponent },
  { path: 'admin/groups/edit/:id', component: GroupEditComponent },

  { path: 'admin/tenants', component: TenantListComponent },
  { path: 'admin/tenants/create', component: TenantCreateComponent },
  { path: 'admin/tenants/edit/:id', component: TenantEditComponent },

  { path: 'admin/authorizations', component: AuthorizationsComponent },

  { path: 'my-profile', component: MyProfileComponent },

  // Protected Admin Routes
  { path: 'admin/users', component: UserListComponent, canActivate: [adminGuard] },
  { path: 'admin/users/create', component: UserCreateComponent, canActivate: [adminGuard] },
  { path: 'admin/users/edit/:id', component: UserEditComponent, canActivate: [adminGuard] },
  { path: 'admin/groups', component: GroupListComponent, canActivate: [adminGuard] },
  { path: 'admin/tenants', component: TenantListComponent, canActivate: [adminGuard] },
  { path: 'admin/authorizations', component: AuthorizationsComponent, canActivate: [adminGuard] },

  { path: 'admin/dispatcher', component: TaskDispatcherComponent, canActivate: [adminGuard] },
  
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];