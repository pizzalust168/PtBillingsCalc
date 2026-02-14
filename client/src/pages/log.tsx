import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/calculator";
import { getMonday, getSunday } from "@shared/schema";
import type { DailyTotal, DailyLineItem } from "@shared/schema";
import { Clock, DollarSign, Eye, Trash2, FileText, Download, ChevronDown, CalendarDays } from "lucide-react";

interface DayDetail {
  day: DailyTotal;
  items: DailyLineItem[];
}

interface WorkWeek {
  monday: string;
  sunday: string;
  days: DailyTotal[];
  totalBillings: number;
  totalMinutes: number;
  totalHours: number;
  prelimWithBbi: number;
  prelimWithoutBbi: number;
  loading625: number;
}

function groupByWorkWeek(days: DailyTotal[]): WorkWeek[] {
  const weekMap: Record<string, DailyTotal[]> = {};

  for (const day of days) {
    const monday = getMonday(day.date);
    if (!weekMap[monday]) {
      weekMap[monday] = [];
    }
    weekMap[monday].push(day);
  }

  const weeks: WorkWeek[] = [];
  const mondays = Object.keys(weekMap);
  for (const monday of mondays) {
    const weekDays = weekMap[monday];
    const sunday = getSunday(monday);
    const sorted = weekDays.sort((a: DailyTotal, b: DailyTotal) => a.date.localeCompare(b.date));

    weeks.push({
      monday,
      sunday,
      days: sorted,
      totalBillings: sorted.reduce((s: number, d: DailyTotal) => s + d.totalBillings, 0),
      totalMinutes: sorted.reduce((s: number, d: DailyTotal) => s + d.totalMinutes, 0),
      totalHours: sorted.reduce((s: number, d: DailyTotal) => s + d.totalHours, 0),
      prelimWithBbi: sorted.reduce((s: number, d: DailyTotal) => s + d.prelimWithBbi, 0),
      prelimWithoutBbi: sorted.reduce((s: number, d: DailyTotal) => s + d.prelimWithoutBbi, 0),
      loading625: sorted.reduce((s: number, d: DailyTotal) => s + d.loading625, 0),
    });
  }

  weeks.sort((a, b) => b.monday.localeCompare(a.monday));
  return weeks;
}

export default function LogPage() {
  const { toast } = useToast();
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const daysQuery = useQuery<DailyTotal[]>({
    queryKey: ["/api/days"],
  });

  const detailQuery = useQuery<DayDetail>({
    queryKey: ["/api/days", selectedDayId],
    enabled: selectedDayId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/days/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Day deleted",
        description: "The day entry has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/days"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting day",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadCsv = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleWeek = (monday: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(monday)) {
        next.delete(monday);
      } else {
        next.add(monday);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatWeekRange = (monday: string, sunday: string) => {
    const m = new Date(monday + "T00:00:00");
    const s = new Date(sunday + "T00:00:00");
    const monStr = m.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    const sunStr = s.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
    return `Mon ${monStr} – Sun ${sunStr}`;
  };

  const weeks = useMemo(() => {
    return groupByWorkWeek(daysQuery.data || []);
  }, [daysQuery.data]);

  const totalDays = daysQuery.data?.length || 0;

  if (daysQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Billings Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your saved billings
          </p>
        </div>
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-56" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-log-title">
            Billings Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalDays} {totalDays === 1 ? "day" : "days"} across {weeks.length} {weeks.length === 1 ? "work week" : "work weeks"}
          </p>
        </div>
        {totalDays > 0 && (
          <Button
            variant="outline"
            onClick={() => downloadCsv("/api/days/export/all")}
            data-testid="button-export-all"
          >
            <Download className="mr-2 h-4 w-4" />
            Export All CSV
          </Button>
        )}
      </div>

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1" data-testid="text-empty-state">No days saved yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Use the calculator to enter your daily billing items, then save them here for tracking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {weeks.map(week => {
            const isExpanded = expandedWeeks.has(week.monday);
            return (
              <Card key={week.monday} data-testid={`card-week-${week.monday}`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleWeek(week.monday)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full text-left p-4 md:p-5 hover-elevate rounded-md"
                      data-testid={`button-toggle-week-${week.monday}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium" data-testid={`text-week-range-${week.monday}`}>
                              {formatWeekRange(week.monday, week.sunday)}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {week.days.length} {week.days.length === 1 ? "day" : "days"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span className="font-medium" data-testid={`text-week-billings-${week.monday}`}>
                                {formatCurrency(week.totalBillings)}
                              </span>
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{week.totalMinutes} mins ({week.totalHours}h)</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Loading: {formatCurrency(week.loading625)}
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t divide-y divide-border">
                      {week.days.map(day => (
                        <div
                          key={day.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 md:px-6"
                          data-testid={`row-day-${day.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" data-testid={`text-day-date-${day.id}`}>
                              {formatShortDate(day.date)}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(day.totalBillings)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {day.totalMinutes} mins
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); downloadCsv(`/api/days/${day.id}/csv`); }}
                              data-testid={`button-export-${day.id}`}
                            >
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                              Export
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setSelectedDayId(day.id); }}
                              data-testid={`button-view-${day.id}`}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              Details
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`button-delete-${day.id}`}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this day?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove the billings record for {formatDate(day.date)}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(day.id)}
                                    data-testid="button-confirm-delete"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}

                      <div className="px-4 py-3 md:px-6 bg-muted/30">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Week Total</p>
                            <p className="font-bold tabular-nums">{formatCurrency(week.totalBillings)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Hours</p>
                            <p className="font-bold tabular-nums">{week.totalHours}h ({week.totalMinutes} mins)</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Prelim w/ BBI</p>
                            <p className="font-bold tabular-nums">{formatCurrency(week.prelimWithBbi)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Loading (6.25%)</p>
                            <p className="font-bold tabular-nums">{formatCurrency(week.loading625)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={selectedDayId !== null} onOpenChange={(open) => { if (!open) setSelectedDayId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-detail-title">
              Day Details
            </DialogTitle>
            <DialogDescription>
              {detailQuery.data?.day
                ? formatDate(detailQuery.data.day.date)
                : "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : detailQuery.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Billings</p>
                  <p className="font-bold tabular-nums" data-testid="text-detail-billings">
                    {formatCurrency(detailQuery.data.day.totalBillings)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="font-bold tabular-nums" data-testid="text-detail-hours">
                    {detailQuery.data.day.totalHours}h ({detailQuery.data.day.totalMinutes} mins)
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Prelim w/ BBI</p>
                  <p className="font-bold tabular-nums">
                    {formatCurrency(detailQuery.data.day.prelimWithBbi)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Loading (6.25%)</p>
                  <p className="font-bold tabular-nums">
                    {formatCurrency(detailQuery.data.day.loading625)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Line Items</h4>
                <div className="divide-y divide-border rounded-md border">
                  {detailQuery.data.items
                    .filter(item => item.count > 0)
                    .map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2"
                        data-testid={`detail-item-${item.itemKey}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.itemLabel}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="text-xs">
                            x{item.count}
                          </Badge>
                          <span className="text-sm font-medium tabular-nums w-20 text-right">
                            {formatCurrency(item.count * (item.baseAmount + item.bbiAmount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  {detailQuery.data.items.filter(i => i.count > 0).length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No items recorded
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
