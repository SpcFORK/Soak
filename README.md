# Soak VM

Soak VM is a lightweight virtual machine implementation designed for executing custom bytecode instructions.

## Features

- **Stack-based architecture**: Operates on a stack data structure for efficient instruction execution.
- **Primitive operations**: Supports basic operations like arithmetic, boolean logic, and control flow.
- **Memory management**: Includes memory caching and operations for data manipulation.
- **Function calls**: Implements a return address mechanism for function invocations.
- **Dynamic typing**: Handles various data types including integers, floats, booleans, and strings.

## Core Components

### CowNode

The `CowNode` class represents a node in the VM's execution context. It manages:

- Code storage
- Register handling
- Step navigation (next and previous)

### Instruction Set

Soak VM supports a wide range of instructions, including:

- **Stack operations**: drop, dup, swap, over, rot, rotcc, shuf, rshuf
- **Arithmetic**: addition, subtraction, multiplication, division, modulus, power
- **Bitwise operations**: AND, OR, XOR, left shift, right shift
- **Control flow**: conditional jumps, goto
- **Memory operations**: read, write, cache
- **Type casting**: between various primitive types
- **String manipulation**: concatenation, substring extraction
- **List and object operations**: creation, access, modification

### Special Features

- **Memoization**: Caching mechanism for optimizing repeated computations
- **Custom math functions**: Implementations of operations like square root and cube root
- **Character set utilities**: Access to lowercase, uppercase, numeric, and symbol character sets

## Usage

To use Soak VM, you typically:

1. Initialize the VM context
2. Load bytecode instructions
3. Execute the instructions using the VM's interpreter

```javascript
// Example usage (pseudo-code)
let soak = new Soak();
soak.loadInstructions(bytecode);
soak.execute();
```

## Extending Soak VM

The modular design of Soak VM allows for easy extension:

- Add new instructions by implementing them in the appropriate module (e.g., `Prims` for primitives)
- Extend existing operations by modifying the relevant functions
- Implement custom optimizations or features by leveraging the VM's architecture
- Create custom data structures by extending the memory management model
- Introduce new bytecode instructions for specialized tasks

## Performance Considerations

Soak VM includes several optimizations:

- Memoization for expensive computations
- Efficient stack operations
- Cached memory access
- Lazy evaluation of expressions where applicable
- Batch processing for repeated patterns in code

However, as with any interpreted language, there may be performance trade-offs compared to native code execution.

## Contributing

Contributions to Soak VM are welcome. Please ensure that any new features or modifications align with the existing architecture and coding style.

---

### Hehehe

Operations as of v0, if you care:

- ?!, _hksqrt, rshuf, qsin, _intOrFloat
- qand, regcl, mc_setkey, not, tostr
- mc_getctx, c-nm, @, hksqrt, _hksqr
- qhkrshift, add, qneq, mc_getkey, tay
- new, ?:, mod, bor, qinc
- std, hkmlt, abs, qpow, tsx
- memoize, subrt, t, sub, txa
- concat, loop, clear_cache, $
- _hkmlt, qcos, exp, mc_delctx, append
- c-sy, swap, qhkmlt, qbor, contains
- if, c-up, qhkdiv, _qd_b4, drop
- _bool, qnot, mc_addctx, mc_newctx, entries
- f, bxor, qbxor, and, txs
- reduce, indexOf, c-nl, over, inc
- lshift, hkabs, mc_gc, length, c-sl
- (), rot, qhksqrt, qsqrt, remove
- sqrt, qhklshift, eq, keys, c-b
- rotcc, qsub, set, qhksqr, qtan
- qlshift, hkdiv, sin, _get_or_compute
- rshift, qmlt, qband, tax, get
- _qdiv, mc_haskey, ?>, shuf, tan
- mc_hasctx, tya, substr, _cache, qmod
- ora, addr, _ioarg, hkcub, neq
- filter, (^) o, call, dec, qeq
- pick, load, jump, qadd, _hkcub
- qhkcub, band, cos, store, c-cl
- mlt, qhkabs, qrshift, tobool, c-lw
- fromhex, tohex, hksqr, qeor, MemCache
- map, qhkpow, #, dup, _hkpow
- hkpow, hkrshift, qora, jmif, c-cs
- div, values, qabs, hklshift, _exp
- pow, toint, has, (?), c-al
- eor, tofloat

You're welcome!