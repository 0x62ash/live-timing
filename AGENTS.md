# AGENTS.md

## Rules
- Use context7 MCP for documentation on library/framework questions
- Use english language for commit messages

## Commands

### Development
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI-friendly)
npm run mock-server  # Start mock WebSocket server (1s delay)
npm run mock-server:fast  # Start mock server (100ms delay for fast testing)
```


## Code Style Guidelines

### Imports
- Use explicit `.jsx` extensions for React imports: `import App from './App.jsx'`
- Default import order: React/core libs → local components → styles
- CSS imports use relative paths: `import './Component.css'`

### File Naming
- Components: PascalCase (e.g., `RaceTable.jsx`, `LapSidebar.jsx`)
- Test files: `.test.jsx` suffix
- CSS files match component names (e.g., `RaceTable.css`)

### Component Patterns
- Functional components with arrow functions
- No TypeScript - plain JavaScript with JSX
- Props passed as object destructuring in function signature
- Export default pattern: `export default ComponentName`

### State Management
- Use `useState` for local component state
- Use `useEffect` for side effects (WebSocket connections, intervals)
- Clean up effects with return functions (e.g., `ws.close()`, `clearInterval`)

### Naming Conventions
- Variables: camelCase (`selectedDriver`, `lastServerUpdate`)
- Functions: camelCase (`formatElapsedTime`, `renderStintAvgTime`)
- Components: PascalCase (`RaceTable`, `LapSidebar`)
- CSS classes: kebab-case (`race-table`, `lap-sidebar`)

### Type Handling
- No explicit types (plain JS)
- Use optional chaining for potentially undefined values: `driver.laps?.length`
- Null checks before accessing nested properties

### Error Handling
- WebSocket errors logged via `console.error`
- No try-catch blocks in core logic
- Graceful degradation with fallback values (`|| ''`, `?? default`)

### React Patterns
- Helper functions defined outside components when reusable
- Conditional rendering with inline conditionals or ternaries
- Keys on mapped elements using unique identifiers (`driver.driver.id`)

### Testing (Vitest + Testing Library)
- Use `describe/it` blocks for test organization
- Test helpers in separate files (`file-parser.js`, `results-reporter.js`)
- Mock WebSocket via custom `FileWebSocket` class in `setup.js`
- Use `@testing-library/jest-dom` matchers
- Test fixtures in `tests/fixtures/`

### CSS Architecture
- BEM-inspired naming: `.block__element--modifier`
- Component-scoped styles (no global overrides except `index.css`)
- Utility classes for layout (`fit`, `lapTime`, `delta`)

### WebSocket Implementation
- Dev mode detected via URL query param `?dev`
- Connection URL: `ws://host:9001` (dev) or `wss://host/ws` (prod)
- Messages sent as JSON, parsed on receipt
- Heartbeat via elapsed time fallback when server doesn't report

### Build Tooling
- Vite 5 + React plugin
- Vitest 4 for testing with happy-dom environment
- ES modules (`"type": "module"` in package.json)
- No ESLint/Prettier configured