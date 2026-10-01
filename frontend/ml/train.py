"""
ML Training & Registration Script.
Generates baseline synthetic data, fits Isolation Forest, computes evaluation metrics, and registers model.
"""
import os
import sys

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.datasets.synthetic_generator import generate_synthetic_transactions
from ml.pipelines.isolation_forest import IsolationForestPipeline

def run_training(num_train: int = 10000, num_eval: int = 2500, version: str = "v1.0.0"):
    print(f"[*] Generating {num_train} training transactions and {num_eval} evaluation transactions...")
    train_df = generate_synthetic_transactions(num_samples=num_train, anomaly_ratio=0.07, seed=42)
    eval_df = generate_synthetic_transactions(num_samples=num_eval, anomaly_ratio=0.09, seed=99)
    
    print(f"[*] Initializing Isolation Forest pipeline (contamination=0.08)...")
    pipeline = IsolationForestPipeline(contamination=0.08, random_state=42)
    
    print("[*] Fitting model and scaling features...")
    pipeline.fit(train_df, eval_df)
    
    saved_dir = os.path.join(os.path.dirname(__file__), "saved_models")
    artifact_path, meta_path = pipeline.save(saved_dir, version=version)
    
    print(f"[+] Training completed successfully for version {version}!")
    print(f"[+] Metrics: {pipeline.metrics}")
    return pipeline

if __name__ == "__main__":
    run_training()
