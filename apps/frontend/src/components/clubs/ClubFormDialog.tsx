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

type ClubPayload = {
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  logo_url: string | null;
  leader_id: number | null;
};

type ClubFormValues = {
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  logo_url: string;
  leader_id: string;
};

type ClubFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialValues?: Partial<ClubPayload>;
  onSubmit: (payload: ClubPayload) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
};

const emptyValues: ClubFormValues = {
  name: '',
  name_ar: '',
  description: '',
  description_ar: '',
  logo_url: '',
  leader_id: '',
};

export function ClubFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  isSubmitting,
  errorMessage,
}: ClubFormDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<ClubFormValues>(emptyValues);
  const [localError, setLocalError] = useState<string>('');

  const populatedValues = useMemo<ClubFormValues>(
    () => ({
      name: initialValues?.name ?? '',
      name_ar: initialValues?.name_ar ?? '',
      description: initialValues?.description ?? '',
      description_ar: initialValues?.description_ar ?? '',
      logo_url: initialValues?.logo_url ?? '',
      leader_id: initialValues?.leader_id ? String(initialValues.leader_id) : '',
    }),
    [initialValues]
  );

  useEffect(() => {
    if (open) {
      setValues(populatedValues);
      setLocalError('');
    }
  }, [open, populatedValues]);

  const title = mode === 'create' ? t('clubs.createClub') : `${t('common.edit')} ${t('nav.clubs')}`;

  const updateField = (key: keyof ClubFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');

    if (!values.name.trim() || !values.name_ar.trim()) {
      setLocalError('Name and Arabic name are required.');
      return;
    }

    const leaderId = values.leader_id.trim();
    if (leaderId && !/^\d+$/.test(leaderId)) {
      setLocalError('Leader ID must be a valid number.');
      return;
    }

    await onSubmit({
      name: values.name.trim(),
      name_ar: values.name_ar.trim(),
      description: values.description.trim() || null,
      description_ar: values.description_ar.trim() || null,
      logo_url: values.logo_url.trim() || null,
      leader_id: leaderId ? Number(leaderId) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update club details and save your changes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Club name"
            value={values.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
          <Input
            placeholder="Club name (Arabic)"
            value={values.name_ar}
            onChange={(e) => updateField('name_ar', e.target.value)}
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
          <Input
            placeholder="Logo URL"
            value={values.logo_url}
            onChange={(e) => updateField('logo_url', e.target.value)}
            type="url"
          />
          <Input
            placeholder="Leader User ID"
            value={values.leader_id}
            onChange={(e) => updateField('leader_id', e.target.value)}
            inputMode="numeric"
          />

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
