# Canonical Type Definitions

This directory contains the canonical type definitions for the application's core data structures. The primary goal of this system is to establish a single source of truth for all data models, ensuring consistency and type safety across the entire codebase.

## Core Principles

- **Centralization**: All core data structures are defined in `types/core.ts`. This file is the single source of truth for all domain models.
- **Consistency**: By using a single, canonical definition for each data structure, we eliminate duplication and prevent inconsistencies between different parts of the application.
- **Type Safety**: The use of TypeScript and canonical types helps to ensure type safety at compile time, reducing the risk of runtime errors.

## Usage

When working with core data structures, always import the canonical types from `types/core.ts`. Avoid defining local or ad-hoc types for data that is already modeled in the canonical type system.

## Contributing

When adding a new core data structure to the application, follow these guidelines:

1. **Add the new type to `types/core.ts`**: Define the new type or interface in the appropriate section of the file.
2. **Use TSDoc comments**: Add comprehensive TSDoc comments to the new type, explaining its purpose, fields, and any constraints.
3. **Update the codebase**: Refactor any parts of the codebase that use the new data structure to import and use the canonical type.
