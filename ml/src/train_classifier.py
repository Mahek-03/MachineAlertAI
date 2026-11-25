"""
Model Training & Evaluation Pipeline for Machine Failure Classification.
Trains and compares Logistic Regression, Random Forest, Gradient Boosting, and XGBoost.
Evaluates Precision, Recall, F1, ROC-AUC, and PR-AUC.
Determines optimal decision threshold and exports artifacts & plots.
"""
import json
import os
import shutil
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
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
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler

from features import engineer_features, get_feature_names

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
PLOTS_DIR = os.path.join(ARTIFACTS_DIR, "plots")
BACKEND_ARTIFACTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "backend", "app", "artifacts")


def load_data():
    """Load and prepare train, val, and test splits with feature scaling."""
    from preprocess import split_and_scale_data

    split_and_scale_data()

    train_df = pd.read_csv(os.path.join(BASE_DIR, "data", "processed", "train.csv"))
    val_df = pd.read_csv(os.path.join(BASE_DIR, "data", "processed", "val.csv"))
    test_df = pd.read_csv(os.path.join(BASE_DIR, "data", "processed", "test.csv"))

    feature_cols = get_feature_names()
    scaler_bundle = joblib.load(os.path.join(ARTIFACTS_DIR, "scaler.joblib"))
    scaler: StandardScaler = scaler_bundle["scaler"]

    X_train = scaler.transform(train_df[feature_cols])
    y_train = train_df["Machine failure"].values

    X_val = scaler.transform(val_df[feature_cols])
    y_val = val_df["Machine failure"].values

    X_test = scaler.transform(test_df[feature_cols])
    y_test = test_df["Machine failure"].values

    return X_train, y_train, X_val, y_val, X_test, y_test, feature_cols, scaler


def train_models():
    """Train multiple models and select the best one based on PR-AUC and Recall."""
    os.makedirs(PLOTS_DIR, exist_ok=True)
    os.makedirs(BACKEND_ARTIFACTS_DIR, exist_ok=True)

    X_train, y_train, X_val, y_val, X_test, y_test, feature_cols, scaler = load_data()

    candidates = {
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
        "Random Forest": RandomForestClassifier(
            n_estimators=150, max_depth=12, min_samples_split=4, class_weight="balanced_subsample", random_state=42
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=150, learning_rate=0.08, max_depth=5, random_state=42
        ),
    }

    try:
        from xgboost import XGBClassifier
        pos_weight = float((len(y_train) - sum(y_train)) / max(1, sum(y_train)))
        candidates["XGBoost"] = XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            scale_pos_weight=pos_weight,
            eval_metric="logloss",
            random_state=42,
        )
    except Exception as e:
        print(f"[INFO] XGBoost not available, using Gradient Boosting: {e}")

    results = {}
    best_name = None
    best_pr_auc = -1.0
    best_model = None

    print("\n--- Model Training & Validation Evaluation ---")
    for name, clf in candidates.items():
        clf.fit(X_train, y_train)
        val_probs = clf.predict_proba(X_val)[:, 1] if hasattr(clf, "predict_proba") else clf.decision_function(X_val)

        val_roc = roc_auc_score(y_val, val_probs)
        precision_arr, recall_arr, _ = precision_recall_curve(y_val, val_probs)
        val_pr_auc = auc(recall_arr, precision_arr)

        # Baseline threshold 0.5
        val_preds = (val_probs >= 0.5).astype(int)
        val_recall = recall_score(y_val, val_preds, zero_division=0)
        val_prec = precision_score(y_val, val_preds, zero_division=0)
        val_f1 = f1_score(y_val, val_preds, zero_division=0)

        results[name] = {
            "val_roc_auc": float(val_roc),
            "val_pr_auc": float(val_pr_auc),
            "val_recall": float(val_recall),
            "val_precision": float(val_prec),
            "val_f1": float(val_f1),
        }
        print(f"[{name}] ROC-AUC: {val_roc:.4f} | PR-AUC: {val_pr_auc:.4f} | Recall: {val_recall:.4f} | F1: {val_f1:.4f}")

        if val_pr_auc > best_pr_auc:
            best_pr_auc = val_pr_auc
            best_name = name
            best_model = clf

    print(f"\n[WINNER] Selected {best_name} as primary production model (PR-AUC: {best_pr_auc:.4f}).")

    # Tune decision threshold on validation set using PR curve
    val_probs = best_model.predict_proba(X_val)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_val, val_probs)

    # Balance recall >= 0.80 and highest F2/F1
    best_threshold = 0.40
    best_f2 = 0.0
    for p, r, t in zip(precisions[:-1], recalls[:-1], thresholds):
        if r >= 0.75:
            f2 = (5.0 * p * r) / (4.0 * p + r + 1e-6)
            if f2 > best_f2:
                best_f2 = f2
                best_threshold = float(t)

    # Keep threshold within reasonable bound [0.25, 0.55]
    best_threshold = float(np.clip(best_threshold, 0.25, 0.55))
    print(f"[THRESHOLD] Optimal decision threshold selected: {best_threshold:.3f}")

    # Final evaluation on holdout test set
    test_probs = best_model.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= best_threshold).astype(int)

    test_roc_auc = float(roc_auc_score(y_test, test_probs))
    test_precisions, test_recalls, _ = precision_recall_curve(y_test, test_probs)
    test_pr_auc = float(auc(test_recalls, test_precisions))
    test_acc = float(accuracy_score(y_test, test_preds))
    test_rec = float(recall_score(y_test, test_preds, zero_division=0))
    test_prec = float(precision_score(y_test, test_preds, zero_division=0))
    test_f1 = float(f1_score(y_test, test_preds, zero_division=0))
    cm = confusion_matrix(y_test, test_preds).tolist()

    print("\n--- Final Test Set Evaluation ---")
    print(f"Accuracy:  {test_acc:.4f}")
    print(f"Recall:    {test_rec:.4f} (Priority metric)")
    print(f"Precision: {test_prec:.4f}")
    print(f"F1-Score:  {test_f1:.4f}")
    print(f"ROC-AUC:   {test_roc_auc:.4f}")
    print(f"PR-AUC:    {test_pr_auc:.4f}")
    print("Confusion Matrix:", cm)

    # Generate and save plots
    save_plots(best_model, X_test, y_test, test_probs, test_preds, feature_cols)

    # Export metrics.json
    metrics_data = {
        "model_name": best_name,
        "optimal_threshold": round(best_threshold, 3),
        "test_metrics": {
            "accuracy": round(test_acc, 4),
            "recall": round(test_rec, 4),
            "precision": round(test_prec, 4),
            "f1_score": round(test_f1, 4),
            "roc_auc": round(test_roc_auc, 4),
            "pr_auc": round(test_pr_auc, 4),
            "confusion_matrix": cm,
        },
        "all_model_results": results,
        "feature_names": feature_cols,
    }

    metrics_path = os.path.join(ARTIFACTS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_data, f, indent=2)
    with open(os.path.join(BACKEND_ARTIFACTS_DIR, "metrics.json"), "w") as f:
        json.dump(metrics_data, f, indent=2)

    # Save best classifier
    bundle = {
        "model": best_model,
        "model_name": best_name,
        "threshold": best_threshold,
        "feature_names": feature_cols,
    }
    joblib.dump(bundle, os.path.join(ARTIFACTS_DIR, "classifier.joblib"))
    joblib.dump(bundle, os.path.join(BACKEND_ARTIFACTS_DIR, "classifier.joblib"))
    print(f"[OK] Saved best model and metrics to artifacts directory.")

    return best_model, metrics_data


def save_plots(model, X_test, y_test, test_probs, test_preds, feature_cols):
    """Generate all diagnostic evaluation plots."""
    sns.set_theme(style="whitegrid")

    # 1. Confusion Matrix
    plt.figure(figsize=(6, 5))
    cm = confusion_matrix(y_test, test_preds)
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=["Normal (0)", "Failure (1)"],
        yticklabels=["Normal (0)", "Failure (1)"]
    )
    plt.title("Confusion Matrix (Holdout Test Set)", fontsize=13, pad=12)
    plt.ylabel("Actual Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "confusion_matrix.png"), dpi=200)
    plt.close()

    # 2. ROC Curve
    plt.figure(figsize=(6, 5))
    fpr, tpr, _ = roc_curve(y_test, test_probs)
    roc_val = roc_auc_score(y_test, test_probs)
    plt.plot(fpr, tpr, color="#2563eb", lw=2, label=f"ROC curve (AUC = {roc_val:.3f})")
    plt.plot([0, 1], [0, 1], color="#94a3b8", lw=1.5, linestyle="--")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate (Recall)")
    plt.title("Receiver Operating Characteristic (ROC)", fontsize=13, pad=12)
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "roc_curve.png"), dpi=200)
    plt.close()

    # 3. Precision-Recall Curve
    plt.figure(figsize=(6, 5))
    precisions, recalls, _ = precision_recall_curve(y_test, test_probs)
    pr_auc_val = auc(recalls, precisions)
    plt.plot(recalls, precisions, color="#059669", lw=2, label=f"PR curve (AUC = {pr_auc_val:.3f})")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Precision-Recall Curve", fontsize=13, pad=12)
    plt.legend(loc="lower left")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "pr_curve.png"), dpi=200)
    plt.close()

    # 4. Feature Importance
    if hasattr(model, "feature_importances_"):
        plt.figure(figsize=(8, 6))
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1]
        sorted_features = [feature_cols[i] for i in indices]
        sorted_imp = importances[indices]

        sns.barplot(x=sorted_imp, y=sorted_features, palette="viridis")
        plt.title("Random Forest / Gradient Boosting Feature Importances", fontsize=13, pad=12)
        plt.xlabel("Relative Importance Score")
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "feature_importance.png"), dpi=200)
        plt.close()

    # Copy plots to backend and frontend public if applicable
    for plot_file in os.listdir(PLOTS_DIR):
        src = os.path.join(PLOTS_DIR, plot_file)
        dst = os.path.join(BACKEND_ARTIFACTS_DIR, plot_file)
        shutil.copy2(src, dst)

    print(f"[OK] Generated and saved all evaluation plots to {PLOTS_DIR}.")


if __name__ == "__main__":
    train_models()
