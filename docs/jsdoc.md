# JSDoc standard

All functional TypeScript code in this repository uses structured English JSDoc. The goal is to make APIs understandable to maintainers, contributors, and automated tooling without requiring readers to infer behavior from implementation details.

## Required structure

Every function or method must document its purpose, every parameter, and its return value. Use `@function` for functions and `@method` for methods. Add `@throws` whenever an operation can throw or reject, and add `@example` to public APIs that users can call directly.

```ts
/**
 * @function loadConfig
 * @description Reads environment values and returns the normalized immutable runtime configuration.
 *
 * @param environment - Environment values to read. Defaults to `process.env`.
 * @returns The effective runtime configuration.
 * @throws Does not throw for invalid individual values; invalid values use documented defaults.
 *
 * @example
 * const config = loadConfig({ IDLE_DAYS: 'working_days' });
 * console.log(config.days);
 */
```

Use one `@param` tag for each parameter. Describe accepted values, defaults, side effects, and relevant edge cases in the description or parameter text. Use `@returns` even when the return type is `void`, a promise, or a callback-oriented result.

## Classes

Classes must use a structured class block. Include `@class`, a description, and applicable generic or inheritance information. Document important methods in the same block or with their own method blocks. Include an example when the class is independently useful.

```ts
/**
 * @class ExampleNotifier
 * @description Sends lifecycle notifications through the configured notification adapter.
 *
 * @method started - Announces that monitoring has started.
 * @returns Nothing.
 *
 * @example
 * const notifier = new ExampleNotifier(adapter);
 * notifier.started();
 */
```

## Internal helpers, constants, and types

Internal helpers still require `@function`, `@description`, `@param`, and `@returns`; an example is optional when the helper is not a supported API. Constants should explain their purpose with `@constant` documentation. Interfaces, type aliases, and enums remain exclusively in their component's `types.d.ts` file and should have a short description there.

Documentation must remain in English, examples must be safe and deterministic, and examples must reflect the actual public API. Do not document behavior that the implementation does not provide.
