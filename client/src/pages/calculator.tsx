import { useState, useMemo, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LINE_ITEMS } from "@shared/schema";
import { calculateTotals, formatCurrency, getLineItemCategories } from "@/lib/calculator";
import { Calculator, RotateCcw, Save, Clock, DollarSign, FileText, TrendingUp, Minus, Plus } from "lucide-react";

export default function CalculatorPage() {
  const { toast } = useToast();
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of LINE_ITEMS) {
      initial[item.key] = 0;
    }
    return initial;
  });
  const [weekEnding, setWeekEnding] = useState("");

  const totals = useMemo(() => calculateTotals(counts), [counts]);
  const categories = useMemo(() => getLineItemCategories(), []);

  const hasAnyCounts = useMemo(() => Object.values(counts).some(c => c > 0), [counts]);

  const updateCount = useCallback((key: string, value: number) => {
    setCounts(prev => ({ ...prev, [key]: Math.max(0, value) }));
  }, []);

  const clearCounts = useCallback(() => {
    setCounts(prev => {
      const cleared: Record<string, number> = {};
      for (const key of Object.keys(prev)) {
        cleared[key] = 0;
      }
      return cleared;
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/weeks", {
        weekEnding,
        counts,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Week saved",
        description: `Billings for week ending ${weekEnding} have been saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
      clearCounts();
      setWeekEnding("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving week",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!weekEnding) {
      toast({
        title: "Date required",
        description: "Please select a week ending date before saving.",
        variant: "destructive",
      });
      return;
    }
    if (!hasAnyCounts) {
      toast({
        title: "No items entered",
        description: "Please enter at least one line item count.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            Billings Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter item counts to calculate weekly billings
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={clearCounts}
            disabled={!hasAnyCounts}
            data-testid="button-clear"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Billings</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-billings">
              {formatCurrency(totals.totalBillings)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Hours</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-total-hours">
              {totals.totalHours}h
            </p>
            <p className="text-xs text-muted-foreground">{totals.totalMinutes} mins</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prelim w/ BBI</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-prelim-bbi">
              {formatCurrency(totals.prelimWithBbi)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Loading (6.25%)</span>
            </div>
            <p className="text-xl font-bold" data-testid="text-loading">
              {formatCurrency(totals.loading625)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {categories.map(({ category, items }) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 px-4 py-3 md:px-6"
                    data-testid={`row-item-${item.key}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-label-${item.key}`}>
                        {item.label}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {item.minutes}min
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Base: {formatCurrency(item.baseAmount)}
                        </span>
                        {item.bbiAmount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            BBI: {formatCurrency(item.bbiAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateCount(item.key, (counts[item.key] || 0) - 1)}
                        disabled={!counts[item.key]}
                        data-testid={`button-decrement-${item.key}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={counts[item.key] || 0}
                        onChange={(e) => updateCount(item.key, parseInt(e.target.value) || 0)}
                        className="w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        data-testid={`input-count-${item.key}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateCount(item.key, (counts[item.key] || 0) + 1)}
                        data-testid={`button-increment-${item.key}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="w-24 text-right">
                      <p className="text-sm font-medium tabular-nums" data-testid={`text-subtotal-${item.key}`}>
                        {formatCurrency((counts[item.key] || 0) * (item.baseAmount + item.bbiAmount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="flex-1 w-full md:w-auto">
              <label className="text-sm font-medium mb-1.5 block" htmlFor="week-ending">
                Week Ending Date
              </label>
              <Input
                id="week-ending"
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="w-full md:w-56"
                data-testid="input-week-ending"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right hidden md:block">
                <p className="text-xs text-muted-foreground">Total Billings</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.totalBillings)}</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-week"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save Week"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
