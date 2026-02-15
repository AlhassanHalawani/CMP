import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@neo/Button';
import { Input } from '@neo/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@neo/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@neo/Select';

type EventPayload = {
  club_id: number;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
};

type EventFormValues = {
  club_id: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  location: string;
  starts_at: string;
  ends_at: string;
  capacity: string;
  status: EventPayload['status'];
};

type ClubOption = {
  id: number;
  name: string;
  name_ar: string;
};

type EventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialValues?: Partial<EventPayload>;
  clubs: ClubOption[];
  language: 'en' | 'ar';
  onSubmit: (payload: EventPayload) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
};

const emptyValues: EventFormValues = {
  club_id: '',
  title: '',
  title_ar: '',
  description: '',
  description_ar: '',
  location: '',
  starts_at: '',
  ends_at: '',
  capacity: '',
  status: 'draft',
};

function toDateTimeLocal(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function EventFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  clubs,
  language,
  onSubmit,
  isSubmitting,
  errorMessage,
}: EventFormDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<EventFormValues>(emptyValues);
  const [localError, setLocalError] = useState('');

  const populatedValues = useMemo<EventFormValues>(
    () => ({
      club_id: initialValues?.club_id ? String(initialValues.club_id) : '',
      title: initialValues?.title ?? '',
      title_ar: initialValues?.title_ar ?? '',
      description: initialValues?.description ?? '',
      description_ar: initialValues?.description_ar ?? '',
      location: initialValues?.location ?? '',
      starts_at: toDateTimeLocal(initialValues?.starts_at),
      ends_at: toDateTimeLocal(initialValues?.ends_at),
      capacity: initialValues?.capacity ? String(initialValues.capacity) : '',
      status: initialValues?.status ?? 'draft',
    }),
    [initialValues]
  );

  useEffect(() => {
    if (open) {
      setValues(populatedValues);
      setLocalError('');
    }
  }, [open, populatedValues]);

  const title = mode === 'create' ? t('events.createEvent') : `${t('common.edit')} ${t('nav.events')}`;

  const updateField = (key: keyof EventFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');

    if (!values.club_id || !values.title.trim() || !values.title_ar.trim() || !values.starts_at || !values.ends_at) {
      setLocalError('Club, titles, start date and end date are required.');
      return;
    }

    if (new Date(values.ends_at) <= new Date(values.starts_at)) {
      setLocalError('End date must be after start date.');
      return;
    }

    if (values.capacity.trim() && (!/^\d+$/.test(values.capacity) || Number(values.capacity) < 1)) {
      setLocalError('Capacity must be a positive number.');
      return;
    }

    await onSubmit({
      club_id: Number(values.club_id),
      title: values.title.trim(),
      title_ar: values.title_ar.trim(),
      description: values.description.trim() || null,
      description_ar: values.description_ar.trim() || null,
      location: values.location.trim() || null,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
      capacity: values.capacity.trim() ? Number(values.capacity) : null,
      status: values.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Create or update event details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Select value={values.club_id} onValueChange={(value) => updateField('club_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (
                <SelectItem key={club.id} value={String(club.id)}>
                  {language === 'ar' ? club.name_ar : club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input placeholder="Event title" value={values.title} onChange={(e) => updateField('title', e.target.value)} required />
          <Input
            placeholder="Event title (Arabic)"
            value={values.title_ar}
            onChange={(e) => updateField('title_ar', e.target.value)}
            required
          />
          <Input
            placeholder="Description"
            value={values.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
          <Input
            placeholder="Description (Arabic)"
            value={values.description_ar}
            onChange={(e) => updateField('description_ar', e.target.value)}
          />
          <Input placeholder="Location" value={values.location} onChange={(e) => updateField('location', e.target.value)} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              type="datetime-local"
              value={values.starts_at}
              onChange={(e) => updateField('starts_at', e.target.value)}
              required
            />
            <Input type="datetime-local" value={values.ends_at} onChange={(e) => updateField('ends_at', e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Capacity (optional)"
              value={values.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
              inputMode="numeric"
            />
            <Select value={values.status} onValueChange={(value) => updateField('status', value as EventPayload['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(localError || errorMessage) && <p className="text-sm font-bold text-red-600">{localError || errorMessage}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
