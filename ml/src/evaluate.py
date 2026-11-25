"""
Model Evaluation and Metric Verification Script for MachineAlert AI.
Loads trained artifacts and verifies strict performance floors on the holdout test set.
"""
import json
import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    auc,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
TEST_DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "test.csv")


def evaluate_pipeline():
    """Verify holdout test metrics against established reliability floors."""
    if not os.path.exists(TEST_DATA_PATH):
        print(f"[ERROR] Test data not found at {TEST_DATA_PATH}. Run training first.")
        sys.exit(1)

    clf_path = os.path.join(ARTIFACTS_DIR, "classifier.joblib")
    scaler_path = os.path.join(ARTIFACTS_DIR, "scaler.joblib")

    if not os.path.exists(clf_path) or not os.path.exists(scaler_path):
        print("[ERROR] Classifier or Scaler artifact missing.")
        sys.exit(1)

    clf_bundle = joblib.load(clf_path)
    scaler_bundle = joblib.load(scaler_path)

    model = clf_bundle["model"]
    feature_names = clf_bundle["feature_names"]
    threshold = clf_bundle.get("threshold", 0.40)
    scaler = scaler_bundle["scaler"]

    test_df = pd.read_csv(TEST_DATA_PATH)
    X_test_scaled = scaler.transform(test_df[feature_names])
    y_test = test_df["Machine failure"].values

    probs = model.predict_proba(X_test_scaled)[:, 1]
    preds = (probs >= threshold).astype(int)

    acc = accuracy_score(y_test, preds)
    rec = recall_score(y_test, preds, zero_division=0)
    prec = precision_score(y_test, preds, zero_division=0)
    f1 = f1_score(y_test, preds, zero_division=0)
    roc = roc_auc_score(y_test, probs)
    p_curve, r_curve, _ = precision_recall_curve(y_test, probs)
    pr_auc_val = auc(r_curve, p_curve)
    cm = confusion_matrix(y_test, preds)

    print("\n=======================================================")
    print(f" MACHINEALERT AI: HOLDOUT TEST SET VERIFICATION REPORT")
    print("=======================================================")
    print(f"Model:                {clf_bundle.get('model_name', 'Trained Classifier')}")
    print(f"Optimal Threshold:    {threshold:.3f}")
    print(f"Test Set Samples:     {len(y_test)} (Failures: {sum(y_test)})")
    print(f"Accuracy:             {acc * 100:.2f}%")
    print(f"Recall:               {rec * 100:.2f}% (Safety Critical)")
    print(f"Precision:            {prec * 100:.2f}%")
    print(f"F1-Score:             {f1:.4f}")
    print(f"ROC-AUC:              {roc:.4f}")
    print(f"PR-AUC:               {pr_auc_val:.4f}")
    print("\nConfusion Matrix:")
    print(f"  TN: {cm[0, 0]:<5} | FP: {cm[0, 1]}")
    print(f"  FN: {cm[1, 0]:<5} | TP: {cm[1, 1]}")
    print("\nFull Classification Report:")
    print(classification_report(y_test, preds, target_names=["Normal", "Failure"]))

    # Metric floor checks
    floors = {
        "Accuracy >= 94%": acc >= 0.94,
        "Recall >= 75%": rec >= 0.75,
        "PR-AUC >= 0.70": pr_auc_val >= 0.70,
        "ROC-AUC >= 0.90": roc >= 0.90,
    }

    all_passed = True
    print("\nPerformance Floor Checklist:")
    for criterion, passed in floors.items():
        status = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"  {status} {criterion}")

    if all_passed:
        print("\nAll model validation floors PASSED.")
    else:
        print("\n[WARNING] Some metric floors were not met. Check data/hyperparameters.")

    return all_passed


if __name__ == "__main__":
    passed = evaluate_pipeline()
    sys.exit(0 if passed else 1)
