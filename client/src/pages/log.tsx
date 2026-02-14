import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/calculator";
import type { WeeklyTotal, WeeklyLineItem } from "@shared/schema";
import { Calendar, Clock, DollarSign, Eye, Trash2, FileText, Download } from "lucide-react";

interface WeekDetail {
  week: WeeklyTotal;
  items: WeeklyLineItem[];
}

export default function LogPage() {
  const { toast } = useToast();
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  const weeksQuery = useQuery<WeeklyTotal[]>({
    queryKey: ["/api/weeks"],
  });

  const detailQuery = useQuery<WeekDetail>({
    queryKey: ["/api/weeks", selectedWeekId],
    enabled: selectedWeekId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/weeks/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Week deleted",
        description: "The week entry has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting week",
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (weeksQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Billings Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your saved weekly billings
          </p>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-4 mt-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const weeks = weeksQuery.data || [];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-log-title">
            Billings Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {weeks.length} {weeks.length === 1 ? "week" : "weeks"} recorded
          </p>
        </div>
        {weeks.length > 0 && (
          <Button
            variant="outline"
            onClick={() => downloadCsv("/api/weeks/export/all")}
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
            <h3 className="text-lg font-medium mb-1" data-testid="text-empty-state">No weeks saved yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Use the calculator to enter your weekly billing items, then save them here for tracking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {weeks.map(week => (
            <Card key={week.id} data-testid={`card-week-${week.id}`}>
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium" data-testid={`text-week-date-${week.id}`}>
                        {formatDate(week.weekEnding)}
                      </h3>
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-hours-${week.id}`}>
                        {week.totalHours}h
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span data-testid={`text-week-billings-${week.id}`}>
                          {formatCurrency(week.totalBillings)}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{week.totalMinutes} mins</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Loading: {formatCurrency(week.loading625)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadCsv(`/api/weeks/${week.id}/csv`)}
                      data-testid={`button-export-${week.id}`}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeekId(week.id)}
                      data-testid={`button-view-${week.id}`}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Details
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-delete-${week.id}`}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this week?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the billings record for {formatDate(week.weekEnding)}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(week.id)}
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selectedWeekId !== null} onOpenChange={(open) => { if (!open) setSelectedWeekId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-detail-title">
              Week Details
            </DialogTitle>
            <DialogDescription>
              {detailQuery.data?.week
                ? `Week ending ${formatDate(detailQuery.data.week.weekEnding)}`
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
                    {formatCurrency(detailQuery.data.week.totalBillings)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="font-bold tabular-nums" data-testid="text-detail-hours">
                    {detailQuery.data.week.totalHours}h ({detailQuery.data.week.totalMinutes} mins)
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Prelim w/ BBI</p>
                  <p className="font-bold tabular-nums">
                    {formatCurrency(detailQuery.data.week.prelimWithBbi)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Loading (6.25%)</p>
                  <p className="font-bold tabular-nums">
                    {formatCurrency(detailQuery.data.week.loading625)}
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
