# EHTS Generalisation Dashboard

An interactive dashboard for exploring the operation of an integrated electricity-hydrogen transport system (EHTS) under nominal and unseen operating conditions.

## Companion Dashboard for an Under-Review Manuscript

This dashboard is the interactive companion to the manuscript:

> **Dual-Agent Reinforcement Learning for Vehicle Scheduling and Multi-Energy Dispatch in Electric–Hydrogen Transportation Systems** *(under review)*

The manuscript presents a dual-agent reinforcement-learning framework that coordinates two connected decision layers in an electric-hydrogen transportation system. The upstream vehicle-scheduling agent determines service priorities for waiting EVs and HVs, while the downstream multi-energy-dispatch agent coordinates electricity, hydrogen, renewable generation, and energy storage in response to the resulting charging and refuelling demand.

This companion dashboard provides an operational view of that coordinated framework. It allows the vehicle-service process, multi-energy dispatch, supply-demand balance, storage behaviour, infrastructure utilisation, and performance under unseen operating conditions to be explored through synchronised interactive panels.

The manuscript is currently under review. Detailed algorithm implementations, training procedures, model configurations, and further technical materials will be added after the manuscript has been accepted. The present release therefore focuses on the interactive visualisation of system operation and generalisation behaviour.

The dashboard follows the station's sequential operating process: low-energy electric vehicles (EVs) and hydrogen vehicles (HVs) arrive, vehicle-service decisions determine charging and refuelling activity, and the energy-dispatch system coordinates PV generation, grid electricity, pipeline hydrogen, battery storage, and hydrogen storage to meet the resulting demand.

## Dashboard Overview

The home page provides:

- A station-level diagram showing the movement of EVs and HVs through the multi-energy station.
- Direct access to the three principal operational views.
- A concise guide to the nine operating scenarios, S0-S8.
- A shared scenario and time-window control bar that applies across all views.
- A summary of the most important operational quantities for the visible period.

All operation views remain synchronised to the selected scenario and time window, allowing the same period to be examined from vehicle-service, energy-dispatch, and supply-demand perspectives.

## Generalisation Scenarios

The dashboard contains one nominal scenario and eight unseen operating conditions.

| Scenario | Setting | Description |
|---|---|---|
| **S0** | Nominal | 62% PV penetration, high transport demand, five EV chargers, and three HV refuellers. |
| **S1** | PV: 0% | No local PV generation; transport demand and service infrastructure remain nominal. |
| **S2** | PV: 100% | PV penetration is increased to 100% while demand and infrastructure remain nominal. |
| **S3** | PV: 150% | PV penetration is increased to 150% while demand and infrastructure remain nominal. |
| **S4** | Arrivals down | Vehicle-arrival intensity is reduced while individual vehicle demands remain unchanged. |
| **S5** | Demand down | Individual vehicle energy demands are reduced while arrival intensity remains nominal. |
| **S6** | Both down | Vehicle-arrival intensity and individual vehicle demands are reduced simultaneously. |
| **S7** | Infrastructure: 6/4 | Service capacity is increased to six EV chargers and four HV refuellers. |
| **S8** | Infrastructure: 4/2 | Service capacity is reduced to four EV chargers and two HV refuellers. |

Selecting a scenario updates every operational view, summary indicator, and diagnostic chart together.

## Vehicle Scheduling Operation

This view presents the movement of vehicles from arrival to service assignment and tracks how intensively the available service infrastructure is used.

### EV Arrivals / Assigned / Waiting

Shows the relationship between:

- Newly arriving EVs.
- EVs assigned to chargers.
- EVs remaining in the waiting queue.

This panel helps identify periods in which EV arrivals exceed immediate charging capacity and shows how the waiting queue evolves over time.

### Charger Utilisation

Displays the utilisation of each EV charger. Individual charger traces make it possible to inspect load sharing, identify idle capacity, and recognise periods of sustained high utilisation.

### HV Arrivals / Assigned / Waiting

Shows the corresponding vehicle-service activity for hydrogen vehicles:

- Newly arriving HVs.
- HVs assigned to refuellers.
- HVs remaining in the waiting queue.

### Refueller Utilisation

Displays the utilisation of each hydrogen refueller, supporting direct assessment of refuelling capacity and infrastructure loading.

## Energy Dispatch Operation

This view describes how electricity and hydrogen resources respond to the vehicle-service demand created by the scheduling operation.

### PV Generation and Weather

Shows PV generation together with solar-irradiance and ambient-temperature profiles. It provides the renewable-energy context for the dispatch decisions visible in the remaining panels.

### PV Utilisation Breakdown

Separates available PV generation into its principal destinations:

- Direct supply to EV chargers.
- Battery charging.
- Electrolyser operation.
- PV curtailment.

The panel reveals how local renewable energy is distributed across immediate transport demand, energy storage, hydrogen production, and curtailed generation.

### Electricity Charge/Discharge and Price

Shows battery discharge, PV-to-battery charging, grid-to-battery charging, and the electricity-price profile. This makes it possible to inspect the timing of battery operation relative to renewable availability and electricity prices.

### Hydrogen Charge/Discharge and Price

Shows hydrogen-tank discharge, PV-derived hydrogen storage, pipeline-to-tank supply, and the hydrogen-price profile. The panel highlights the interaction between local hydrogen production, stored hydrogen, and external pipeline supply.

### Energy Storage SOC

Displays the state of charge of the battery and hydrogen tank, allowing storage availability and high-SOC periods to be inspected throughout the selected time window.

## Supply-Demand Balance

This view focuses on whether the electricity and hydrogen subsystems meet the transport demand created by the vehicle-service operation.

### Electric Power Supply-Demand Balance

Compares EV charging demand with electricity supplied by:

- The battery.
- Local PV generation.
- The external grid.

### Hydrogen Supply-Demand Balance

Compares HV refuelling demand with hydrogen supplied by:

- The hydrogen tank.
- The external hydrogen pipeline.

### Supply-Demand Mismatch Diagnostics

Displays the absolute electricity, hydrogen, and PV-balance residuals on a logarithmic axis together with a reference threshold. This view supports close inspection of balance quality, including very small residual values.

## Visible-Window Summary

The summary cards describe the currently visible period and update whenever the scenario or time window changes. They report:

- PV energy generated.
- Grid electricity purchased and its associated cost.
- Pipeline hydrogen purchased and its associated cost.
- PV energy curtailed and its associated value.
- Total vehicles served, with separate EV and HV counts.
- Peak EV and HV waiting levels.
- Peak EV charging demand.
- Peak HV hydrogen demand.

These cards provide a compact operational overview before examining the detailed time-series panels.

## Operating Characteristics

The **Diagnostics** control opens a focused summary for the same scenario and time window shown in the operation panels.

### Energy-Source and Storage Diagnostics

The diagnostic view reports:

- Grid-supply ratio relative to EV charging demand.
- Pipeline-supply ratio relative to HV refuelling demand.
- Battery high-SOC occupancy.
- Hydrogen-tank high-SOC occupancy.

### Service-Pile Utilisation Diagnostics

The second diagnostic chart reports the mean utilisation of:

- EV chargers.
- HV refuellers.

Together, these diagnostics provide a concise view of external-energy dependence, storage saturation, and service-infrastructure loading.

## Time Controls

The dashboard supports two time-navigation modes.

### Auto Mode

Auto mode advances the visible window through the annual operating period. The animation can be paused and resumed while a particular interval is being examined.

### Manual Mode

Manual mode allows a specific starting day and window length to be selected. Window lengths from one to 31 days are supported, making it possible to move between detailed daily inspection and broader multi-week observation.

Time labels are expressed as relative day and clock time, such as `D1 00:00`, so the temporal position within the visible window remains clear.

## Interactive Exploration

The dashboard provides several coordinated interactions:

- Select any scenario from S0 to S8.
- Switch directly between the home page and the three operation views.
- Enter each operation view from its home-page card.
- Change between automatic and manual time navigation.
- Pause or resume automatic playback.
- Select the starting day and visible-window length.
- Hover over a chart to inspect values at a specific time.
- Open the diagnostics panel without leaving the current operational view.
- Close the diagnostics panel using its close control, the surrounding backdrop, or the Escape key.

## Suggested Exploration Sequence

1. Begin with **S0** to establish the nominal operating pattern.
2. Open **Vehicle Scheduling Operation** to inspect arrivals, assignments, queues, and pile utilisation.
3. Continue to **Energy Dispatch Operation** to examine how the energy system responds to the scheduled transport demand.
4. Open **Supply-Demand Balance** to verify electricity and hydrogen supply composition and balance quality.
5. Use **Diagnostics** to summarise external supply dependence, storage occupancy, and service-pile utilisation for the same period.
6. Compare S1-S3 to examine PV variation, S4-S6 to examine transport-demand variation, and S7-S8 to examine infrastructure variation.

## Primary Uses

The dashboard is designed to support:

- Visual comparison of nominal and unseen operating conditions.
- Inspection of EV and HV queue development.
- Assessment of charger and refueller utilisation.
- Examination of battery and hydrogen-tank behaviour.
- Evaluation of PV allocation and curtailment patterns.
- Analysis of grid and pipeline dependence.
- Investigation of electricity and hydrogen supply-demand balance.
- Identification of operational peaks and periods requiring closer attention.
