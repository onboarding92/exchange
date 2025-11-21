import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UserNav } from "@/components/UserNav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Percent,
  Lock,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type StakingPlan = {
  id: number;
  name: string;
  asset: string;
  apr: number;
  lockDays: number;
  minAmount: number;
  maxAmount: number | null;
};

type UserStake = {
  id: number;
  planId: number;
  asset: string;
  amount: number;
  apr: number;
  lockDays: number;
  startAt: string;
  unlockAt: string;
  claimedRewards: number;
  status: string;
};

export default function Staking() {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: false,
    redirectPath: getLoginUrl(),
  });

  const plansQuery = trpc.staking.listPlans.useQuery();
  const stakesQuery = trpc.staking.myStakes.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [amount, setAmount] = useState("100");

  const createStakeMutation = trpc.staking.createStake.useMutation({
    onSuccess() {
      stakesQuery.refetch();
      setAmount("100");
    },
  });

  const claimStakeMutation = trpc.staking.claimStake.useMutation({
    onSuccess() {
      stakesQuery.refetch();
    },
  });

  if (loading || plansQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UserNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Staking
            </CardTitle>
            <CardDescription>
              You must be logged in to view and participate in staking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Go to login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plans = (plansQuery.data ?? []) as StakingPlan[];
  const stakes = (stakesQuery.data ?? []) as UserStake[];

  const now = new Date();

  const handleCreateStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    createStakeMutation.mutate({
      planId: selectedPlanId,
      amount: amt,
    } as any);
  };

  const handleClaim = (stakeId: number) => {
    claimStakeMutation.mutate({ stakeId } as any);
  };

  const isStakeClaimable = (stake: UserStake) => {
    if (stake.status !== "active") return false;
    const unlockAt = new Date(stake.unlockAt);
    return now.getTime() >= unlockAt.getTime();
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <Lock className="h-7 w-7" />
              Staking
            </h1>
            <p className="text-muted-foreground">
              Lock your assets to earn passive rewards over time. APR is applied
              linearly over the lock period.
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
          {/* Available plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Available plans
              </CardTitle>
              <CardDescription>
                Choose a plan and amount to create a new stake. Funds will be locked
                until the end of the plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No staking plans are currently available.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <div className="space-y-2">
                      {plans.map((p) => {
                        const isSelected = selectedPlanId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPlanId(p.id)}
                            className={[
                              "w-full text-left border rounded-md p-3 text-sm transition-colors",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/60",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-medium">
                                  {p.name}{" "}
                                  <span className="text-xs text-muted-foreground">
                                    ({p.asset})
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground space-x-2 mt-1">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {p.lockDays} days lock
                                  </span>
                                  <span>• Min {p.minAmount}</span>
                                  {p.maxAmount && <span>• Max {p.maxAmount}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold">
                                  {(p.apr * 100).toFixed(2)}%
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  APR (yearly)
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleCreateStake} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        min={0}
                        step="0.00000001"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={
                          !selectedPlanId ||
                          createStakeMutation.isPending ||
                          !amount
                        }
                      >
                        {createStakeMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Start staking
                      </Button>
                    </div>
                    {createStakeMutation.isError && (
                      <div className="mt-1 flex items-start gap-2 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <p>
                          Failed to create stake. Check your balance and plan
                          requirements, then try again.
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User stakes */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Your stakes
              </CardTitle>
              <CardDescription>
                Active and completed staking positions. Claimable stakes can be
                withdrawn with rewards once unlocked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stakesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : stakes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any staking positions yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>APR</TableHead>
                        <TableHead>Lock</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stakes.map((s) => {
                        const unlockAt = new Date(s.unlockAt);
                        const claimable = isStakeClaimable(s);

                        return (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs md:text-sm">
                              {s.asset}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {s.amount}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {(s.apr * 100).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {s.lockDays} days
                            </TableCell>
                            <TableCell className="text-[11px] md:text-xs">
                              {new Date(s.startAt).toLocaleDateString()} –{" "}
                              {unlockAt.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs md:text-xs">
                              <Badge
                                variant="outline"
                                className={
                                  s.status === "active"
                                    ? "border-emerald-500 text-emerald-400"
                                    : s.status === "claimed"
                                    ? "border-primary text-primary"
                                    : ""
                                }
                              >
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {claimable && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClaim(s.id)}
                                  disabled={claimStakeMutation.isPending}
                                >
                                  {claimStakeMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
                                  Claim
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
