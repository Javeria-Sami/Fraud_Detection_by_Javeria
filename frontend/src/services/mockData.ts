import { Transaction, Alert, Case, UserRiskProfile, FraudRule, SystemSetting } from '../types';

// Helper generator for rich mock transactions
function generateMockTransactions(): Transaction[] {
  const users = [
    { id: 'USR-CUST-1001', name: 'John Doe', city: 'London', country: 'GB', ip: '198.51.100.45', device: 'DEV-MACBOOK-01' },
    { id: 'USR-CUST-1002', name: 'Sarah Connor', city: 'Singapore', country: 'SG', ip: '203.0.113.88', device: 'DEV-IPHONE-02' },
    { id: 'USR-CUST-1003', name: 'Alice Smith', city: 'Cupertino', country: 'US', ip: '192.0.2.14', device: 'DEV-IPHONE-15' },
    { id: 'USR-CUST-1004', name: 'Elena Rostova', city: 'Amsterdam', country: 'NL', ip: '185.220.101.5', device: 'DEV-ANDROID-09' },
    { id: 'USR-CUST-1005', name: 'Marcus Vance', city: 'London', country: 'GB', ip: '82.165.197.1', device: 'DEV-IPHONE-08' },
    { id: 'USR-CUST-1006', name: 'Tariq Al-Mansoor', city: 'Chicago', country: 'US', ip: '64.233.160.1', device: 'DEV-WINDOWS-04' },
    { id: 'USR-CUST-1007', name: 'David Kim', city: 'Seoul', country: 'KR', ip: '211.234.112.5', device: 'DEV-GALAXY-24' },
    { id: 'USR-CUST-1008', name: 'Claire Dubois', city: 'Paris', country: 'FR', ip: '195.154.120.33', device: 'DEV-MACBOOK-02' },
    { id: 'USR-CUST-1009', name: 'Alejandro Gomez', city: 'Madrid', country: 'ES', ip: '213.97.0.15', device: 'DEV-ANDROID-11' },
    { id: 'USR-CUST-1010', name: 'Hanna Lindqvist', city: 'Stockholm', country: 'SE', ip: '193.180.251.1', device: 'DEV-IPHONE-14' },
    { id: 'USR-CUST-1011', name: 'Liam O\'Connor', city: 'Dublin', country: 'IE', ip: '89.101.24.50', device: 'DEV-WINDOWS-07' },
    { id: 'USR-CUST-1012', name: 'Sophia Chen', city: 'Toronto', country: 'CA', ip: '142.250.190.4', device: 'DEV-MACBOOK-04' },
    { id: 'USR-CUST-1013', name: 'Mateo Rossi', city: 'Milan', country: 'IT', ip: '93.186.240.2', device: 'DEV-IPHONE-13' },
    { id: 'USR-CUST-1014', name: 'Ananya Patel', city: 'Mumbai', country: 'IN', ip: '115.112.80.12', device: 'DEV-ONEPLUS-11' },
    { id: 'USR-CUST-1015', name: 'Lucas Silva', city: 'Sao Paulo', country: 'BR', ip: '177.18.200.9', device: 'DEV-ANDROID-12' },
  ];

  const merchants = [
    { name: 'Amazon Web Retail', category: 'Electronics & Retail', method: 'CREDIT_CARD', cur: 'USD' },
    { name: 'Binance Global Exchange', category: 'Crypto & Exchange', method: 'CRYPTO', cur: 'USD' },
    { name: 'Apple Store Online', category: 'Electronics & Devices', method: 'APPLE_PAY', cur: 'USD' },
    { name: 'Uber BV Amsterdam', category: 'Transportation', method: 'CREDIT_CARD', cur: 'EUR' },
    { name: 'Deliveroo London', category: 'Food & Dining', method: 'DEBIT_CARD', cur: 'GBP' },
    { name: 'Target Stores US', category: 'Retail Goods', method: 'CREDIT_CARD', cur: 'USD' },
    { name: 'Coinbase Pro Prime', category: 'Crypto & Exchange', method: 'CRYPTO', cur: 'USD' },
    { name: 'BestBuy Electronics', category: 'Electronics & Retail', method: 'CREDIT_CARD', cur: 'USD' },
    { name: 'Netflix International', category: 'Streaming & Digital', method: 'DEBIT_CARD', cur: 'EUR' },
    { name: 'Steam Games Europe', category: 'Gaming & Digital', method: 'CREDIT_CARD', cur: 'EUR' },
    { name: 'Airbnb Travel Lodging', category: 'Travel & Lodging', method: 'CREDIT_CARD', cur: 'USD' },
    { name: 'Expedia Flights & Hotels', category: 'Travel & Lodging', method: 'CREDIT_CARD', cur: 'GBP' },
    { name: 'Spotify AB', category: 'Streaming & Digital', method: 'APPLE_PAY', cur: 'EUR' },
    { name: 'Stripe Direct Settlement', category: 'Payment Gateway', method: 'WIRE_TRANSFER', cur: 'USD' },
    { name: 'Walmart Supercenter', category: 'Retail Goods', method: 'DEBIT_CARD', cur: 'USD' },
  ];

  const tiers: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[] = ['LOW', 'LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'LOW', 'MEDIUM'];
  const statuses: ('APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED' | 'FLAGGED' | 'DECLINED')[] = [
    'APPROVED',
    'APPROVED',
    'APPROVED',
    'REVIEW_REQUIRED',
    'FLAGGED',
    'DECLINED',
    'BLOCKED',
    'APPROVED',
  ];

  const transactions: Transaction[] = [];

  for (let i = 1; i <= 75; i++) {
    const user = users[(i - 1) % users.length];
    const merch = merchants[(i * 3) % merchants.length];
    const tier = tiers[i % tiers.length];
    const status = tier === 'CRITICAL' ? (i % 2 === 0 ? 'DECLINED' : 'BLOCKED')
      : tier === 'HIGH' ? (i % 2 === 0 ? 'FLAGGED' : 'REVIEW_REQUIRED')
      : tier === 'MEDIUM' ? (i % 2 === 0 ? 'REVIEW_REQUIRED' : 'APPROVED')
      : 'APPROVED';

    const baseAmount = tier === 'CRITICAL' ? 1200 + (i * 115) % 8500
      : tier === 'HIGH' ? 650 + (i * 85) % 3500
      : tier === 'MEDIUM' ? 150 + (i * 45) % 950
      : 15 + (i * 23) % 250;

    const riskScore = tier === 'CRITICAL' ? 82 + (i % 17)
      : tier === 'HIGH' ? 62 + (i % 18)
      : tier === 'MEDIUM' ? 38 + (i % 20)
      : 5 + (i % 25);

    const pad = String(i).padStart(3, '0');
    const id = `TXN-98${pad}-X${i % 9}`;
    const minutesAgo = (i - 1) * 28 + (i % 7) * 4;
    const timestamp = new Date(Date.now() - 1000 * 60 * minutesAgo).toISOString();

    const rules = [];
    if (tier === 'CRITICAL' || tier === 'HIGH') {
      rules.push({
        rule_id: 'RULE-001',
        rule_name: 'Velocity Spike Detection',
        severity: tier as any,
        category: 'VELOCITY',
        points: 35,
        version: '1.2.0',
      });
      if (merch.category.includes('Crypto')) {
        rules.push({
          rule_id: 'RULE-002',
          rule_name: 'Crypto High Risk Outflow',
          severity: 'HIGH' as any,
          category: 'MERCHANT',
          points: 25,
          version: '1.0.0',
        });
      }
    }

    const riskFactors = [];
    if (tier !== 'LOW') {
      riskFactors.push({
        factor_name: tier === 'CRITICAL' ? 'Excessive Velocity & Amount' : 'New Device Fingerprint',
        weight: 0.4,
        score: riskScore,
        contribution: Math.round(riskScore * 0.4),
        description: `Statistical deviation in transaction characteristics for ${user.name}`,
      });
    }

    transactions.push({
      id,
      transaction_id: id,
      user_id: user.id,
      user_name: user.name,
      merchant_id: `MERCH-${merch.name.substring(0, 6).toUpperCase()}`,
      merchant_name: merch.name,
      merchant_category: merch.category,
      payment_method: merch.method,
      transaction_type: 'PURCHASE',
      amount: parseFloat(baseAmount.toFixed(2)),
      currency: merch.cur,
      device_id: user.device,
      ip_address: user.ip,
      city: user.city,
      country: user.country,
      failed_attempts: tier === 'CRITICAL' ? 2 : tier === 'HIGH' ? 1 : 0,
      source: i % 3 === 0 ? 'MOBILE_APP' : i % 3 === 1 ? 'API' : 'WEB_PORTAL',
      risk_score: riskScore,
      risk_level: tier,
      ml_anomaly_score: parseFloat((riskScore / 100).toFixed(2)),
      rules_triggered: rules,
      risk_factors: riskFactors,
      status,
      timestamp,
      created_at: timestamp,
    });
  }

  return transactions;
}

export const MOCK_TRANSACTIONS: Transaction[] = generateMockTransactions();

// Helper generator for rich mock alerts
function generateMockAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const severities: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[] = ['CRITICAL', 'HIGH', 'HIGH', 'MEDIUM', 'MEDIUM', 'LOW'];
  const statuses: ('OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED')[] = ['OPEN', 'INVESTIGATING', 'OPEN', 'RESOLVED', 'OPEN'];

  const reasons = [
    'High Velocity Transfer Spike on New Device',
    'Suspicious Crypto Gateway Settlement',
    'Unrecognized Device Association with Elevated Amount',
    'Cross-Border Geo Hop Detected within 15 Minutes',
    'Multiple PIN Failures Followed by High-Value Purchase',
    'ML High Confidence Anomaly on Out-of-Pattern Spending',
    'Card Testing Sequence Identified on Merchant Terminal',
  ];

  for (let i = 1; i <= 45; i++) {
    const pad = String(i).padStart(3, '0');
    const sev = severities[i % severities.length];
    const stat = statuses[i % statuses.length];
    const rIdx = (i - 1) % reasons.length;
    const score = sev === 'CRITICAL' ? 80 + (i % 18) : sev === 'HIGH' ? 60 + (i % 20) : sev === 'MEDIUM' ? 40 + (i % 20) : 15 + (i % 20);

    alerts.push({
      id: `ALT-${1000 + i}-${sev.substring(0, 4)}`,
      title: reasons[rIdx],
      severity: sev,
      status: stat,
      alert_reason: `Automated detection trigger on account USR-CUST-10${(i % 15) + 1} with score ${score}.`,
      transaction_id: `TXN-98${String((i % 75) + 1).padStart(3, '0')}-X${i % 9}`,
      risk_score: score,
      triggered_rules: sev === 'CRITICAL' ? ['RULE-001', 'RULE-004'] : sev === 'HIGH' ? ['RULE-002'] : ['RULE-005'],
      created_at: new Date(Date.now() - 1000 * 60 * ((i - 1) * 45 + 10)).toISOString(),
      assigned_to: stat !== 'OPEN' ? 'analyst@fraudshield.io' : undefined,
    });
  }
  return alerts;
}

export const MOCK_ALERTS: Alert[] = generateMockAlerts();

// Helper generator for rich mock cases
function generateMockCases(): Case[] {
  const cases: Case[] = [];
  const severities: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[] = ['CRITICAL', 'HIGH', 'HIGH', 'MEDIUM', 'LOW'];
  const statuses: ('OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED')[] = ['OPEN', 'INVESTIGATING', 'OPEN', 'RESOLVED', 'CLOSED'];

  const titles = [
    'Coordinated Account Takeover Attack Ring',
    'Crypto Off-Ramping Anomaly Cluster',
    'Synthetic Identity Generation Syndicate',
    'Card-Not-Present Refund Fraud Wave',
    'Merchant Collusion & Chargeback Exploitation',
    'Automated Bot Credential Stuffing Campaign',
  ];

  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(3, '0');
    const sev = severities[i % severities.length];
    const stat = statuses[i % statuses.length];
    const title = titles[(i - 1) % titles.length];
    const score = sev === 'CRITICAL' ? 85 + (i % 13) : sev === 'HIGH' ? 68 + (i % 17) : 45 + (i % 20);

    cases.push({
      id: `CASE-2026-${pad}`,
      case_id: `CASE-2026-${pad}`,
      title: `${title} #${i}`,
      description: `Comprehensive multi-entity investigation analyzing linked transaction vectors across accounts.`,
      status: stat,
      severity: sev,
      assigned_analyst: 'analyst@fraudshield.io',
      assigned_to: 'analyst@fraudshield.io',
      risk_score: score,
      related_transaction_ids: [`TXN-98${String((i % 75) + 1).padStart(3, '0')}-X1`],
      related_alert_ids: [`ALT-${1000 + i}-${sev.substring(0, 4)}`],
      alerts_count: 2 + (i % 5),
      transactions_count: 3 + (i % 8),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * (i * 8)).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * (i * 2)).toISOString(),
    });
  }
  return cases;
}

export const MOCK_CASES: Case[] = generateMockCases();

function generateMockRiskProfiles(): UserRiskProfile[] {
  const users = [
    { id: 'USR-CUST-1001', name: 'John Doe', city: 'London', country: 'GB', dev: 'DEV-MACBOOK-01', risk: 'CRITICAL', score: 84 },
    { id: 'USR-CUST-1002', name: 'Sarah Connor', city: 'Singapore', country: 'SG', dev: 'DEV-IPHONE-02', risk: 'HIGH', score: 72 },
    { id: 'USR-CUST-1003', name: 'Alice Smith', city: 'Cupertino', country: 'US', dev: 'DEV-IPHONE-15', risk: 'LOW', score: 12 },
    { id: 'USR-CUST-1004', name: 'Elena Rostova', city: 'Amsterdam', country: 'NL', dev: 'DEV-ANDROID-09', risk: 'LOW', score: 18 },
    { id: 'USR-CUST-1005', name: 'Marcus Vance', city: 'London', country: 'GB', dev: 'DEV-IPHONE-08', risk: 'LOW', score: 8 },
    { id: 'USR-CUST-1006', name: 'Tariq Al-Mansoor', city: 'Chicago', country: 'US', dev: 'DEV-WINDOWS-04', risk: 'MEDIUM', score: 48 },
    { id: 'USR-CUST-1007', name: 'David Kim', city: 'Seoul', country: 'KR', dev: 'DEV-GALAXY-24', risk: 'LOW', score: 16 },
    { id: 'USR-CUST-1008', name: 'Claire Dubois', city: 'Paris', country: 'FR', dev: 'DEV-MACBOOK-02', risk: 'MEDIUM', score: 42 },
    { id: 'USR-CUST-1009', name: 'Alejandro Gomez', city: 'Madrid', country: 'ES', dev: 'DEV-ANDROID-11', risk: 'HIGH', score: 68 },
    { id: 'USR-CUST-1010', name: 'Hanna Lindqvist', city: 'Stockholm', country: 'SE', dev: 'DEV-IPHONE-14', risk: 'LOW', score: 10 },
    { id: 'USR-CUST-1011', name: 'Liam O\'Connor', city: 'Dublin', country: 'IE', dev: 'DEV-WINDOWS-07', risk: 'MEDIUM', score: 38 },
    { id: 'USR-CUST-1012', name: 'Sophia Chen', city: 'Toronto', country: 'CA', dev: 'DEV-MACBOOK-04', risk: 'LOW', score: 14 },
    { id: 'USR-CUST-1013', name: 'Mateo Rossi', city: 'Milan', country: 'IT', dev: 'DEV-IPHONE-13', risk: 'CRITICAL', score: 88 },
    { id: 'USR-CUST-1014', name: 'Ananya Patel', city: 'Mumbai', country: 'IN', dev: 'DEV-ONEPLUS-11', risk: 'LOW', score: 22 },
    { id: 'USR-CUST-1015', name: 'Lucas Silva', city: 'Sao Paulo', country: 'BR', dev: 'DEV-ANDROID-12', risk: 'MEDIUM', score: 46 },
  ];

  return users.map((u, i) => ({
    user_id: u.id,
    user_name: u.name,
    profile_state: i < 3 ? 'ESTABLISHED' : i < 10 ? 'LIMITED_HISTORY' : 'NEW_ENTITY',
    total_transactions: 25 + (i * 7),
    successful_transactions: 23 + (i * 7) - (u.risk === 'CRITICAL' ? 4 : u.risk === 'HIGH' ? 2 : 0),
    failed_transactions: u.risk === 'CRITICAL' ? 4 : u.risk === 'HIGH' ? 2 : 0,
    total_volume: 3200 + (i * 850),
    avg_amount: 95 + (i * 20),
    median_amount: 80 + (i * 15),
    min_amount: 10 + (i * 2),
    max_amount: u.risk === 'CRITICAL' ? 4800 : u.risk === 'HIGH' ? 2200 : 450,
    std_dev_amount: 35 + (i * 5),
    failure_rate: u.risk === 'CRITICAL' ? 0.08 : u.risk === 'HIGH' ? 0.04 : 0.01,
    typical_hours: [9, 13, 17, 20],
    top_locations: [{ city: u.city, country: u.country, count: 25 + (i * 7) }],
    distinct_devices_count: u.risk === 'CRITICAL' ? 3 : 1,
    distinct_devices: [u.dev],
    distinct_merchants_count: 5 + (i % 6),
    distinct_merchants: ['Amazon Web Retail', 'Apple Store Online', 'Uber BV Amsterdam'],
    contextual_signals: u.risk === 'CRITICAL' ? [
      { code: 'VELOCITY_SPIKE', severity: 'CRITICAL', description: 'Multiple rapid high-value transactions detected within short window', evidence: 'rolling_window_txns: 4' }
    ] : [],
    risk_level: u.risk as any,
    last_known_risk_score: u.score,
    updated_at: new Date().toISOString(),
  }));
}

export const MOCK_RISK_PROFILES: UserRiskProfile[] = generateMockRiskProfiles();

export const MOCK_RULES: FraudRule[] = [
  {
    id: 'RULE-001',
    name: 'High Velocity Spike Detection',
    description: 'Flags more than 3 transactions occurring within a 2-minute rolling window.',
    category: 'VELOCITY',
    severity: 'CRITICAL',
    weight: 35,
    priority: 1,
    is_active: true,
    condition_config: { velocity_count_2m: '> 3' },
    version: '1.2.0',
    created_by: 'admin@fraudshield.io',
    updated_by: 'admin@fraudshield.io',
  },
  {
    id: 'RULE-002',
    name: 'Crypto High Risk Merchant Outflow',
    description: 'Applies elevated risk weighting for transactions routed through crypto exchanges without verified device profile.',
    category: 'MERCHANT',
    severity: 'HIGH',
    weight: 25,
    priority: 2,
    is_active: true,
    condition_config: { merchant_category: 'Crypto & Exchange' },
    version: '1.0.0',
    created_by: 'admin@fraudshield.io',
    updated_by: 'admin@fraudshield.io',
  },
  {
    id: 'RULE-003',
    name: 'Cross-Border Geo-Hop Impossibility',
    description: 'Triggers when transaction originates from a location requiring impossible travel speed from previous session.',
    category: 'GEOGRAPHY',
    severity: 'CRITICAL',
    weight: 45,
    priority: 1,
    is_active: true,
    condition_config: { geo_speed_kmh: '> 850' },
    version: '2.1.0',
    created_by: 'admin@fraudshield.io',
    updated_by: 'admin@fraudshield.io',
  }
];

export const MOCK_SYSTEM_SETTINGS: SystemSetting[] = [
  {
    key: 'security.mfa_enforced',
    value: true,
    description: 'Requires TOTP MFA token on all administrative and analyst logins',
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString()
  },
  {
    key: 'pipeline.auto_decline_threshold',
    value: 80,
    description: 'Composite risk score threshold above which transactions are immediately blocked',
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString()
  },
  {
    key: 'pipeline.manual_review_threshold',
    value: 50,
    description: 'Risk score boundary for escalating transactions to the analyst triage queue',
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString()
  },
  {
    key: 'model.drift_detection_p_value',
    value: 0.05,
    description: 'Statistical significance limit for flagging data drift and triggering retraining recommendations',
    updated_by: 'admin@fraudshield.io',
    updated_at: new Date().toISOString()
  }
];

export const MOCK_ANALYTICS_OVERVIEW: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  generated_at: new Date().toISOString(),
  kpis: {
    total_transactions: 12480,
    total_volume_usd_equiv: 2450800,
    currencies: [
      { currency: 'USD', total_volume: 1850000, flagged_volume: 72000, transaction_count: 8500 },
      { currency: 'EUR', total_volume: 420000, flagged_volume: 18000, transaction_count: 2400 },
      { currency: 'GBP', total_volume: 180800, flagged_volume: 8500, transaction_count: 1580 },
    ],
    high_risk_transactions: 342,
    critical_risk_transactions: 118,
    suspicious_transactions: 460,
    flagged_amount_usd_equiv: 98500,
    anomaly_count: 512,
    anomaly_rate: 0.041,
    active_alerts: 14,
    critical_alerts: 4,
    open_cases: 6,
    high_risk_users: 8,
  }
};

export const MOCK_TRANSACTION_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  total_transactions: 12480,
  volume_trend: [
    { time: 'Week 1', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(), transaction_count: 2850, flagged_count: 95, total_volume: 580000, avg_amount: 203, avg_risk_score: 24 },
    { time: 'Week 2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), transaction_count: 3120, flagged_count: 114, total_volume: 620000, avg_amount: 198, avg_risk_score: 26 },
    { time: 'Week 3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), transaction_count: 3290, flagged_count: 128, total_volume: 645000, avg_amount: 196, avg_risk_score: 25 },
    { time: 'Week 4', timestamp: new Date().toISOString(), transaction_count: 3220, flagged_count: 123, total_volume: 605800, avg_amount: 188, avg_risk_score: 23 },
  ],
  status_distribution: [
    { status: 'APPROVED', count: 12020, volume: 2352300, percentage: 96.3 },
    { status: 'FLAGGED', count: 342, volume: 68500, percentage: 2.7 },
    { status: 'DECLINED', count: 118, volume: 30000, percentage: 1.0 },
  ],
  category_distribution: [
    { category: 'Electronics & Retail', count: 4850, volume: 980000, percentage: 38.8 },
    { category: 'Crypto & Exchange', count: 1240, volume: 540000, percentage: 9.9 },
    { category: 'Food & Dining', count: 3200, volume: 240000, percentage: 25.6 },
    { category: 'Transportation', count: 2190, volume: 160800, percentage: 17.5 },
    { category: 'Other', count: 1000, volume: 530000, percentage: 8.2 },
  ],
  payment_method_distribution: [
    { payment_method: 'CREDIT_CARD', count: 7200, volume: 1420000, percentage: 57.7 },
    { payment_method: 'DEBIT_CARD', count: 3100, volume: 480800, percentage: 24.8 },
    { payment_method: 'APPLE_PAY', count: 1420, volume: 210000, percentage: 11.4 },
    { payment_method: 'CRYPTO', count: 760, volume: 340000, percentage: 6.1 },
  ],
  currencies: [
    { currency: 'USD', total_volume: 1850000, flagged_volume: 72000, transaction_count: 8500 },
    { currency: 'EUR', total_volume: 420000, flagged_volume: 18000, transaction_count: 2400 },
    { currency: 'GBP', total_volume: 180800, flagged_volume: 8500, transaction_count: 1580 },
  ]
};

export const MOCK_RISK_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  total_scored_transactions: 12480,
  average_risk_score: 24.8,
  risk_level_distribution: [
    { risk_level: 'LOW', count: 10850, percentage: 86.9, total_volume: 2100000 },
    { risk_level: 'MEDIUM', count: 1170, percentage: 9.4, total_volume: 252300 },
    { risk_level: 'HIGH', count: 342, percentage: 2.7, total_volume: 68500 },
    { risk_level: 'CRITICAL', count: 118, percentage: 1.0, total_volume: 30000 },
  ],
  risk_histogram: [
    { bucket: '0-20', min_score: 0, max_score: 20, count: 8900, percentage: 71.3 },
    { bucket: '21-40', min_score: 21, max_score: 40, count: 2120, percentage: 17.0 },
    { bucket: '41-60', min_score: 41, max_score: 60, count: 1000, percentage: 8.0 },
    { bucket: '61-80', min_score: 61, max_score: 80, count: 342, percentage: 2.7 },
    { bucket: '81-100', min_score: 81, max_score: 100, count: 118, percentage: 1.0 },
  ],
  risk_trend: [
    { time: 'Day 1-7', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(), avg_risk_score: 23.4, high_risk_count: 82, critical_risk_count: 24 },
    { time: 'Day 8-14', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), avg_risk_score: 25.1, high_risk_count: 94, critical_risk_count: 32 },
    { time: 'Day 15-21', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), avg_risk_score: 24.6, high_risk_count: 88, critical_risk_count: 30 },
    { time: 'Day 22-30', timestamp: new Date().toISOString(), avg_risk_score: 25.8, high_risk_count: 78, critical_risk_count: 32 },
  ]
};

export const MOCK_ALERT_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  total_alerts: 84,
  active_alerts: 14,
  critical_alerts: 4,
  alert_trend: [
    { time: 'W1', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(), total_alerts: 18, critical_alerts: 4, resolved_alerts: 16 },
    { time: 'W2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), total_alerts: 24, critical_alerts: 6, resolved_alerts: 22 },
    { time: 'W3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), total_alerts: 22, critical_alerts: 5, resolved_alerts: 20 },
    { time: 'W4', timestamp: new Date().toISOString(), total_alerts: 20, critical_alerts: 4, resolved_alerts: 12 },
  ],
  severity_distribution: [
    { label: 'CRITICAL', count: 19, percentage: 22.6 },
    { label: 'HIGH', count: 35, percentage: 41.7 },
    { label: 'MEDIUM', count: 24, percentage: 28.6 },
    { label: 'LOW', count: 6, percentage: 7.1 },
  ],
  status_distribution: [
    { label: 'RESOLVED', count: 70, percentage: 83.3 },
    { label: 'OPEN', count: 8, percentage: 9.5 },
    { label: 'INVESTIGATING', count: 6, percentage: 7.2 },
  ],
  top_alert_reasons: [
    { label: 'Velocity Spike Exceeded Limit', count: 38, percentage: 45.2 },
    { label: 'ML High Confidence Anomaly', count: 26, percentage: 31.0 },
    { label: 'Crypto High Risk Gateway', count: 12, percentage: 14.3 },
    { label: 'Cross-Border Geo Hop', count: 8, percentage: 9.5 },
  ],
  response_metrics: {
    total_resolved: 70,
    avg_resolution_time_minutes: 14.2,
    median_resolution_time_minutes: 9.5,
    total_active: 14,
  }
};

export const MOCK_ML_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  total_predictions: 12480,
  anomaly_count: 512,
  anomaly_rate: 0.041,
  avg_anomaly_score: 0.18,
  score_histogram: [
    { bucket: '0.0-0.2', min_score: 0.0, max_score: 0.2, count: 9800, percentage: 78.5 },
    { bucket: '0.2-0.4', min_score: 0.2, max_score: 0.4, count: 1650, percentage: 13.2 },
    { bucket: '0.4-0.6', min_score: 0.4, max_score: 0.6, count: 518, percentage: 4.2 },
    { bucket: '0.6-0.8', min_score: 0.6, max_score: 0.8, count: 320, percentage: 2.6 },
    { bucket: '0.8-1.0', min_score: 0.8, max_score: 1.0, count: 192, percentage: 1.5 },
  ],
  model_versions: [
    { model_version: 'v1.0.0', prediction_count: 12480, anomaly_count: 512, avg_anomaly_score: 0.18, anomaly_rate: 0.041 }
  ]
};

export const MOCK_RULE_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  total_rules: 3,
  total_executions: 37440,
  total_triggers: 642,
  overall_trigger_rate: 0.017,
  top_rules: [
    { rule_id: 'RULE-001', rule_name: 'Velocity Spike Detection', category: 'VELOCITY', severity: 'CRITICAL', trigger_count: 342, execution_count: 12480, trigger_rate: 0.027 },
    { rule_id: 'RULE-002', rule_name: 'Crypto High Risk Outflow', category: 'MERCHANT', severity: 'HIGH', trigger_count: 218, execution_count: 12480, trigger_rate: 0.017 },
    { rule_id: 'RULE-003', rule_name: 'Cross-Border Geo-Hop', category: 'GEOGRAPHY', severity: 'CRITICAL', trigger_count: 82, execution_count: 12480, trigger_rate: 0.006 },
  ]
};

export const MOCK_CASE_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  total_cases: 12,
  open_cases: 6,
  investigating_cases: 4,
  resolved_cases: 2,
  closed_cases: 0,
  case_trend: [
    { time: 'W1', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(), total_cases: 3, critical_cases: 1, resolved_cases: 1 },
    { time: 'W2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), total_cases: 4, critical_cases: 2, resolved_cases: 1 },
    { time: 'W3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), total_cases: 3, critical_cases: 1, resolved_cases: 0 },
    { time: 'W4', timestamp: new Date().toISOString(), total_cases: 2, critical_cases: 1, resolved_cases: 0 },
  ],
  status_distribution: [
    { label: 'OPEN', count: 6, percentage: 50 },
    { label: 'INVESTIGATING', count: 4, percentage: 33.3 },
    { label: 'RESOLVED', count: 2, percentage: 16.7 },
  ],
  severity_distribution: [
    { label: 'CRITICAL', count: 5, percentage: 41.7 },
    { label: 'HIGH', count: 5, percentage: 41.7 },
    { label: 'MEDIUM', count: 2, percentage: 16.6 },
  ],
  resolution_distribution: [
    { label: 'FRAUD_CONFIRMED', count: 2, percentage: 100 },
  ],
  analyst_workload: [
    { analyst_email: 'analyst@fraudshield.io', active_cases: 10, resolved_cases: 2, avg_resolution_hours: 4.8 }
  ]
};

export const MOCK_GEO_ANALYTICS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  countries: [
    { country: 'United States', transaction_count: 6800, total_volume: 1350000, high_risk_count: 140, high_risk_percentage: 2.1 },
    { country: 'United Kingdom', transaction_count: 2450, total_volume: 480000, high_risk_count: 85, high_risk_percentage: 3.5 },
    { country: 'Singapore', transaction_count: 1420, total_volume: 340000, high_risk_count: 112, high_risk_percentage: 7.9 },
    { country: 'Netherlands', transaction_count: 1100, total_volume: 180000, high_risk_count: 24, high_risk_percentage: 2.2 },
    { country: 'Germany', transaction_count: 710, total_volume: 100800, high_risk_count: 15, high_risk_percentage: 2.1 },
  ],
  cities: [
    { city: 'London', country: 'United Kingdom', transaction_count: 2100, high_risk_count: 75 },
    { city: 'New York', country: 'United States', transaction_count: 1950, high_risk_count: 42 },
    { city: 'Singapore', country: 'Singapore', transaction_count: 1420, high_risk_count: 112 },
    { city: 'Amsterdam', country: 'Netherlands', transaction_count: 1100, high_risk_count: 24 },
    { city: 'San Francisco', country: 'United States', transaction_count: 980, high_risk_count: 18 },
  ]
};

export const MOCK_ENTITY_PATTERNS: any = {
  time_range: '30d',
  date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  date_to: new Date().toISOString(),
  merchants: [
    { merchant_name: 'Amazon Web Retail', merchant_category: 'Electronics & Retail', transaction_count: 4850, total_volume: 980000, high_risk_count: 82, high_risk_rate: 1.7 },
    { merchant_name: 'Binance Global Exchange', merchant_category: 'Crypto & Exchange', transaction_count: 1240, total_volume: 540000, high_risk_count: 185, high_risk_rate: 14.9 },
    { merchant_name: 'Apple Store Online', merchant_category: 'Electronics & Devices', transaction_count: 1420, total_volume: 210000, high_risk_count: 12, high_risk_rate: 0.8 },
  ],
  devices: [
    { device_id: 'DEV-IPHONE-02', distinct_users: 2, transaction_count: 112, avg_risk_score: 85, is_shared: true },
    { device_id: 'DEV-MACBOOK-01', distinct_users: 1, transaction_count: 48, avg_risk_score: 78, is_shared: false },
    { device_id: 'DEV-IPHONE-15', distinct_users: 1, transaction_count: 65, avg_risk_score: 14, is_shared: false },
  ]
};

export function extractSafeArray<T>(data: any, fallback: T[] = []): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.results)) return data.results;
  return fallback;
}
