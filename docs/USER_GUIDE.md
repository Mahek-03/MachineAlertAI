# MachineAlert AI – Operator & Maintenance User Guide

Welcome to the **MachineAlert AI** platform. This guide instructs plant supervisors, reliability engineers, and CNC maintenance technicians on operating the predictive maintenance dashboard.

---

## 1. Navigating the Operational Dashboard

Access the main dashboard at `/dashboard`.

- **KPI Header Cards:**
  - **Total Assets:** Real-time count of connected machines across plant bays.
  - **Normal Status:** Units operating safely below $30\%$ failure probability.
  - **Medium Risk:** Precursor alert band ($30\% - 60\%$) requiring inspection.
  - **Critical / High:** Urgent threshold ($\ge 60\%$) demanding immediate attention.
  - **Open Alerts:** Active unresolved incident tickets.
  - **Fleet Avg Risk:** Aggregate equipment stress level across the shop floor.
- **Risk Donut Chart:** Visual breakdown of fleet health distribution.
- **Priority Alerts Feed:** Immediate display of high-risk machines with one-click **"Acknowledge"** and **"Inspect"** actions.
- **Fleet Table:** Quick sorting by Asset ID, Location, Operating Status, Failure Probability, and Risk Level.

---

## 2. Interactive Demonstrations & Telemetry Simulation

To evaluate the system during demonstrations:
1. **Live Background Stream:** Click the **"Simulate Telemetry"** button in the top navigation bar. The system activates an asynchronous background worker that injects real-time sensor cycles with gradual tool wear drift every $3.5$ seconds.
2. **Inject Demo Fault:** Click **"Inject Demo Fault"** in the top bar. This instantaneously injects an acute failure condition into `MCH-0002` (Heavy Duty CNC Lathe), triggering an immediate High Risk alert and directing you to the alert feed.

---

## 3. Deep-Dive Machine Asset Telemetry

Click **"Details →"** or **"Telemetry"** on any machine row to open `/machines/:id`:
- **Real-Time Gauges:** Inspect physical channels with safe and critical limits:
  - Ambient Air Temperature ($K$)
  - Process Machining Temperature ($K$)
  - Spindle Rotational Speed ($rpm$)
  - Cutting Torque ($Nm$)
  - Accumulated Tool Wear ($min$)
- **Remaining Useful Life (RUL) Bar:** Visual gauge displaying remaining tool minutes before mandatory replacement or failure.
- **Historical Telemetry Trends:** Toggle between **Risk & RUL**, **Thermals**, and **Torque & Wear** to evaluate rates of change.
- **Step-over-Step Delta Card:** Displays exact metric differences between the latest sensor cycle and the preceding cycle.

---

## 4. What-If Simulator & Batch CSV Scoring

Open `/predict`:
1. **Interactive Sliders:** Adjust temperatures, spindle speed, torque, and tool wear to observe real-time model probability changes.
2. **Presets:** Click one-click failure presets:
   - *Heat Dissipation (HDF):* Low thermal differential ($\Delta T = 5.3\text{ K}$) at low RPM.
   - *Tool Wear (TWF):* Wear exceeds $200\text{ min}$.
   - *Power Failure (PWF):* High torque & speed yielding $> 9,000\text{ W}$.
   - *Overstrain (OSF):* High torque-wear product on Type L variant.
   - *Nominal Normal:* Safe baseline operation.
3. **Batch CSV Scorer:** Scroll to the bottom to upload a multi-machine telemetry CSV file. Click **"Download Sample CSV"** for the exact column template, then upload and review bulk scored predictions.

---

## 5. Incident Alert Triage & Resolution

Open `/alerts`:
- **Filter Incidents:** Filter by status (**Open**, **Acknowledged**, **Resolved**) or severity (**High Risk**, **Medium Risk**).
- **Incident Details:** View the exact diagnostic failure pattern (e.g. *Heat Dissipation Failure*), SHAP driving factors, and recommended technical steps.
- **Acknowledge Alert:** Marks the ticket as acknowledged by the shift technician.
- **Resolve Alert:** Opens a completion modal requiring documentation of corrective work (e.g., *"Replaced worn insert, cleared coolant lines, tested 30 min run without vibration"*). Closing the alert returns the machine's status to **Operational**.

---

## 6. Maintenance Kanban Dispatch

Open `/maintenance`:
- **3 Kanban Columns:** Manage work orders across **Pending Inspection**, **In Progress**, and **Completed**.
- **Move Cards:** Click **"Start Work"** to move from Pending to In Progress, and **"Complete Order"** to log final technician notes and archive the ticket.
- **Schedule Work Order:** Click **"Schedule Work Order"** to create a custom ticket. Select priority (**Critical**, **High**, **Medium**, **Routine**); the system auto-suggests safe due dates ($24\text{ hours}$ for Critical, $7\text{ days}$ for Medium, $30\text{ days}$ for Routine).
