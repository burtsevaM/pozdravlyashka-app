import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUser,
  CurrentUserResponse,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
} from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'pozdravlyashka_access_token';
const AUTH_USER_KEY = 'pozdravlyashka_auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;
  private readonly accessToken = signal<string | null>(this.readStoredToken());

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());
  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));

  register(registerRequest: RegisterRequest) {
    return this.httpClient
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, registerRequest)
      .pipe(tap((authResponse) => this.saveSession(authResponse)));
  }

  login(loginRequest: LoginRequest) {
    return this.httpClient
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, loginRequest)
      .pipe(tap((authResponse) => this.saveSession(authResponse)));
  }

  getCurrentUser() {
    return this.httpClient.get<CurrentUserResponse>(`${environment.apiUrl}/auth/me`).pipe(
      tap(({ user }) => {
        this.currentUser.set(user);
        this.storage?.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }),
    );
  }

  updateProfile(updateProfileRequest: UpdateProfileRequest) {
    return this.httpClient
      .patch<CurrentUserResponse>(`${environment.apiUrl}/auth/profile`, updateProfileRequest)
      .pipe(
        tap(({ user }) => {
          this.currentUser.set(user);
          this.storage?.setItem(AUTH_USER_KEY, JSON.stringify(user));
        }),
      );
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.storage?.removeItem(ACCESS_TOKEN_KEY);
    this.storage?.removeItem(AUTH_USER_KEY);
  }

  private saveSession(authResponse: AuthResponse): void {
    this.accessToken.set(authResponse.accessToken);
    this.currentUser.set(authResponse.user);
    this.storage?.setItem(ACCESS_TOKEN_KEY, authResponse.accessToken);
    this.storage?.setItem(AUTH_USER_KEY, JSON.stringify(authResponse.user));
  }

  private readStoredToken(): string | null {
    return this.storage?.getItem(ACCESS_TOKEN_KEY) ?? null;
  }

  private readStoredUser(): AuthUser | null {
    const rawUser = this.storage?.getItem(AUTH_USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      const parsedUser: unknown = JSON.parse(rawUser);
      return this.isAuthUser(parsedUser) ? parsedUser : null;
    } catch {
      return null;
    }
  }

  private isAuthUser(value: unknown): value is AuthUser {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const user = value as Record<string, unknown>;

    return (
      typeof user['id'] === 'string' &&
      typeof user['name'] === 'string' &&
      typeof user['email'] === 'string'
    );
  }
}
