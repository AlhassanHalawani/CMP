import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { CalendarIcon, Download } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { clubsApi } from '@/api/clubs';
import { eventsApi, type Event } from '@/api/events';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { useAppToast } from '@/contexts/ToastContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageError } from '@/components/ErrorBoundary';

// ─── helpers ────────────────────────────────────────────────────────────────

function remainingSeats(event: Event): string | null {
  if (!event.capacity) return null;
  const used = event.registration_count ?? 0;
  const left = event.capacity - used;
  return left <= 0 ? 'Full' : `${left} left`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isUpcoming(event: Event) {
  return new Date(event.starts_at) > new Date();
}

// ─── sentinels ──────────────────────────────────────────────────────────────

const ALL_CATEGORIES = '__all_categories__';
const ALL_CLUBS = '__all_clubs__';

// ─── component ──────────────────────────────────────────────────────────────

export function EventsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const { showToast } = useAppToast();
  const queryClient = useQueryClient();
  const isAdmin = hasRole('admin');
  const isLeader = hasRole('club_leader');
  const { currentUser } = useCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  // ── filters ──
  const [filterCategory, setFilterCategory] = useState('');
  const [filterClubId, setFilterClubId] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // ── view mode ──
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState<Date | undefined>();

  // ── queries ──
  const queryParams = {
    limit: 200,
    category: filterCategory || undefined,
    club_id: filterClubId ? parseInt(filterClubId) : undefined,
    location: filterLocation || undefined,
    starts_after: dateRange?.from?.toISOString(),
    ends_before: dateRange?.to?.toISOString(),
  };

  const { data: allEvents, isLoading, isError, error } = useQuery({
    queryKey: ['events', queryParams],
    queryFn: () => eventsApi.list(queryParams),
  });

  const { data: submittedEvents } = useQuery({
    queryKey: ['events', 'submitted'],
    queryFn: () => eventsApi.list({ status: 'submitted', limit: 50 }),
    enabled: isAdmin,
  });

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', 'for-events-form'],
    queryFn: () => clubsApi.list({ limit: 200 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['events', 'categories'],
    queryFn: eventsApi.categories,
  });

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      setCreateOpen(false);
      setCreateError('');
      showToast('Event created', 'The event was created successfully.');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to create event.';
        setCreateError(message);
        showToast('Create failed', message);
        return;
      }
      setCreateError('Failed to create event.');
      showToast('Create failed', 'Failed to create event.');
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (isError) return <PageError message={(error as any)?.response?.data?.error ?? (error as Error)?.message} />;

  const allClubs = clubsData?.data ?? [];
  const ownedClubs = isLeader && currentUser
    ? allClubs.filter((c) => c.leader_id === currentUser.id)
    : allClubs;
  const canCreate = isAdmin || (isLeader && ownedClubs.length > 0);
  const canManageEvents = isAdmin || isLeader;

  // All visible events, sorted newest-start first
  const sourceEvents = canManageEvents
    ? (allEvents?.data ?? [])
    : (allEvents?.data.filter((e) => e.status === 'published') ?? []);
  const sortedEvents = [...sourceEvents].sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );

  // Calendar: all visible events (not just upcoming published)
  const eventDays = sourceEvents.map((e) => new Date(e.starts_at));
  const calendarMonthEvents = calendarDate
    ? sourceEvents.filter((e) => {
        const d = new Date(e.starts_at);
        return d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
      })
    : sourceEvents.filter((e) => {
        const d = new Date(e.starts_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
  const selectedDayEvents = calendarDate
    ? sourceEvents.filter((e) => isSameDay(new Date(e.starts_at), calendarDate))
    : null;

  // Agenda: selected-day events if a day is picked, otherwise current-month events
  const agendaEvents = selectedDayEvents ?? calendarMonthEvents.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const dateRangeLabel =
    dateRange?.from
      ? dateRange.to
        ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
        : format(dateRange.from, 'MMM d, yyyy')
      : 'Pick dates';

  const hasFilters = !!filterCategory || !!filterClubId || !!filterLocation || !!dateRange?.from;

  const pendingCount = submittedEvents?.data.length ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-black">{t('events.title')}</h1>
        <div className="flex items-center gap-2">
          <a
            href={eventsApi.calendarIcsUrl({
              club_id: filterClubId ? parseInt(filterClubId) : undefined,
              category: filterCategory || undefined,
            })}
            download="fcit-cmp-events.ics"
          >
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-1" />
              Export Calendar
            </Button>
          </a>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>{t('events.createEvent')}</Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[140px]">
          <Select
            value={filterCategory || ALL_CATEGORIES}
            onValueChange={(v) => setFilterCategory(v === ALL_CATEGORIES ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {(categories ?? []).map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px]">
          <Select
            value={filterClubId || ALL_CLUBS}
            onValueChange={(v) => setFilterClubId(v === ALL_CLUBS ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Club" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLUBS}>All clubs</SelectItem>
              {allClubs.map((club) => (
                <SelectItem key={club.id} value={String(club.id)}>
                  {language === 'ar' ? club.name_ar : club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[160px]">
          <Input
            placeholder="Search location…"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          />
        </div>

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="size-4" />
              {dateRangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.to) setDatePickerOpen(false);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterCategory('');
              setFilterClubId('');
              setFilterLocation('');
              setDateRange(undefined);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* View toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')} className="mb-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Create dialog */}
      <EventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        clubs={ownedClubs}
        language={language}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
        }}
        isSubmitting={createMutation.isPending}
        errorMessage={createError}
      />

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div>
          {/* Pending approval banner for admins */}
          {isAdmin && pendingCount > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-base border-2 border-[var(--border)] bg-[var(--overlay)] px-4 py-3">
              <Badge variant="neutral">{pendingCount}</Badge>
              <span className="text-sm font-bold">
                {pendingCount === 1 ? 'event awaiting approval' : 'events awaiting approval'}
              </span>
              <div className="ml-auto flex gap-2 flex-wrap">
                {(submittedEvents?.data ?? []).slice(0, 3).map((e) => (
                  <Link key={e.id} to={`/events/${e.id}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:opacity-80">
                      {language === 'ar' ? e.title_ar : e.title}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <EventGrid events={sortedEvents} language={language} />
        </div>
      )}

      {/* ── Calendar View ── */}
      {viewMode === 'calendar' && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="shrink-0">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={setCalendarDate}
              modifiers={{ hasEvent: eventDays }}
              modifiersClassNames={{
                hasEvent: 'underline decoration-2 font-bold',
              }}
            />
            {calendarDate && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setCalendarDate(undefined)}
              >
                Show all this month
              </Button>
            )}
          </div>
          <div className="flex-1">
            <p className="mb-3 font-bold text-sm">
              {calendarDate
                ? format(calendarDate, 'PPP')
                : format(new Date(), 'MMMM yyyy')}
              {' '}
              <span className="font-normal opacity-60">
                ({agendaEvents.length} event{agendaEvents.length !== 1 ? 's' : ''})
              </span>
            </p>
            {agendaEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events to show.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {agendaEvents.map((event) => (
                  <Link key={event.id} to={`/events/${event.id}`}>
                    <Card className="cursor-pointer hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            {language === 'ar' ? event.title_ar : event.title}
                          </CardTitle>
                          <Badge variant={isUpcoming(event) ? 'accent' : 'neutral'} className="shrink-0">
                            {isUpcoming(event) ? t('events.upcoming', 'Upcoming') : t('events.past', 'Past')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {event.location && <Badge variant="accent">{event.location}</Badge>}
                          <Badge variant="secondary">
                            {new Date(event.starts_at).toLocaleDateString([], {
                              month: 'short', day: 'numeric',
                            })}{' '}
                            {new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                          {event.category && <Badge variant="outline">{event.category}</Badge>}
                          {event.capacity && (
                            <Badge variant="outline">{remainingSeats(event) ?? `${event.capacity} seats`}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EventGrid ───────────────────────────────────────────────────────────────

function EventGrid({ events, language }: { events: Event[]; language: 'en' | 'ar' }) {
  const { t } = useTranslation();

  if (events.length === 0) return <p className="mt-4 text-sm">{t('common.noData')}</p>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const seats = remainingSeats(event);
        const upcoming = isUpcoming(event);
        return (
          <Link key={event.id} to={`/events/${event.id}`}>
            <Card className="h-full cursor-pointer hover:-translate-y-0.5 transition-transform">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {language === 'ar' ? event.title_ar : event.title}
                  </CardTitle>
                  <Badge variant={upcoming ? 'accent' : 'neutral'} className="shrink-0 text-xs">
                    {upcoming ? t('events.upcoming', 'Upcoming') : t('events.past', 'Past')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-2 mb-2">
                  {language === 'ar' ? event.description_ar : event.description}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {event.location && <Badge variant="accent">{event.location}</Badge>}
                  <Badge variant="secondary">{new Date(event.starts_at).toLocaleDateString()}</Badge>
                  {event.category && <Badge variant="outline">{event.category}</Badge>}
                  {event.capacity && (
                    <Badge variant="outline">
                      {seats ?? `${event.capacity} seats`}
                    </Badge>
                  )}
                  {(event.status === 'draft' || event.status === 'submitted' || event.status === 'rejected') && (
                    <Badge variant="neutral" className="capitalize">{event.status}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
