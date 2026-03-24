import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { clubsApi } from '@/api/clubs';
import { attendanceApi, type ClubReportRow } from '@/api/attendance';

export function ReportsPage() {
  const { hasRole } = useAuth();
  const { currentUser } = useCurrentUser();
  const isAdmin = hasRole('admin');

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [reportData, setReportData] = useState<ClubReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For admin: list all clubs; for club_leader: their own club
  const { data: clubsData } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => clubsApi.list({ limit: 100 }),
    enabled: isAdmin,
  });

  const { data: leaderClub } = useQuery({
    queryKey: ['clubs', currentUser?.id, 'led'],
    queryFn: async () => {
      if (!currentUser) return null;
      const all = await clubsApi.list({ limit: 100 });
      return all.data.find((c) => c.leader_id === currentUser.id) ?? null;
    },
    enabled: !isAdmin && !!currentUser,
  });

  // Determine effective club id
  const effectiveClubId = isAdmin ? selectedClubId : (leaderClub?.id ?? null);

  const clubs = isAdmin ? (clubsData?.data ?? []) : leaderClub ? [leaderClub] : [];

  const canGenerate =
    !!effectiveClubId &&
    !!dateRange?.from &&
    !!dateRange?.to;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await attendanceApi.getClubAttendanceReport({
        club_id: effectiveClubId!,
        starts_after: dateRange!.from!.toISOString().slice(0, 10),
        ends_before: dateRange!.to!.toISOString().slice(0, 10),
      });
      setReportData(result.data);
    } catch {
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (!canGenerate) return;
    attendanceApi.downloadClubReportCsv(
      effectiveClubId!,
      dateRange!.from!.toISOString().slice(0, 10),
      dateRange!.to!.toISOString().slice(0, 10)
    );
  }

  function handleExportPdf() {
    if (!canGenerate) return;
    attendanceApi.downloadClubReportPdf(
      effectiveClubId!,
      dateRange!.from!.toISOString().slice(0, 10),
      dateRange!.to!.toISOString().slice(0, 10)
    );
  }

  const dateLabel =
    dateRange?.from && dateRange?.to
      ? `${dateRange.from.toLocaleDateString()} — ${dateRange.to.toLocaleDateString()}`
      : 'Pick date range';

  return (
    <div>
      <h1 className="text-3xl font-black mb-6">Attendance Reports</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {/* Club selector (admin only) */}
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Club</label>
              <select
                className="border-2 border-[var(--border)] rounded-base px-3 py-2 text-sm font-bold bg-[var(--background)] min-w-48"
                value={selectedClubId ?? ''}
                onChange={(e) => setSelectedClubId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a club…</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Club label (club_leader only) */}
          {!isAdmin && leaderClub && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Club</label>
              <span className="border-2 border-[var(--border)] rounded-base px-3 py-2 text-sm font-bold bg-[var(--secondary-background)]">
                {leaderClub.name}
              </span>
            </div>
          )}

          {/* Date range picker */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-56 justify-start">
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleGenerate} disabled={!canGenerate || loading}>
            {loading ? <Spinner size="sm" /> : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600 font-bold mb-4">{error}</p>}

      {reportData !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>
                Results
                <Badge variant="secondary" className="ml-3">{reportData.length} records</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCsv}>Export CSV</Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf}>Export PDF</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportData.length === 0 ? (
              <p className="text-sm">No data for the selected range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.event_title}</TableCell>
                      <TableCell>{row.event_starts_at.slice(0, 10)}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'Present' ? 'accent' : 'neutral'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.checked_in_at ? new Date(row.checked_in_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>{row.method ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
