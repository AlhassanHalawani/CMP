import api from './client';

export const authApi = {
  validateSignupEmail: (email: string) =>
    api.post<{ ok: boolean }>('/auth/signup', { email }).then((r) => r.data),
};
