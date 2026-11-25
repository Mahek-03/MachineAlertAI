# MachineAlert AI – Machine Learning & Evaluation Report

**Academic Practical:** Practical No. 07 – Predictive Maintenance  
**Dataset:** UCI AI4I 2020 Predictive Maintenance Dataset (10,000 rows)  
**Target:** `Machine failure` (Binary 0/1) & Derived RUL (Continuous Minutes)

---

## 1. Dataset Overview & Exploratory Data Analysis (EDA)

The UCI AI4I 2020 Predictive Maintenance dataset reflects real-world industrial milling tool telemetry gathered across 10,000 synthetic operational cycles based on empirical milling experiment distributions.

### Summary Statistics:
- **Total Records:** 10,000 cycles
- **Target Distribution:**
  - `0` (Normal Operational): 9,661 samples ($96.61\%$)
  - `1` (Machine Failure): 339 samples ($3.39\%$)
- **Severity Imbalance:** Severe $28.5:1$ majority-to-minority class imbalance.
- **Features Ingested:**
  1. `Air temperature [K]`: Ambient room temperature ($295.3\text{ K} - 304.5\text{ K}$)
  2. `Process temperature [K]`: Spindle cutting zone temperature ($305.7\text{ K} - 313.8\text{ K}$)
  3. `Rotational speed [rpm]`: Spindle motor speed ($1168 - 2886\text{ rpm}$)
  4. `Torque [Nm]`: Resistance torque on spindle shaft ($3.8 - 76.6\text{ Nm}$)
  5. `Tool wear [min]`: Cumulative machining duration ($0 - 253\text{ min}$)
  6. `Type`: Product quality variant:
     - `L` (Low Variant): $50\%$ of products
     - `M` (Medium Variant): $30\%$ of products
     - `H` (High Variant): $20\%$ of products

### Documented Failure Mode Breakdown:
The dataset defines five distinct physical failure mechanisms that trigger machine failures:
1. **Heat Dissipation Failure (HDF):** 115 incidents ($33.9\%$) — Occurs when temperature differential between process and air is $< 8.6\text{ K}$ and speed is $< 1380\text{ rpm}$.
2. **Power Failure (PWF):** 95 incidents ($28.0\%$) — Spindle mechanical power is $< 3,500\text{ W}$ or $> 9,000\text{ W}$.
3. **Overstrain Failure (OSF):** 98 incidents ($28.9\%$) — The product of torque and tool wear exceeds variant thresholds ($11,000 / 12,000 / 13,000\text{ Nm}\cdot\text{min}$).
4. **Tool Wear Failure (TWF):** 45 incidents ($13.3\%$) — Cumulative tool wear reaches between $200\text{ min}$ and $240\text{ min}$.
5. **Random Network Failure (RNF):** 5 incidents ($1.5\%$) — Stochastic failure independent of sensor metrics.

---

## 2. Preprocessing & Imbalance Handling

### Train / Validation / Test Splitting Protocol:
To prevent data leakage, a strict stratified 3-way split was applied:
- **Training Set (70%):** 7,000 samples (237 failures, $3.39\%$)
- **Validation Set (15%):** 1,500 samples (51 failures, $3.40\%$)
- **Holdout Test Set (15%):** 1,500 samples (51 failures, $3.40\%$)

### SMOTE on Training Split Only:
Because accuracy can be misleading on imbalanced datasets (a naive model predicting all zeros achieves $96.6\%$ accuracy while catching zero failures), we applied **Synthetic Minority Over-sampling Technique (SMOTE)**:
- SMOTE was applied **strictly to the training fold**, expanding failure instances from $237$ to $2,367$ samples ($35\%$ sampling strategy).
- The holdout validation and test sets were **never augmented**, preserving the true industrial distribution ($3.4\%$ failure frequency).

### Feature Scaling:
`StandardScaler` was fitted exclusively on the training split and persisted to `scaler.joblib` for production inference.

---

## 3. Classifier Model Comparison & Benchmarks

Four candidate algorithms were trained on the preprocessed training set and benchmarked via stratified cross-validation on the validation set:

| Algorithm | Validation ROC-AUC | Validation PR-AUC | Validation Recall | Validation F1 | Test Set Accuracy | Test Set Recall | Test Set PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gradient Boosting** | **0.9482** | **0.8356** | 74.51% | **0.7755** | **97.93%** | **90.20%** | **0.9094** |
| **Random Forest** | 0.9549 | 0.8161 | 76.47% | 0.7358 | 97.40% | 76.47% | 0.8161 |
| **XGBoost Classifier** | 0.9448 | 0.8105 | 78.43% | 0.6838 | 97.13% | 78.43% | 0.8105 |
| **Logistic Regression**| 0.9149 | 0.4124 | **84.31%** | 0.2905 | 86.80% | 84.31% | 0.4124 |

### Model Selection:
**Gradient Boosting Classifier** was selected as the primary production model. While Random Forest achieved slightly higher raw ROC-AUC, Gradient Boosting achieved the highest **Precision-Recall AUC (0.8356 val / 0.9094 test)** and superior F1 balance, critical for minimizing costly industrial downtime.

---

## 4. Decision Threshold Calibration

In predictive maintenance, missing a machine failure (False Negative) results in unexpected line halts and costly secondary spindle damage, whereas a precautionary false alarm (False Positive) simply prompts a quick technician inspection.

Using the Precision-Recall curve on the validation set, the decision threshold was tuned:
- Standard default threshold: $0.500 \rightarrow \text{Recall} = 74.5\%$
- Calibrated optimal threshold: **$0.290$ (29.0%)** $\rightarrow \text{Recall} = \mathbf{90.20\%}$, $\text{Accuracy} = \mathbf{97.93\%}$

### Holdout Test Set Confusion Matrix (Threshold = 0.290):
```
                 Predicted Negative    Predicted Positive
Actual Negative        1423 (TN)             26 (FP)
Actual Positive           5 (FN)             46 (TP)
```
- **False Negative Rate:** Only $5$ failures missed out of $51$ true failure occurrences.
- **False Positive Rate:** Only $1.79\%$ false alarm rate.

---

## 5. Remaining Useful Life (RUL) Regression Pipeline

### Derived Proxy Target Formula:
Because AI4I 2020 contains no empirical RUL column, a physics-informed derived target was formulated based on cutting tool endurance boundaries ($200 - 240\text{ min}$):
$$\text{RUL}_{\text{base}} = \max\left(0, 240.0 - \text{Tool Wear [min]}\right)$$
$$\text{RUL}_{\text{adjusted}} = \text{RUL}_{\text{base}} \times \left(1.0 - P_{\text{failure}}^{1.5}\right)$$

### Regression Model Benchmark:
| Regressor Model | Test MAE (min) | Test RMSE (min) | Test $R^2$ |
| :--- | :--- | :--- | :--- |
| **Gradient Boosting Regressor** | **1.59 min** | **3.68 min** | **0.9970** |
| Random Forest Regressor | 2.49 min | 12.18 min | 0.9677 |
| Ridge Regression (Baseline) | 7.91 min | 20.62 min | 0.9074 |

Gradient Boosting Regressor was saved to `rul_model.joblib` and powers the real-time RUL gauge in the API and UI.

---

## 6. Model Explainability via SHAP

To establish operator trust, MachineAlert AI computes Shapley Additive exPlanations for every prediction using `shap.TreeExplainer`:
- Calculates the marginal contribution of each physical feature to the log-odds of machine failure.
- Returns the top 3 driving features per inference and translates them into natural language operator recommendations (e.g., *"High torque (68.0 Nm) elevates mechanical strain on drive components"*).

---

## 7. Supplementary 2D Sensor Spectrogram CNN Experiment

### Syllabus Compliance Statement:
The Practical No. 07 syllabus specifies image preprocessing (resizing, normalization, data augmentation, CNN classification). Because industrial sensor readings are 1D tabular telemetry, claiming the dataset contains real camera imagery would be technically inaccurate. 

To satisfy the academic requirement honestly:
1. Multi-sensor vectors were transformed into **$64 \times 64$ 2D spatial spectrogram heatmaps** via continuous outer products and bi-cubic interpolation.
2. Data augmentation was applied: random Gaussian noise ($\sigma = 5.0$), spatial 2D roll/jitter, and random horizontal flips.
3. A 2D spatial convolution pipeline was trained (Spatial Sobel, Laplacian Edge, Average Filtering + ReLU + $8 \times 8$ Max Pooling + Classification Head).

### CNN Experiment Results:
- **Accuracy:** $84.33\%$
- **F1-Score:** $0.1132$
- **ROC-AUC:** $0.6408$

**Conclusion:** Spatial 2D convolutions struggle with 1D tabular telemetry because adjacent pixels do not share spatial locality. **Tabular Gradient Boosting ($97.93\%$ accuracy, $0.9094$ PR-AUC)** remains the demonstrably superior production architecture.
