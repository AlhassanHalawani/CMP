import api from './client';

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export const authApi = {
  signup: (payload: SignupPayload) =>
    api.post<{ ok: boolean }>('/auth/signup', payload).then((r) => r.data),
};
