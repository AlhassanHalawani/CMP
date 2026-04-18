import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAppToast } from '@/contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { badgesApi, BadgeProgress } from '@/api/badges';

const RARITY_VARIANT: Record<string, 'accent' | 'default' | 'secondary' | 'neutral'> = {
  legendary: 'accent',
  epic: 'default',
  rare: 'secondary',
  common: 'neutral',
};

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-[var(--bg)] border border-border overflow-hidden">
      <div className="h-full rounded-full bg-[var(--main)] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function BadgeCard({
  badge,
  isFeatured,
  onSetFeatured,
  isPending,
}: {
  badge: BadgeProgress;
  isFeatured: boolean;
  onSetFeatured: (id: number | null) => void;
  isPending: boolean;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const name = isAr ? badge.name_ar : badge.name;
  const description = isAr ? badge.description_ar : badge.description;

  return (
    <Card className={badge.unlocked ? '' : 'opacity-50'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-bold leading-tight">{name}</CardTitle>
          <Badge variant={RARITY_VARIANT[badge.rarity] ?? 'neutral'} className="text-xs shrink-0 capitalize">
            {badge.rarity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs opacity-60">{description}</p>

        {badge.unlocked ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--main)] font-bold">
              Unlocked {new Date(badge.unlocked_at!).toLocaleDateString()}
            </p>
            {isFeatured ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={isPending}
                onClick={() => onSetFeatured(null)}
              >
                Remove featured
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="w-full text-xs"
                disabled={isPending}
                onClick={() => onSetFeatured(badge.id)}
              >
                Set as featured
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between text-xs opacity-60">
              <span>{badge.current_value} / {badge.threshold}</span>
              <span>{Math.round((badge.current_value / badge.threshold) * 100)}%</span>
            </div>
            <ProgressBar value={badge.current_value} max={badge.threshold} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BadgesPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['badges', 'progress'],
    queryFn: badgesApi.getMyProgress,
    enabled: !hasRole('admin'),
  });

  const featuredMutation = useMutation({
    mutationFn: (id: number | null) => badgesApi.setFeaturedBadge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      showToast('Featured badge updated', 'Your featured badge has been saved.');
    },
    onError: () => showToast('Error', 'Failed to update featured badge.'),
  });

  if (hasRole('admin')) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-black">{t('badges.title')}</h1>
        <p className="opacity-60">{t('badges.adminNote')}</p>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  const badges = progress?.badges ?? [];
  const featuredId = progress?.featured_badge_definition_id ?? null;
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);
  const featuredBadge = featuredId ? badges.find((b) => b.id === featuredId) : null;

  return (
    <div>
      <h1 className="mb-2 text-3xl font-black">{t('badges.title')}</h1>
      <p className="mb-6 opacity-60 text-sm">
        {unlocked.length} / {badges.length} {t('badges.earned')}
      </p>

      {/* Featured badge banner */}
      {featuredBadge && (
        <Card className="mb-6 border-[var(--main)]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[var(--main)] flex items-center justify-center text-main-foreground text-lg font-black shrink-0">
                ★
              </div>
              <div>
                <p className="text-xs font-bold opacity-60">{t('badges.featured')}</p>
                <p className="font-bold">{featuredBadge.name}</p>
                <Badge variant={RARITY_VARIANT[featuredBadge.rarity] ?? 'neutral'} className="text-xs capitalize mt-0.5">
                  {featuredBadge.rarity}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">{t('badges.unlocked')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlocked.map((b) => (
              <BadgeCard
                key={b.id}
                badge={b}
                isFeatured={b.id === featuredId}
                onSetFeatured={(id) => featuredMutation.mutate(id)}
                isPending={featuredMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">{t('badges.locked')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locked.map((b) => (
              <BadgeCard
                key={b.id}
                badge={b}
                isFeatured={false}
                onSetFeatured={() => {}}
                isPending={false}
              />
            ))}
          </div>
        </section>
      )}

      {badges.length === 0 && (
        <p className="opacity-50 text-sm">{t('badges.noBadges')}</p>
      )}
    </div>
  );
}
