import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { AlertBadge } from '../components/ui/AlertBadge';
import { KPICard } from '../components/ui/KPICard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea, Checkbox, Switch } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';

interface SampleTxn {
  id: string;
  user: string;
  amount: number;
  merchant: string;
  riskScore: number;
  status: string;
}

export const UIComponentShowcase: React.FC = () => {
  // Modal & Drawer demo states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Form demo states
  const [inputValue, setInputValue] = useState('demo@fraudshield.io');
  const [selectValue, setSelectValue] = useState('crypto_exchange');
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);

  // FilterBar & Table demo states
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sampleData: SampleTxn[] = [
    { id: 'TXN-9021', user: 'USR-CUST-1001', amount: 9500.0, merchant: 'Binance Global', riskScore: 94, status: 'BLOCKED' },
    { id: 'TXN-9022', user: 'USR-CUST-1002', amount: 240.5, merchant: 'Amazon US', riskScore: 18, status: 'APPROVED' },
    { id: 'TXN-9023', user: 'USR-CUST-1003', amount: 1850.0, merchant: 'QuickMart Luxury', riskScore: 78, status: 'REVIEW_REQUIRED' },
    { id: 'TXN-9024', user: 'USR-CUST-1004', amount: 50.0, merchant: 'Coffee Corner', riskScore: 8, status: 'APPROVED' },
    { id: 'TXN-9025', user: 'USR-CUST-1005', amount: 4800.0, merchant: 'Jewelry NYC', riskScore: 86, status: 'REVIEW_REQUIRED' },
  ];

  const tableColumns: ColumnDef<SampleTxn>[] = [
    { key: 'id', header: 'Transaction ID', sortable: true, cell: (r) => <span className="font-mono font-semibold text-blue-400">{r.id}</span> },
    { key: 'user', header: 'Customer', cell: (r) => <span className="font-mono text-soc-muted">{r.user}</span> },
    { key: 'amount', header: 'Amount', sortable: true, align: 'right', cell: (r) => <span className="font-mono font-bold">${r.amount.toFixed(2)}</span> },
    { key: 'merchant', header: 'Merchant', cell: (r) => <span>{r.merchant}</span> },
    { key: 'riskScore', header: 'Risk Score', sortable: true, cell: (r) => <RiskBadge score={r.riskScore} /> },
    {
      key: 'status',
      header: 'Decision',
      cell: (r) => (
        <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'BLOCKED' ? 'destructive' : 'warning'}>
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        title="UI Component System & Design Tokens"
        description="Standardized, accessible, and theme-responsive UI component library for the Real-Time Fraud & Anomaly Detection Platform."
        badge={
          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-500 font-mono text-xs font-bold">
            SECTION 04 COMPLIANT
          </span>
        }
      />

      {/* 1. Button System */}
      <Card>
        <CardHeader>
          <CardTitle>1. Button Variants, Sizes & States</CardTitle>
          <CardDescription>Primary, Secondary, Outline, Ghost, Destructive, with loading and disabled states.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Action</Button>
            <Button variant="primary" isLoading>Loading State</Button>
            <Button variant="primary" disabled>Disabled State</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="sm" variant="primary">Small (sm)</Button>
            <Button size="md" variant="primary">Medium (md)</Button>
            <Button size="lg" variant="primary">Large (lg)</Button>
            <Button size="md" variant="secondary" leftIcon={<Zap className="w-3.5 h-3.5 text-amber-400" />}>
              With Icon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Badges, RiskBadges & AlertBadges */}
      <Card>
        <CardHeader>
          <CardTitle>2. Badges, Risk & Severity Indicators</CardTitle>
          <CardDescription>Accessible color contrast paired with distinct text labels and icons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-soc-muted mb-2 uppercase tracking-wider font-mono">
              Risk Levels & Scores
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge level="LOW" score={12} />
              <RiskBadge level="MEDIUM" score={45} />
              <RiskBadge level="HIGH" score={78} />
              <RiskBadge level="CRITICAL" score={96} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-soc-muted uppercase tracking-wider font-mono">
              Alert Severities & Lifecycle Status Badges
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <AlertBadge severity="LOW" />
                <AlertBadge severity="MEDIUM" />
                <AlertBadge severity="HIGH" />
                <AlertBadge severity="CRITICAL" />
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <AlertBadge status="NEW" />
                <AlertBadge status="ACKNOWLEDGED" />
                <AlertBadge status="INVESTIGATING" />
                <AlertBadge status="RESOLVED" />
                <AlertBadge status="CLOSED" />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-soc-muted mb-2 uppercase tracking-wider font-mono">
              General Semantic Badges
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="success" dot>Success</Badge>
              <Badge variant="warning" dot>Warning</Badge>
              <Badge variant="destructive" dot>Destructive</Badge>
              <Badge variant="info" dot>Info</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. KPI Metric Cards */}
      <div>
        <h3 className="text-sm font-semibold text-soc-muted uppercase tracking-wider font-mono mb-3">
          3. KPI Metrics & Trend Cards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Total Volume"
            value="$1,489,200"
            trend="+12.4%"
            trendDirection="up"
            description="vs previous 24-hour cycle"
            icon={DollarSign}
            badge="LIVE"
          />
          <KPICard
            title="Anomalies Flagged"
            value="38 Txns"
            trend="-4.2%"
            trendDirection="down"
            description="Isolation Forest detections"
            icon={ShieldAlert}
          />
          <KPICard
            title="Decision Latency"
            value="0.82ms"
            trend="Optimal"
            trendDirection="neutral"
            description="P99 stream pipeline execution"
            icon={Zap}
          />
        </div>
      </div>

      {/* 4. Form Controls */}
      <Card>
        <CardHeader>
          <CardTitle>4. Standardized Form Controls</CardTitle>
          <CardDescription>Accessible labels, focus rings, error feedback, and helper descriptions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="User Email Address"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="Account identity verified via Section 03 RBAC"
              leftIcon={<Search className="w-3.5 h-3.5" />}
            />
            <Input
              label="Transaction Amount"
              placeholder="$0.00"
              error="Amount exceeds $5,000 threshold"
            />
            <Select
              label="Merchant Risk Category"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: 'crypto_exchange', label: 'Crypto & Exchange (Tier 1)' },
                { value: 'luxury_goods', label: 'Luxury Goods (Tier 2)' },
                { value: 'e_commerce', label: 'General E-Commerce (Tier 3)' },
              ]}
            />
          </div>

          <Textarea
            label="Analyst Investigation Notes"
            placeholder="Document explainability factors or evidence references..."
            rows={2}
          />

          <div className="flex flex-wrap items-center gap-8 pt-2">
            <Checkbox
              label="Enable Autonomous Blocking"
              description="Automatically declines transactions with risk score >= 95.0"
              checked={checkboxVal}
              onChange={(e) => setCheckboxVal(e.target.checked)}
            />
            <Switch
              label="Real-Time WebSocket Ingestion"
              description="Broadcast incoming telemetry to connected SOC consoles"
              checked={switchVal}
              onChange={setSwitchVal}
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Modals, Drawers & Confirmation Dialogs */}
      <Card>
        <CardHeader>
          <CardTitle>5. Modals, Drawers & Confirmation Dialogs</CardTitle>
          <CardDescription>Accessible focus management, keyboard escape, and backdrop blur.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Open Demo Modal
            </Button>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
              Open Side Inspector Drawer
            </Button>
            <Button variant="destructive" onClick={() => setIsConfirmOpen(true)}>
              Trigger Critical Action Dialog
            </Button>
          </div>

          {/* Demo Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Rule Execution Inspection"
            description="Explainability breakdown and threshold contribution."
            footer={
              <>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                  Acknowledge
                </Button>
              </>
            }
          >
            <p className="text-xs text-soc-muted leading-relaxed">
              This modal demonstrates keyboard accessibility, backdrop isolation, and theme responsiveness across light and dark modes.
            </p>
          </Modal>

          {/* Demo Drawer */}
          <Drawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            title="Transaction Deep Dive"
            description="Payload, telemetry, and features."
          >
            <div className="space-y-4 text-xs text-soc-muted">
              <div className="p-3 bg-soc-surface rounded-lg border border-soc-border">
                <div className="font-bold text-soc-foreground mb-1">TXN-9021 Telemetry</div>
                <p>Velocity: 6 txns / 5 min</p>
                <p>Geo Hop: 840 km/h (Impossible Travel)</p>
              </div>
            </div>
          </Drawer>

          {/* Demo Confirmation Dialog */}
          <ConfirmationDialog
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => setIsConfirmOpen(false)}
            title="Deactivate Fraud Rule?"
            message="Deactivating rule 'HIGH_AMOUNT' will stop evaluating transactions against the $5,000 threshold immediately."
            confirmText="Deactivate Rule"
            variant="destructive"
          />
        </CardContent>
      </Card>

      {/* 6. DataTable & FilterBar Foundation */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-soc-muted uppercase tracking-wider font-mono">
          6. DataTable & FilterBar Foundation
        </h3>

        <FilterBar
          searchValue={searchFilter}
          onSearchChange={setSearchFilter}
          searchPlaceholder="Filter transactions or customers..."
          filters={[
            {
              key: 'category',
              label: 'Category',
              value: categoryFilter,
              options: [
                { label: 'All Categories', value: 'all' },
                { label: 'Crypto Exchanges', value: 'crypto' },
                { label: 'E-Commerce', value: 'ecom' },
              ],
              onChange: setCategoryFilter,
            },
          ]}
          onResetFilters={() => {
            setSearchFilter('');
            setCategoryFilter('all');
          }}
          activeFilterCount={searchFilter || categoryFilter !== 'all' ? 1 : 0}
        />

        <DataTable
          columns={tableColumns}
          data={sampleData}
          keyExtractor={(r) => r.id}
          sortBy={sortCol}
          sortOrder={sortDir}
          onSort={(key) => {
            if (sortCol === key) {
              setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
            } else {
              setSortCol(key);
              setSortDir('asc');
            }
          }}
          pagination={{
            currentPage,
            totalPages: 3,
            totalItems: 15,
            pageSize: 5,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      {/* 7. Empty & Error Feedback States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmptyState
          title="No Investigation Cases"
          description="There are currently no active cases assigned to this queue."
          actionText="Create Investigation Case"
          onAction={() => alert('EmptyState Action Triggered')}
        />
        <ErrorState
          title="Telemetry Connection Interrupted"
          message="Failed to retrieve real-time feature vector from store."
          onRetry={() => alert('Retry Action Triggered')}
        />
      </div>
    </div>
  );
};
