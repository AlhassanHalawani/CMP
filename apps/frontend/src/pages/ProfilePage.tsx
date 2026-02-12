import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t('nav.profile')}</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{user?.name}</CardTitle>
            <Badge variant="accent">{user?.roles?.join(', ')}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Email</label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button>{t('common.save')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
