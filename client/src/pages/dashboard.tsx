import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/calculator";
import type { DailyTotal, MonthlyBudget } from "@shared/schema";
import {
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

interface MonthSummary {
  month: string;
  label: string;
  totalBillings: number;
  totalMinutes: number;
  totalHours: number;
  prelimWithBbi: number;
  loading625: number;
  dayCount: number;
  budget: number | null;
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getAvailableMonths(days: DailyTotal[]): string[] {
  const monthSet = new Set<string>();
  for (const day of days) {
    monthSet.add(getMonthKey(day.date));
  }
  return Array.from(monthSet).sort().reverse();
}

function buildMonthlySummaries(
  days: DailyTotal[],
  budgets: MonthlyBudget[]
): MonthSummary[] {
  const monthMap: Record<string, DailyTotal[]> = {};
  for (const day of days) {
    const key = getMonthKey(day.date);
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(day);
  }

  const budgetMap: Record<string, number> = {};
  for (const b of budgets) {
    budgetMap[b.month] = b.budget;
  }

  const summaries: MonthSummary[] = [];
  for (const month of Object.keys(monthMap).sort().reverse()) {
    const monthDays = monthMap[month];
    summaries.push({
      month,
      label: getMonthLabel(month),
      totalBillings: monthDays.reduce((s, d) => s + d.totalBillings, 0),
      totalMinutes: monthDays.reduce((s, d) => s + d.totalMinutes, 0),
      totalHours: monthDays.reduce((s, d) => s + d.totalHours, 0),
      prelimWithBbi: monthDays.reduce((s, d) => s + d.prelimWithBbi, 0),
      loading625: monthDays.reduce((s, d) => s + d.loading625, 0),
      dayCount: monthDays.length,
      budget: budgetMap[month] ?? null,
    });
  }

  return summaries;
}

function BudgetVarianceBadge({ actual, budget }: { actual: number; budget: number }) {
  const diff = actual - budget;
  const pct = budget > 0 ? (diff / budget) * 100 : 0;
  const isOver = diff > 0;
  const isExact = Math.abs(diff) < 0.01;

  if (isExact) {
    return (
      <Badge variant="secondary" className="text-xs" data-testid="badge-on-budget">
        <Minus className="h-3 w-3 mr-1" /> On Budget
      </Badge>
    );
  }

  return (
    <Badge
      variant={isOver ? "destructive" : "default"}
      className="text-xs"
      data-testid={isOver ? "badge-over-budget" : "badge-under-budget"}
    >
      {isOver ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
      {isOver ? "Over" : "Under"} by {formatCurrency(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%)
    </Badge>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const currentMonth = getCurrentMonthKey();
  const [budgetInput, setBudgetInput] = useState("");
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const daysQuery = useQuery<DailyTotal[]>({
    queryKey: ["/api/days"],
  });

  const budgetsQuery = useQuery<MonthlyBudget[]>({
    queryKey: ["/api/budgets"],
  });

  const setBudgetMutation = useMutation({
    mutationFn: async ({ month, budget }: { month: string; budget: number }) => {
      await apiRequest("PUT", "/api/budgets", { month, budget });
    },
    onSuccess: () => {
      toast({ title: "Budget saved", description: "Monthly budget has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setEditingMonth(null);
      setBudgetInput("");
    },
    onError: (error: Error) => {
      toast({ title: "Error saving budget", description: error.message, variant: "destructive" });
    },
  });

  const monthlySummaries = useMemo(() => {
    return buildMonthlySummaries(daysQuery.data || [], budgetsQuery.data || []);
  }, [daysQuery.data, budgetsQuery.data]);

  const availableMonths = useMemo(() => {
    return getAvailableMonths(daysQuery.data || []);
  }, [daysQuery.data]);

  const currentMonthSummary = monthlySummaries.find(s => s.month === selectedMonth);

  const handleSaveBudget = (month: string) => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val < 0) {
      toast({ title: "Invalid budget", description: "Enter a valid positive number.", variant: "destructive" });
      return;
    }
    setBudgetMutation.mutate({ month, budget: val });
  };

  const startEditing = (month: string, currentBudget: number | null) => {
    setEditingMonth(month);
    setBudgetInput(currentBudget !== null ? String(currentBudget) : "");
  };

  if (daysQuery.isLoading || budgetsQuery.isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Monthly summaries and budget tracking</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly summaries and budget tracking
          </p>
        </div>
        {availableMonths.length > 0 && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]" data-testid="select-month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m} data-testid={`option-month-${m}`}>
                  {getMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {currentMonthSummary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-mtd-billings">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Month-to-Date Billings</p>
                </div>
                <p className="text-xl font-bold tabular-nums" data-testid="text-mtd-billings">
                  {formatCurrency(currentMonthSummary.totalBillings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMonthSummary.dayCount} {currentMonthSummary.dayCount === 1 ? "day" : "days"} logged
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mtd-hours">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Month-to-Date Hours</p>
                </div>
                <p className="text-xl font-bold tabular-nums" data-testid="text-mtd-hours">
                  {currentMonthSummary.totalHours}h
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMonthSummary.totalMinutes} total minutes
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mtd-avg">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Daily Average</p>
                </div>
                <p className="text-xl font-bold tabular-nums" data-testid="text-mtd-avg">
                  {currentMonthSummary.dayCount > 0
                    ? formatCurrency(currentMonthSummary.totalBillings / currentMonthSummary.dayCount)
                    : formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  per working day
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-budget-status">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Budget Status</p>
                </div>
                {currentMonthSummary.budget !== null ? (
                  <>
                    <p className="text-xl font-bold tabular-nums" data-testid="text-budget-amount">
                      {formatCurrency(currentMonthSummary.budget)}
                    </p>
                    <div className="mt-1">
                      <BudgetVarianceBadge
                        actual={currentMonthSummary.totalBillings}
                        budget={currentMonthSummary.budget}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-budget">
                    No budget set
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {currentMonthSummary.budget !== null && (
            <Card data-testid="card-budget-progress">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                  <h3 className="text-sm font-medium">Budget Progress</h3>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(currentMonthSummary.totalBillings)} of {formatCurrency(currentMonthSummary.budget)}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentMonthSummary.totalBillings > currentMonthSummary.budget
                        ? "bg-destructive"
                        : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(
                        (currentMonthSummary.totalBillings / currentMonthSummary.budget) * 100,
                        100
                      )}%`,
                    }}
                    data-testid="progress-budget-bar"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {currentMonthSummary.budget > 0
                    ? `${((currentMonthSummary.totalBillings / currentMonthSummary.budget) * 100).toFixed(1)}% of budget`
                    : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1" data-testid="text-no-data">
              No data for this month
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Save daily entries from the calculator to see monthly summaries here.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4" data-testid="text-monthly-summaries-title">
          Monthly Summaries
        </h2>
        {monthlySummaries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No monthly data available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {monthlySummaries.map(summary => (
              <Card key={summary.month} data-testid={`card-month-${summary.month}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium" data-testid={`text-month-label-${summary.month}`}>
                          {summary.label}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {summary.dayCount} {summary.dayCount === 1 ? "day" : "days"}
                        </Badge>
                        {summary.budget !== null && (
                          <BudgetVarianceBadge actual={summary.totalBillings} budget={summary.budget} />
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Billings</p>
                          <p className="text-sm font-bold tabular-nums" data-testid={`text-month-billings-${summary.month}`}>
                            {formatCurrency(summary.totalBillings)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Hours</p>
                          <p className="text-sm font-bold tabular-nums">
                            {summary.totalHours}h ({summary.totalMinutes} mins)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prelim w/ BBI</p>
                          <p className="text-sm font-bold tabular-nums">
                            {formatCurrency(summary.prelimWithBbi)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="text-sm font-bold tabular-nums">
                            {summary.budget !== null ? formatCurrency(summary.budget) : "Not set"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingMonth === summary.month ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Budget amount"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            className="w-32"
                            data-testid={`input-budget-${summary.month}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveBudget(summary.month)}
                            disabled={setBudgetMutation.isPending}
                            data-testid={`button-save-budget-${summary.month}`}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingMonth(null); setBudgetInput(""); }}
                            data-testid={`button-cancel-budget-${summary.month}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(summary.month, summary.budget)}
                          data-testid={`button-set-budget-${summary.month}`}
                        >
                          <Target className="mr-1.5 h-3.5 w-3.5" />
                          {summary.budget !== null ? "Edit Budget" : "Set Budget"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
