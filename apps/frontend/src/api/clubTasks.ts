import api from './client';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface ClubTask {
  id: number;
  club_id: number;
  event_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  created_by: number;
  assigned_to: number | null;
  role_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  assignee_avatar: string | null;
  event_title: string | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to?: number;
  role_key?: string;
  event_id?: number;
  priority?: TaskPriority;
  due_at?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  assigned_to?: number | null;
  role_key?: string | null;
  event_id?: number | null;
}

export interface TaskFilters {
  status?: string;
  assigned_to?: number;
  role_key?: string;
  event_id?: number;
}

export const clubTasksApi = {
  listClubTasks: (clubId: number, filters?: TaskFilters) =>
    api
      .get<{ data: ClubTask[] }>(`/clubs/${clubId}/tasks`, { params: filters })
      .then((r) => r.data),

  createClubTask: (clubId: number, payload: CreateTaskPayload) =>
    api.post<ClubTask>(`/clubs/${clubId}/tasks`, payload).then((r) => r.data),

  updateClubTask: (clubId: number, taskId: number, payload: UpdateTaskPayload) =>
    api.patch<ClubTask>(`/clubs/${clubId}/tasks/${taskId}`, payload).then((r) => r.data),

  deleteClubTask: (clubId: number, taskId: number) =>
    api.delete(`/clubs/${clubId}/tasks/${taskId}`),

  getMyClubTasks: () =>
    api.get<{ data: ClubTask[] }>('/users/me/club-tasks').then((r) => r.data),
};
