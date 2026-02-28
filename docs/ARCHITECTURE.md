# Cross-File Analysis Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Code-Maester                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Single     │  │   Project    │  │     CLI      │    │
│  │   File       │  │   Analysis   │  │   Interface  │    │
│  │   Analysis   │  │   (NEW)      │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                  │                  │            │
│         └──────────────────┴──────────────────┘            │
│                            │                               │
└────────────────────────────┼───────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  File System   │
                    └────────────────┘
```

## Module Architecture

```
src/
├── index.js (Main API)
│   ├── analyze()           ← Single file analysis
│   ├── analyzeFile()       ← File-based analysis
│   └── analyzeProject()    ← NEW: Multi-file analysis
│
└── modules/
    ├── bug-lint/           ← Bug detection
    ├── security/           ← Security scanning
    ├── complexity/         ← Complexity metrics
    ├── formatter/          ← Code formatting
    └── cross-file/         ← NEW: Cross-file analysis
        ├── index.js        ← Orchestrator
        ├── unused-exports.js
        └── circular-deps.js
```

## Cross-File Analysis Flow

### 1. Entry Point

```
User Code / CLI
      │
      ▼
analyzeProject(filePaths, options)
      │
      ▼
Read all files in parallel
      │
      ▼
Detect language for each file
      │
      ▼
crossFileModule.analyzeProject(files, options)
```

### 2. Unused Exports Detection

```
┌─────────────────────────────────────────────────────┐
│         Unused Exports Detection Flow              │
└─────────────────────────────────────────────────────┘

Pass 1: Extract Exports
┌──────────────────────────────────────┐
│  For each file:                      │
│  ├─ Parse AST (acorn)                │
│  ├─ Find export declarations         │
│  │  ├─ export function foo()         │
│  │  ├─ export const bar = 1          │
│  │  ├─ export class Baz              │
│  │  └─ export { foo, bar }           │
│  └─ Store: Map<name, locations[]>   │
└──────────────────────────────────────┘
              │
              ▼
Pass 2: Extract Imports
┌──────────────────────────────────────┐
│  For each file:                      │
│  ├─ Parse AST (acorn)                │
│  ├─ Find import declarations         │
│  │  ├─ import { foo } from './mod'  │
│  │  ├─ const { bar } = require()    │
│  │  └─ import foo from './mod'      │
│  └─ Store: Set<importedNames>       │
└──────────────────────────────────────┘
              │
              ▼
Pass 3: Compare & Report
┌──────────────────────────────────────┐
│  For each export:                    │
│  ├─ Check if in imports set          │
│  ├─ If NOT found:                    │
│  │  └─ Create issue:                 │
│  │     ├─ type: 'structural'         │
│  │     ├─ severity: 'warning'        │
│  │     ├─ rule: 'unused-export'      │
│  │     └─ suggestion: 'Remove...'    │
│  └─ Return issues[]                  │
└──────────────────────────────────────┘
```

### 3. Circular Dependency Detection

```
┌─────────────────────────────────────────────────────┐
│      Circular Dependency Detection Flow            │
└─────────────────────────────────────────────────────┘

Step 1: Build Dependency Graph
┌──────────────────────────────────────┐
│  For each file:                      │
│  ├─ Parse AST (acorn)                │
│  ├─ Find import/require statements   │
│  │  ├─ import { x } from './mod'    │
│  │  ├─ const y = require('./mod')   │
│  │  └─ export { z } from './mod'    │
│  ├─ Resolve relative paths           │
│  └─ Build adjacency list:            │
│     Map<file, Set<dependencies>>     │
└──────────────────────────────────────┘
              │
              ▼
Step 2: Detect Cycles (DFS)
┌──────────────────────────────────────┐
│  For each unvisited node:            │
│  ├─ Start DFS traversal              │
│  ├─ Track recursion stack            │
│  ├─ Track path                       │
│  ├─ If back edge found:              │
│  │  └─ Extract cycle from path      │
│  └─ Continue until all visited       │
└──────────────────────────────────────┘
              │
              ▼
Step 3: Deduplicate & Report
┌──────────────────────────────────────┐
│  For each cycle:                     │
│  ├─ Normalize (sort)                 │
│  ├─ Remove duplicates                │
│  └─ Create issue:                    │
│     ├─ type: 'structural'            │
│     ├─ severity: 'error'             │
│     ├─ rule: 'circular-dependency'   │
│     ├─ cycle: [A, B, C, A]          │
│     └─ suggestion: 'Refactor...'     │
└──────────────────────────────────────┘
```

## Data Structures

### Export Map
```javascript
Map<exportName, Array<{
  file: string,
  line: number,
  type: 'function' | 'class' | 'variable' | 'named',
  isDefault: boolean
}>>
```

### Import Set
```javascript
Set<importedName: string>
```

### Dependency Graph
```javascript
Map<filePath, Set<dependencyPath>>
```

### Issue Structure
```javascript
{
  type: 'structural',
  severity: 'warning' | 'error',
  rule: 'unused-export' | 'circular-dependency',
  file: string,
  line: number,
  message: string,
  suggestion: string,
  // Rule-specific fields
  exportName?: string,
  cycle?: string[]
}
```

## Algorithm Complexity

### Unused Exports
- **Time**: O(n × m) where n = files, m = avg exports per file
- **Space**: O(e + i) where e = total exports, i = total imports
- **Optimizations**: 
  - Parallel file reading
  - Set-based lookup (O(1))
  - Single pass per file

### Circular Dependencies
- **Time**: O(V + E) where V = files, E = dependencies
- **Space**: O(V + E) for graph storage
- **Algorithm**: Depth-First Search (DFS)
- **Optimizations**:
  - Early termination on cycle detection
  - Visited set to avoid reprocessing
  - Cycle deduplication

## Error Handling

```
┌─────────────────────────────────────┐
│  Error Handling Strategy            │
└─────────────────────────────────────┘

AST Parse Error
├─ Try: acorn.parse()
├─ Catch: Fall back to regex
└─ Continue processing

File Read Error
├─ Try: fs.readFile()
├─ Catch: Skip file, log warning
└─ Continue with other files

Invalid Path
├─ Try: path.resolve()
├─ Catch: Use original path
└─ Continue processing

Empty File List
├─ Return empty report
└─ No error thrown
```

## Integration Points

### With Existing Analysis

```
Single File Analysis          Project Analysis
       │                             │
       ├─ Bug Detection              ├─ Unused Exports
       ├─ Security Scan              └─ Circular Deps
       ├─ Complexity                      │
       ├─ Formatting                      │
       └─ Scoring                         │
              │                           │
              └───────────┬───────────────┘
                          │
                    Combined Report
```

### CLI Integration

```
CLI Arguments
      │
      ├─ Single file: code-maester file.js
      │   └─> analyzeFile()
      │
      ├─ Watch mode: code-maester --watch
      │   └─> chokidar + analyzeFile()
      │
      └─ Project mode: code-maester --project "src/**/*.js"
          └─> glob + analyzeProject()
```

## Performance Characteristics

### Scalability

| Files | Time (est) | Memory (est) |
|-------|-----------|--------------|
| 10    | <100ms    | <10MB        |
| 100   | <1s       | <50MB        |
| 1000  | <10s      | <200MB       |
| 10000 | <2min     | <1GB         |

### Bottlenecks

1. **File I/O**: Mitigated by parallel reading
2. **AST Parsing**: Fast acorn parser, regex fallback
3. **Graph Traversal**: Efficient DFS, early termination
4. **Memory**: Keeps all files in memory (consider streaming for huge projects)

## Extension Points

### Adding New Detectors

```javascript
// src/modules/cross-file/new-detector.js
async function detect(files, options) {
  const issues = [];
  
  // Your detection logic here
  files.forEach(file => {
    // Analyze file
    // Create issues
  });
  
  return issues;
}

module.exports = { detect };
```

### Registering Detector

```javascript
// src/modules/cross-file/index.js
const newDetector = require('./new-detector');

async function analyzeProject(files, options) {
  const structural = [];
  
  // Existing detectors
  structural.push(...await unusedExports.detect(files, options));
  structural.push(...await circularDeps.detect(files, options));
  
  // New detector
  structural.push(...await newDetector.detect(files, options));
  
  return { structural };
}
```

## Testing Strategy

### Unit Tests
- Test each detector independently
- Mock file system
- Test edge cases

### Integration Tests
- Test full pipeline
- Use real demo files
- Verify report structure

### CLI Tests
- Test argument parsing
- Test output formatting
- Test exit codes

## Security Considerations

1. **Path Traversal**: All paths normalized and validated
2. **Code Injection**: No eval() or dynamic code execution
3. **Resource Limits**: No infinite loops, bounded recursion
4. **Input Validation**: File patterns sanitized

## Monitoring & Debugging

### Logging Points
- File reading start/complete
- Parse errors (with fallback)
- Cycle detection
- Issue creation

### Debug Mode
```javascript
const report = await codeCheck.analyzeProject(files, {
  debug: true  // Enable verbose logging
});
```

### Performance Profiling
```javascript
console.time('analyzeProject');
const report = await codeCheck.analyzeProject(files);
console.timeEnd('analyzeProject');
```

## Conclusion

The cross-file analysis architecture is designed for:
- **Performance**: Parallel processing, efficient algorithms
- **Scalability**: Handles hundreds of files
- **Extensibility**: Easy to add new detectors
- **Reliability**: Robust error handling
- **Maintainability**: Clean separation of concerns
