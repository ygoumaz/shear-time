# Product Context

## Problem
Barber shops and salons require more than a simple start-time/end-time calendar. Many services involve multiple steps with downtime in between (e.g., color application, processing/waiting, rinsing/styling). A standard calendar might block out the entire duration, inefficiently locking up a stylist's time during processing, or require manual entry of multiple separate appointments, which is error-prone.

## Solution
Shear Time solves this by implementing a **Multi-Block Service Model**. Services are defined as a sequence of blocks:
- **Service Blocks**: Active time requiring the stylist.
- **Pause Blocks**: Inactive time (e.g., under a dryer) where the stylist is free to take another client.

The system automatically schedules these sequences, ensuring no overlap for the stylist during service blocks, while allowing double-booking during pause blocks.

## User Experience Goals
- **Effortless Booking**: Select a customer and a service, and the system handles the complex blocking.
- **Clean Visualization**: Clear distinction between different appointment types and their components.
- **Reliable Data**: Robust validation prevents double-booking active time slots.
- **Flexibility**: Ability to manage customer details and appointment specifics easily.