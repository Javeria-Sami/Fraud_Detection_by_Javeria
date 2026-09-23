"""
Standalone Development Transaction Simulator CLI.
Section 05 — Transaction Simulator Tooling.

Usage:
    python -m simulator.simulator_cli --count 100 --scenario mixed_risk --delay 0.05
"""
import sys
import os
import time
import asyncio
import argparse
from typing import Optional

# Ensure project root is in pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import AsyncSessionLocal
from backend.app.engine.pipeline import IngestionPipeline
from simulator.transaction_generator import generate_live_transaction

async def run_simulation(count: int, scenario: str, delay: float, anomaly_prob: float):
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production":
        print("[!] ERROR: Simulator cannot run in production environment (ENVIRONMENT=production). Aborting.")
        sys.exit(1)

    print(f"[*] Starting Transaction Ingestion Simulation...")
    print(f"[*] Target Count: {count} | Scenario: {scenario} | Delay: {delay}s | Anomaly Probability: {anomaly_prob}")
    print("-" * 70)

    start_time = time.time()
    success_count = 0
    error_count = 0

    async with AsyncSessionLocal() as session:
        for i in range(1, count + 1):
            txn_dict = generate_live_transaction(scenario=scenario, anomaly_probability=anomaly_prob)
            try:
                txn, alert = await IngestionPipeline.process_transaction(session, txn_dict)
                success_count += 1
                alert_flag = f"[ALERT: {alert.severity}]" if alert else ""
                print(f"[{i:04d}/{count:04d}] Ingested {txn.id} | Amount: ${txn.amount:8.2f} | Risk: {txn.risk_score:5.1f} ({txn.risk_level:8s}) | Status: {txn.status:10s} {alert_flag}")
            except Exception as e:
                error_count += 1
                print(f"[{i:04d}/{count:04d}] ERROR ingesting {txn_dict.get('transaction_id')}: {e}")

            if delay > 0 and i < count:
                await asyncio.sleep(delay)

    total_time = time.time() - start_time
    avg_latency = (total_time / count) * 1000 if count > 0 else 0
    throughput = count / total_time if total_time > 0 else 0

    print("-" * 70)
    print(f"[*] Simulation Complete:")
    print(f"    - Ingested: {success_count}/{count} ({success_count/count*100:.1f}%)")
    print(f"    - Errors: {error_count}")
    print(f"    - Total Time: {total_time:.2f} seconds")
    print(f"    - Avg Latency: {avg_latency:.2f} ms/txn")
    print(f"    - Throughput: {throughput:.2f} txns/sec")

def main():
    parser = argparse.ArgumentParser(description="Real-Time Fraud Platform Transaction Ingestion Simulator")
    parser.add_argument("--count", type=int, default=50, help="Number of synthetic transactions to ingest (default: 50)")
    parser.add_argument("--scenario", type=str, default="mixed_risk", choices=[
        "normal", "fraud_spike", "high_amount", "rapid_burst", "geo_hop", "new_device", "crypto_drain", "mixed_risk"
    ], help="Transaction risk/attack scenario profile")
    parser.add_argument("--delay", type=float, default=0.01, help="Delay between transactions in seconds (default: 0.01)")
    parser.add_argument("--anomaly-prob", type=float, default=0.2, help="Probability of anomaly in mixed_risk (default: 0.2)")

    args = parser.parse_args()
    asyncio.run(run_simulation(
        count=args.count,
        scenario=args.scenario,
        delay=args.delay,
        anomaly_prob=args.anomaly_prob
    ))

if __name__ == "__main__":
    main()
