import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  private baseUrl = 'http://localhost:8082/api/authorizations';

  constructor(private http: HttpClient) {}

  // VIEW: GET /api/authorizations/{section}
  getAuthorizations(section: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${section}`);
  }

  // CREATE: POST /api/authorizations/{section}/create
  createAuthorization(section: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${section}/create`, payload);
  }

  // EDIT: PUT /api/authorizations/{section}/{id}
  updateAuthorization(section: string, id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${section}/${id}`, payload);
  }

  // DELETE: DELETE /api/authorizations/{section}/{id}
  deleteAuthorization(section: string, id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${section}/${id}`);
  }
}