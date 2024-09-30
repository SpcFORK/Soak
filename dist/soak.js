/* oak build --web */
// module system
const __Oak_Modules = {};
let __Oak_Import_Aliases;
function __oak_modularize(name, fn) {
	__Oak_Modules[name] = fn;
}
function __oak_module_import(name) {
	if (typeof __Oak_Modules[name] === 'object') return __Oak_Modules[name];
	const module = __Oak_Modules[name] || __Oak_Modules[__Oak_Import_Aliases[name]];
	if (module) {
		__Oak_Modules[name] = {}; // break circular imports
		return __Oak_Modules[name] = module();
	} else {
		throw new Error(`Could not import Oak module "${name}" at runtime`);
	}
}

// language primitives
let __oak_empty_assgn_tgt;
function __oak_eq(a, b) {
	if (a === __Oak_Empty || b === __Oak_Empty) return true;

	// match either null or undefined to compare correctly against undefined ?s
	// appearing in places like optional arguments
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;

	// match all other types that can be compared cheaply (without function
	// calls for type coercion or recursive descent)
	if (typeof a === 'boolean' || typeof a === 'number' ||
		typeof a === 'symbol' || typeof a === 'function') {
		return a === b;
	}

	// string equality check
	a = __as_oak_string(a);
	b = __as_oak_string(b);
	if (typeof a !== typeof b) return false;
	if (__is_oak_string(a) && __is_oak_string(b)) {
		return a.valueOf() === b.valueOf();
	}

	// deep equality check for composite values
	if (len(a) !== len(b)) return false;
	for (const key of keys(a)) {
		if (!__oak_eq(a[key], b[key])) return false;
	}
	return true;
}
function __oak_acc(tgt, prop) {
	return (__is_oak_string(tgt) ? __as_oak_string(tgt.valueOf()[prop]) : tgt[prop]) ?? null;
}
function __oak_obj_key(x) {
	return typeof x === 'symbol' ? Symbol.keyFor(x) : x;
}
function __oak_push(a, b) {
	a = __as_oak_string(a);
	a.push(b);
	return a;
}
function __oak_and(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a && b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) & get(b, i));
		}
		return res;
	}
	return a & b;
}
function __oak_or(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a || b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) | get(b, i));
		}
		return res;
	}
	return a | b;
}
function __oak_xor(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return (a && !b) || (!a && b);
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) ^ get(b, i));
		}
		return res;
	}
	return a ^ b;
}
const __Oak_Empty = Symbol('__Oak_Empty');

// mutable string type
function __is_oak_string(x) {
	if (x == null) return false;
	return x.__mark_oak_string;
}
function __as_oak_string(x) {
	if (typeof x === 'string') return __Oak_String(x);
	return x;
}
const __Oak_String = s => {
	return {
		__mark_oak_string: true,
		assign(i, slice) {
			if (i === s.length) return s += slice;
			return s = s.substr(0, i) + slice + s.substr(i + slice.length);
		},
		push(slice) {
			s += slice;
		},
		toString() {
			return s;
		},
		valueOf() {
			return s;
		},
		get length() {
			return s.length;
		},
	}
}

// tail recursion trampoline helpers
function __oak_resolve_trampoline(fn, ...args) {
	let rv = fn(...args);
	while (rv && rv.__is_oak_trampoline) {
		rv = rv.fn(...rv.args);
	}
	return rv;
}
function __oak_trampoline(fn, ...args) {
	return {
		__is_oak_trampoline: true,
		fn: fn,
		args: args,
	}
}

// env (builtin) functions

// reflection and types
const __Is_Oak_Node = typeof process === 'object';
const __Oak_Int_RE = /^[+-]?\d+$/;
function int(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') {
		// JS rounds towards higher magnitude, Oak rounds towards higher value
		const rounded = Math.floor(x);
		const diff = x - rounded;
		if (x < 0 && diff === 0.5) return rounded + 1;
		return rounded;
	}
	if (__is_oak_string(x) && __Oak_Int_RE.test(x.valueOf())) {
		const i = Number(x.valueOf());
		if (isNaN(i)) return null;
		return i;
	}
	return null;
}
function float(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') return x;
	if (__is_oak_string(x)) {
		const f = parseFloat(x.valueOf());
		if (isNaN(f)) return null;
		return f;
	}
	return null;
}
function atom(x) {
	x = __as_oak_string(x);
	if (typeof x === 'symbol' && x !== __Oak_Empty) return x;
	if (__is_oak_string(x)) return Symbol.for(x.valueOf());
	return Symbol.for(string(x));
}
function string(x) {
	x = __as_oak_string(x);
	function display(x) {
		x = __as_oak_string(x);
		if (__is_oak_string(x)) {
			return '\'' + x.valueOf().replace('\\', '\\\\').replace('\'', '\\\'') + '\'';
		} else if (typeof x === 'symbol') {
			if (x === __Oak_Empty) return '_';
			return ':' + Symbol.keyFor(x);
		}
		return string(x);
	}
	if (x == null) {
		return '?';
	} else if (typeof x === 'number') {
		return x.toString();
	} else if (__is_oak_string(x)) {
		return x;
	} else if (typeof x === 'boolean') {
		return x.toString();
	} else if (typeof x === 'function') {
		return x.toString();
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return '_';
		return Symbol.keyFor(x);
	} else if (Array.isArray(x)) {
		return '[' + x.map(display).join(', ') + ']';
	} else if (typeof x === 'object') {
		const entries = [];
		for (const key of keys(x).sort()) {
			entries.push(`${key}: ${display(x[key])}`);
		}
		return '{' + entries.join(', ') + '}';
	}
	throw new Error('string() called on unknown type ' + x.toString());
}
function codepoint(c) {
	c = __as_oak_string(c);
	return c.valueOf().charCodeAt(0);
}
function char(n) {
	return String.fromCharCode(n);
}
function type(x) {
	x = __as_oak_string(x);
	if (x == null) {
		return Symbol.for('null');
	} else if (typeof x === 'number') {
		// Many discrete APIs check for :int, so we consider all integer
		// numbers :int and fall back to :float. This is not an airtight
		// solution, but works well enough and the alternative (tagged number
		// values/types) have poor perf tradeoffs.
		if (Number.isInteger(x)) return Symbol.for('int');
		return Symbol.for('float');
	} else if (__is_oak_string(x)) {
		return Symbol.for('string');
	} else if (typeof x === 'boolean') {
		return Symbol.for('bool');
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return Symbol.for('empty');
		return Symbol.for('atom');
	} else if (typeof x === 'function') {
		return Symbol.for('function');
	} else if (Array.isArray(x)) {
		return Symbol.for('list');
	} else if (typeof x === 'object') {
		return Symbol.for('object');
	}
	throw new Error('type() called on unknown type ' + x.toString());
}
function len(x) {
	if (typeof x === 'string' || __is_oak_string(x) || Array.isArray(x)) {
		return x.length;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).length;
	}
	throw new Error('len() takes a string or composite value, but got ' + string(x));
}
function keys(x) {
	if (Array.isArray(x)) {
		const k = [];
		for (let i = 0; i < x.length; i ++) k.push(i);
		return k;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).map(__as_oak_string);
	}
	throw new Error('keys() takes a composite value, but got ' + string(x).valueOf());
}

// OS interfaces
function args() {
	if (__Is_Oak_Node) return process.argv.map(__as_oak_string);
	return [window.location.href];
}
function env() {
	if (__Is_Oak_Node) {
		const e = Object.assign({}, process.env);
		for (const key in e) {
			e[key] = __as_oak_string(e[key]);
		}
		return e;
	}
	return {};
}
function time() {
	return Date.now() / 1000;
}
function nanotime() {
	return int(Date.now() * 1000000);
}
function rand() {
	return Math.random();
}
let randomBytes;
function srand(length) {
	if (__Is_Oak_Node) {
		// lazily import dependency
		if (!randomBytes) randomBytes = require('crypto').randomBytes;
		return randomBytes(length).toString('latin1');
	}

	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return __as_oak_string(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
}
function wait(duration, cb) {
	setTimeout(cb, duration * 1000);
	return null;
}
function exit(code) {
	if (__Is_Oak_Node) process.exit(code);
	return null;
}
function exec() {
	throw new Error('exec() not implemented');
}

// I/O
function input() {
	throw new Error('input() not implemented');
}
function print(s) {
	s = __as_oak_string(s);
	if (__Is_Oak_Node) {
		process.stdout.write(string(s).toString());
	} else {
		console.log(string(s).toString());
	}
	return s.length;
}
function ls() {
	throw new Error('ls() not implemented');
}
function rm() {
	throw new Error('rm() not implemented');
}
function mkdir() {
	throw new Error('mkdir() not implemented');
}
function stat() {
	throw new Error('stat() not implemented');
}
function open() {
	throw new Error('open() not implemented');
}
function close() {
	throw new Error('close() not implemented');
}
function read() {
	throw new Error('read() not implemented');
}
function write() {
	throw new Error('write() not implemented');
}
function listen() {
	throw new Error('listen() not implemented');
}
function req() {
	throw new Error('req() not implemented');
}

// math
function sin(n) {
	return Math.sin(n);
}
function cos(n) {
	return Math.cos(n);
}
function tan(n) {
	return Math.tan(n);
}
function asin(n) {
	return Math.asin(n);
}
function acos(n) {
	return Math.acos(n);
}
function atan(n) {
	return Math.atan(n);
}
function pow(b, n) {
	return Math.pow(b, n);
}
function log(b, n) {
	return Math.log(n) / Math.log(b);
}

// runtime
function ___runtime_lib() {
	throw new Error('___runtime_lib() not implemented');
}
function ___runtime_lib__oak_qm() {
	throw new Error('___runtime_lib?() not implemented');
}
function ___runtime_gc() {
	throw new Error('___runtime_gc() not implemented');
}
function ___runtime_mem() {
	throw new Error('___runtime_mem() not implemented');
}
function ___runtime_proc() {
	throw new Error('___runtime_proc() not implemented');
}

// JavaScript interop
function call(target, fn, ...args) {
	return target[Symbol.keyFor(fn)](...args);
}
function __oak_js_new(Constructor, ...args) {
	return new Constructor(...args);
}
function __oak_js_try(fn) {
	try {
		return {
			type: Symbol.for('ok'),
			ok: fn(),
		}
	} catch (e) {
		return {
			type: Symbol.for('error'),
			error: e,
		}
	}
}
(__oak_modularize(__Oak_String('main.oak'),function _(){return ((CowError,CowNode,Soak,static,std,str)=>((std=__oak_module_import(__Oak_String('std'))),(str=__oak_module_import(__Oak_String('str'))),({CowNode}=__oak_module_import(__Oak_String('node.oak'))),({CowError}=__oak_module_import(__Oak_String('util.oak'))),(static=__oak_module_import(__Oak_String('static.oak'))),Soak=function Soak(Env=null){let Ctx;let _jitFirstStep;let _jitStand;let _jitStep;let _parseInstruction;let add;let assg;let dele;let jit;let load;let pack;let pop;let read;let stepToNode;return (Ctx=({Env:(std.__oak_js_default)(Env,(static.Env??null)),read:read=function read(k=null){return __oak_acc(Env,__oak_obj_key((k)))},assg:assg=function assg(k=null,v=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Env),v)},dele:dele=function dele(k=null){return assg(k,null)},Stack:[],add:add=function add(v=null){return __oak_push((Ctx.Stack??null),v)},pop:pop=function pop(){return ((lastItem)=>((lastItem=__oak_acc((Ctx.Stack??null),__oak_obj_key(((len((Ctx.Stack??null))-1))))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(Stack,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.Stack):(__oak_assgn_tgt.Stack)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),(std.take)((Ctx.Stack??null),(len((Ctx.Stack??null))-1))),lastItem))()},Steps:[],stepToNode:stepToNode=function stepToNode(step=null){return CowNode(...step)},load:load=function load(CowSteps=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(Steps,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.Steps):(__oak_assgn_tgt.Steps)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),(std.map)(CowSteps,stepToNode))},pack:pack=function pack(){return (std.map)((Ctx.Steps??null),function _(e=null){return (e.pack)()})},_parseInstruction:_parseInstruction=function _parseInstruction(item=null){return ((args,items,operation)=>((items=(str.split)((item.code??null),__Oak_String(' '))),(operation=__oak_acc((Ctx.Env??null),__oak_obj_key(((str.lower)(__oak_acc(items,0)))))),(args=(std.slice)(items,1)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('function'))?operation(Ctx,({args,item,items})):__oak_eq(__oak_cond,Symbol.for('null'))?(CowError(__Oak_String('ParseError'),__Oak_String('Invalid instruction!'),__oak_acc(items,0),(Ctx.Stack??null)).__oak_js_throw)():null)(type(operation))))()},_jitStand:_jitStand=function _jitStand(item=null){return ((next)=>((next=(item.next)((Ctx.Steps??null))),((__oak_cond)=>__oak_eq(__oak_cond,true)?_jitStep(next):null)(!__oak_eq(next,null))))()},_jitStep:_jitStep=function _jitStep(item=null){return (_parseInstruction(item),_jitStand(item))},_jitFirstStep:_jitFirstStep=function _jitFirstStep(){return ((item)=>((item=(std.find)((Ctx.Steps??null),function _(step=null){return __oak_eq((step.thisReg??null),0)})),((__oak_cond)=>__oak_eq(__oak_cond,true)?(CowError(__Oak_String('JIT'),__Oak_String('Failed to find first step!'),pack(),(Ctx.Stack??null)).__oak_js_throw)():null)(__oak_eq(item,-1)),__oak_acc((Ctx.Steps??null),__oak_obj_key((item)))))()},jit:jit=function jit(){return (_jitStep(_jitFirstStep()),__oak_acc((Ctx.Stack??null),__oak_obj_key(((len((Ctx.Stack??null))-1)))))}}))},({CowError,CowNode,Soak,static,std,str})))()}),__oak_modularize(__Oak_String('node.oak'),function _(){return ((CowNode,std)=>((std=__oak_module_import(__Oak_String('std'))),CowNode=function CowNode(code=null,thisReg=null,nextReg=null){let Ctx;let _Last;let _Next;let _findStep;let _hasStep;let _updateStep;let cache;let hasLast;let hasNext;let last;let next;let pack;let uncache;let uncacheLast;let uncacheNext;return (Ctx=({thisReg:(std.__oak_js_default)(thisReg,0),nextReg:(std.__oak_js_default)(nextReg,0),code:(std.__oak_js_default)(code,__Oak_String('')),pack:pack=function pack(){return [(Ctx.code??null),(Ctx.thisReg??null),(Ctx.nextReg??null)]},_Next:_Next=function _Next(step=null){return __oak_eq((step.thisReg??null),(Ctx.nextReg??null))},_Last:_Last=function _Last(step=null){return __oak_eq((step.nextReg??null),(Ctx.thisReg??null))},_hasStep:_hasStep=function _hasStep(steps=null,mutator=null){return (std.find)(steps,mutator)},_updateStep:_updateStep=function _updateStep(steps=null,key=null,mutator=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),__oak_acc(steps,__oak_obj_key((_hasStep(steps,mutator))))):__oak_acc(Ctx,__oak_obj_key((key))))(__oak_acc(Ctx,__oak_obj_key((key))))},_findStep:_findStep=function _findStep(steps=null,key=null,mutator=null){return (_updateStep(steps,key,mutator),__oak_acc(Ctx,__oak_obj_key((key))))},_nextStep__oak_qm:null,_lastStep__oak_qm:null,hasNext:hasNext=function hasNext(steps=null){return _hasStep(steps,_Next)},hasLast:hasLast=function hasLast(steps=null){return _hasStep(steps,_Last)},next:next=function next(steps=null){return _findStep(steps,__Oak_String('_nextStep?'),_Next)},last:last=function last(steps=null){return _findStep(steps,__Oak_String('_lastStep?'),_Last)},cache:cache=function cache(steps=null){return [next(),last()]},uncacheNext:uncacheNext=function uncacheNext(){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(_nextStep__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt._nextStep__oak_qm):(__oak_assgn_tgt._nextStep__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),null)},uncacheLast:uncacheLast=function uncacheLast(){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(_lastStep__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt._lastStep__oak_qm):(__oak_assgn_tgt._lastStep__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),null)},uncache:uncache=function uncache(){return (uncacheNext(),uncacheLast())}}))},({CowNode,std})))()}),__oak_modularize(__Oak_String('static.oak'),function _(){return ((Adding,Div,Env,Math,Mult,Pow,Prims,Subtr,_exp,_hkmlt,_hkpow,_ioarg,_qd_b4,_qdiv,bools,chars,lower,math,numbers,prim,std,str,symbl,upper)=>((std=__oak_module_import(__Oak_String('std'))),(str=__oak_module_import(__Oak_String('str'))),(math=__oak_module_import(__Oak_String('math'))),(lower=__Oak_String('abcdefghijklmnopqrstuvwxyz')),(upper=__Oak_String('ABCDEFGHIJKLMNOPQRSTUVWXYZ')),(numbers=[0,1,2,3,4,5,6,7,8,9]),(symbl=__Oak_String('#$%&*+-./:<=>?@^_`{|}~')),(bools=[false,true]),(chars=__as_oak_string(__as_oak_string(__as_oak_string(lower+upper)+((str.join)((std.map)(numbers,string),__Oak_String(''))))+symbl)),prim=function prim(ctx=null,obj=null){return ((ctx.Soak??null).add)(__oak_acc(obj,__oak_obj_key((int(__oak_acc((ctx.args??null),0))))))},(Prims=({[__Oak_String('t')]:function _(s=null,c=null){return (s.add)(true)},[__Oak_String('f')]:function _(s=null,c=null){return (s.add)(false)},[__Oak_String('#')]:function _(s=null,c=null){return (s.add)(int(__oak_acc((c.args??null),0)))},[__Oak_String('$')]:function _(s=null,c=null){return (s.add)(__oak_acc((c.args??null),0))},[__Oak_String('c-b')]:function _(s=null,c=null){return prim(c,bools)},[__Oak_String('c-lw')]:function _(s=null,c=null){return prim(c,lower)},[__Oak_String('c-up')]:function _(s=null,c=null){return prim(c,upper)},[__Oak_String('c-al')]:function _(s=null,c=null){return (s.add)(len(lower))},[__Oak_String('c-nm')]:function _(s=null,c=null){return prim(c,numbers)},[__Oak_String('c-nl')]:function _(s=null,c=null){return (s.add)(len(numbers))},[__Oak_String('c-sy')]:function _(s=null,c=null){return prim(c,symbl)},[__Oak_String('c-sl')]:function _(s=null,c=null){return (s.add)(len(symbl))},[__Oak_String('c-cs')]:function _(s=null,c=null){return prim(c,chars)},[__Oak_String('c-cl')]:function _(s=null,c=null){return (s.add)(len(chars))},_ioarg:_ioarg=function _ioarg(s=null,c=null,i=null,h=null){let val;return ((__oak_cond)=>__oak_eq(__oak_cond,null)?(s.pop)():(std.__oak_js_default)(h,string)(val))((val=__oak_acc((c.args??null),__oak_obj_key((i)))))}})),(Adding=({qadd:function _(s=null,c=null){return (s.add)(__as_oak_string((s.pop)()+(s.pop)()))},add:function _(s=null,c=null){return (s.add)(__as_oak_string(_ioarg(s,c,0)+_ioarg(s,c,1)))}})),(Subtr=({qsub:function _(s=null,c=null){return (s.add)(((s.pop)()-(s.pop)()))},sub:function _(s=null,c=null){return (s.add)((_ioarg(s,c,0)-_ioarg(s,c,1)))}})),(Mult=({qmlt:function _(s=null,c=null){return (s.add)(((s.pop)()*(s.pop)()))},mult:function _(s=null,c=null){return (s.add)((_ioarg(s,c,0)*_ioarg(s,c,1)))},_qd_b4:_qd_b4=function _qd_b4(x=null){return (pow(x,2)/4)},_hkmlt:_hkmlt=function _hkmlt(a=null,b=null){return (_qd_b4(__as_oak_string(a+b))-_qd_b4((a-b)))},qhkmlt:function _(s=null,c=null){return (s.add)(_hkmlt((s.pop)(),(s.pop)()))},hkmlt:function _(s=null,c=null){return (s.add)(_hkmlt(_ioarg(s,c,0),_ioarg(s,c,1)))}})),(Div=({div:function _(s=null,c=null){return (s.add)((_ioarg(s,c,0)/_ioarg(s,c,1)))},_exp:_exp=function _exp(x=null){return pow((math.E??null),x)},exp:function _(s=null,c=null){return (s.add)(_exp((s.pop)()))},_qdiv:_qdiv=function _qdiv(a=null,b=null){return (_exp((log(a)-log(b))))},hkdiv:function _(s=null,c=null){return (s.add)(_qdiv(_ioarg(s,c,0),_ioarg(s,c,1)))},qhkdiv:function _(s=null,c=null){return (s.add)(_qdiv((s.pop)(),(s.pop)()))}})),(Pow=({pow:function _(s=null,c=null){return (s.add)(pow(_ioarg(s,c,0),_ioarg(s,c,1)))},qpow:function _(s=null,c=null){return (s.add)(pow((s.pop)(),(s.pop)()))},_hkpow:_hkpow=function _hkpow(a=null,b=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?1:_hkmlt(a,_hkpow(a,(b-1))))(b)},qhkpow:function _(s=null,c=null){return (s.add)(_hkpow((s.pop)(),(s.pop)()))},hkpow:function _(s=null,c=null){return (s.add)(_hkpow(_ioarg(s,c,0),_ioarg(s,c,1)))}})),(Math=(std.merge)(Adding,Subtr,Mult,Div,Pow)),(Env=(std.merge)(Prims,Math,({}))),({Adding,Div,Env,Math,Mult,Pow,Prims,Subtr,_exp,_hkmlt,_hkpow,_ioarg,_qd_b4,_qdiv,bools,chars,lower,math,numbers,prim,std,str,symbl,upper})))()}),__oak_modularize(__Oak_String('util.oak'),function _(){return ((CowError,fmt,std)=>((std=__oak_module_import(__Oak_String('std'))),(fmt=__oak_module_import(__Oak_String('fmt'))),CowError=function CowError(name=null,message=null,cause=null,stack=null){return ((Ctx)=>((Ctx=({name:(std.__oak_js_default)(name,__Oak_String('')),cause:(std.__oak_js_default)(cause,null),stack:(std.__oak_js_default)(stack,__Oak_String('')),message:(std.__oak_js_default)(message,__Oak_String('')),__oak_js_throw:function _(...args){return ((std.println)((fmt.format)(__Oak_String('{{0}} -> {{1}}:'),(Ctx.name??null),(Ctx.message??null))),(std.println)(__Oak_String(' '),(Ctx.cause??null)),(std.println)(__Oak_String(' '),(Ctx.stack??null)),exit(1))}}))))()},({CowError,fmt,std})))()}),__oak_modularize(__Oak_String('fmt'),function _(){return ((__oak_js_default,format,printf,println)=>(({println,__oak_js_default}=__oak_module_import(__Oak_String('std'))),format=function format(raw=null,...values){return ((buf,key,sub,value,which)=>((which=0),(key=__Oak_String('')),(buf=__Oak_String('')),(value=__oak_js_default(__oak_acc(values,0),({}))),sub=function sub(idx=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((c)=>((c=__oak_acc(raw,__oak_obj_key((idx)))),((__oak_cond)=>__oak_eq(__oak_cond,0)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('{'))?(which=1):__oak_push(buf,c))(c):__oak_eq(__oak_cond,1)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('{'))?(which=2):(__oak_push(__oak_push(buf,__Oak_String('{')),c),(which=0)))(c):__oak_eq(__oak_cond,2)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('}'))?((index)=>((index=int(key)),__oak_push(buf,string(((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(key,__Oak_String('')))?__Oak_String(''):__oak_eq(__oak_cond,__oak_eq(index,null))?__oak_acc(value,__oak_obj_key((key))):__oak_acc(values,__oak_obj_key((index))))(true))),(key=__Oak_String('')),(which=3)))():__oak_eq(__oak_cond,__Oak_String(' '))?null:__oak_eq(__oak_cond,__Oak_String('\t'))?null:(key=__as_oak_string(key+c)))(c):__oak_eq(__oak_cond,3)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String('}'))?(which=0):null)(c):null)(which),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(idx+1))))():buf)((idx<len(raw)))}),__oak_resolve_trampoline(__oak_trampolined_sub,idx)))()},sub(0)))()},printf=function printf(raw=null,...values){return println(format(raw,...values))},({__oak_js_default,format,printf,println})))()}),__oak_modularize(__Oak_String('math'),function _(){return ((E,Pi,abs,bearing,clamp,__oak_js_default,hypot,map,max,mean,median,min,orient,prod,reduce,round,scale,sign,sort,sqrt,stddev,sum)=>(({__oak_js_default,map,reduce}=__oak_module_import(__Oak_String('std'))),({sort}=__oak_module_import(__Oak_String('sort'))),(Pi=3.141592653589793),(E=2.718281828459045),sign=function sign(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?1:-1)((n>=0))},abs=function abs(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?n:-n)((n>=0))},sqrt=function sqrt(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?pow(n,0.5):null)((n>=0))},hypot=function hypot(x0=null,y0=null,x1=null,y1=null){return (((__oak_cond)=>__oak_eq(__oak_cond,true)?(x1=(y1=0)):null)((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,__oak_eq(y1,null)))(__oak_eq(x1,null))),sqrt(__as_oak_string((((x0-x1))*((x0-x1)))+(((y0-y1))*((y0-y1))))))},scale=function scale(x=null,a=null,b=null,c=null,d=null){return ((normed)=>((normed=(((x-a))/((b-a)))),((__oak_cond)=>__oak_eq(__oak_cond,(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,__oak_eq(d,null)))(__oak_eq(c,null)))?normed:__as_oak_string((((d-c))*normed)+c))(true)))()},bearing=function bearing(x=null,y=null,d=null,t=null){return [__as_oak_string(x+(d*cos(t))),__as_oak_string(y+(d*sin(t)))]},orient=function orient(x0=null,y0=null,x1=null,y1=null){return ((x,y)=>(([x=null,y=null]=((__oak_cond)=>__oak_eq(__oak_cond,true)?[x0,y0]:[(x1-x0),(y1-y0)])((__oak_left=>__oak_left===false?false:__oak_and(__oak_left,__oak_eq(y1,null)))(__oak_eq(x1,null)))),((__oak_cond)=>__oak_eq(__oak_cond,(x>0))?(2*atan((y/(__as_oak_string(hypot(x,y)+x))))):__oak_eq(__oak_cond,(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,!__oak_eq(y,0)))((x<=0)))?(2*atan((((hypot(x,y)-x))/y))):__oak_eq(__oak_cond,(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,__oak_eq(y,0)))((x<0)))?Pi:null)(true)))()},sum=function sum(...xs){return reduce(xs,0,function _(a=null,b=null){return __as_oak_string(a+b)})},prod=function prod(...xs){return reduce(xs,1,function _(a=null,b=null){return (a*b)})},min=function min(...xs){return reduce(xs,__oak_acc(xs,0),function _(acc=null,n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?n:acc)((n<acc))})},max=function max(...xs){return reduce(xs,__oak_acc(xs,0),function _(acc=null,n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?n:acc)((n>acc))})},clamp=function clamp(x=null,a=null,b=null){return ((__oak_cond)=>__oak_eq(__oak_cond,(x<a))?a:__oak_eq(__oak_cond,(x>b))?b:x)(true)},mean=function mean(xs=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?null:(sum(...xs)/len(xs)))(len(xs))},median=function median(xs=null){return ((count,half)=>((xs=sort(xs)),(count=len(xs)),(half=int((count/2))),((__oak_cond)=>__oak_eq(__oak_cond,count)?null:__oak_eq(__oak_cond,(count%2))?((__as_oak_string(__oak_acc(xs,__oak_obj_key(((half-1))))+__oak_acc(xs,__oak_obj_key((half)))))/2):__oak_acc(xs,__oak_obj_key((half))))(0)))()},stddev=function stddev(xs=null){let xmean;return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(sqrt(mean(map(xs,function _(x=null){return pow((xmean-x),2)})))):null)(!__oak_eq(null,(xmean=mean(xs))))},round=function round(n=null,decimals=null){return ((decimals=__oak_js_default(int(decimals),0)),((__oak_cond)=>__oak_eq(__oak_cond,true)?n:((order)=>((order=pow(10,decimals)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(int(__as_oak_string((n*order)+0.5))/order):(-int(__as_oak_string((-n*order)+0.5))/order))((n>=0))))())((decimals<0)))},({E,Pi,abs,bearing,clamp,__oak_js_default,hypot,map,max,mean,median,min,orient,prod,reduce,round,scale,sign,sort,sqrt,stddev,sum})))()}),__oak_modularize(__Oak_String('sort'),function _(){return ((clone,__oak_js_default,id,map,sort,sort__oak_exclam)=>(({__oak_js_default,identity:id=null,map,clone}=__oak_module_import(__Oak_String('std'))),sort__oak_exclam=function sort__oak_exclam(xs=null,pred=null){return ((partition,quicksort,vpred)=>((pred=__oak_js_default(pred,id)),(vpred=map(xs,pred)),partition=function partition(xs=null,lo=null,hi=null){return ((lsub,pivot,rsub,sub)=>((pivot=__oak_acc(vpred,__oak_obj_key((lo)))),lsub=function lsub(i=null){return ((__oak_trampolined_lsub)=>((__oak_trampolined_lsub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_lsub,__as_oak_string(i+1)):i)((__oak_acc(vpred,__oak_obj_key((i)))<pivot))}),__oak_resolve_trampoline(__oak_trampolined_lsub,i)))()},rsub=function rsub(j=null){return ((__oak_trampolined_rsub)=>((__oak_trampolined_rsub=function _(j=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_rsub,(j-1)):j)((__oak_acc(vpred,__oak_obj_key((j)))>pivot))}),__oak_resolve_trampoline(__oak_trampolined_rsub,j)))()},sub=function sub(i=null,j=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,j=null){return ((i=lsub(i)),(j=rsub(j)),((__oak_cond)=>__oak_eq(__oak_cond,false)?j:((tmp,tmpPred)=>((tmp=__oak_acc(xs,__oak_obj_key((i)))),(tmpPred=__oak_acc(vpred,__oak_obj_key((i)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),__oak_acc(xs,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),tmp),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),__oak_acc(vpred,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),tmpPred),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),(j-1))))())((i<j)))}),__oak_resolve_trampoline(__oak_trampolined_sub,i,j)))()},sub(lo,hi)))()},quicksort=function quicksort(xs=null,lo=null,hi=null){return ((__oak_trampolined_quicksort)=>((__oak_trampolined_quicksort=function _(xs=null,lo=null,hi=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?xs:__oak_eq(__oak_cond,1)?xs:((__oak_cond)=>__oak_eq(__oak_cond,false)?xs:((p)=>((p=partition(xs,lo,hi)),quicksort(xs,lo,p),__oak_trampoline(__oak_trampolined_quicksort,xs,__as_oak_string(p+1),hi)))())((lo<hi)))(len(xs))}),__oak_resolve_trampoline(__oak_trampolined_quicksort,xs,lo,hi)))()},quicksort(xs,0,(len(xs)-1))))()},sort=function sort(xs=null,pred=null){return sort__oak_exclam(clone(xs),pred)},({clone,__oak_js_default,id,map,sort,sort__oak_exclam})))()}),__oak_modularize(__Oak_String('std'),function _(){return ((_asPredicate,_baseIterator,_hToN,_nToH,aloop,append,clamp,clone,compact,constantly,contains__oak_qm,debounce,__oak_js_default,each,entries,every,exclude,filter,find,first,flatten,fromEntries,fromHex,identity,indexOf,is,join,last,loop,map,merge,once,parallel,partition,println,range,reduce,reverse,rfind,rindexOf,separate,serial,slice,some,stdin,take,takeLast,toHex,uniq,values,zip)=>(identity=function identity(x=null){return x},is=function is(x=null){return function _(y=null){return __oak_eq(x,y)}},constantly=function constantly(x=null){return function _(){return x}},_baseIterator=function _baseIterator(v=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__Oak_String(''):__oak_eq(__oak_cond,Symbol.for('list'))?[]:__oak_eq(__oak_cond,Symbol.for('object'))?({}):null)(type(v))},_asPredicate=function _asPredicate(pred=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('atom'))?((prop)=>((prop=string(pred)),function _(x=null){return __oak_acc(x,__oak_obj_key((prop)))}))():__oak_eq(__oak_cond,Symbol.for('string'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:__oak_eq(__oak_cond,Symbol.for('int'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:pred)(type(pred))},__oak_js_default=function __oak_js_default(x=null,base=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?base:x)(x)},(_nToH=__Oak_String('0123456789abcdef')),toHex=function toHex(n=null){return ((sub)=>(sub=function sub(p=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(p=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__as_oak_string(__oak_acc(_nToH,__oak_obj_key((p)))+acc):__oak_trampoline(__oak_trampolined_sub,int((p/16)),__as_oak_string(__oak_acc(_nToH,__oak_obj_key(((p%16))))+acc)))((p<16))}),__oak_resolve_trampoline(__oak_trampolined_sub,p,acc)))()},sub(int(n),__Oak_String(''))))()},(_hToN=({0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15})),fromHex=function fromHex(s=null){return ((sub)=>(sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){let next;return ((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(i,len(s)))?acc:__oak_eq(__oak_cond,!__oak_eq(null,(next=__oak_acc(_hToN,__oak_obj_key((__oak_acc(s,__oak_obj_key((i)))))))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__as_oak_string((acc*16)+next)):null)(true)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,0)))()},clamp=function clamp(min=null,max=null,n=null,m=null){return ((n=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:n)((n<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:m)((m<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?max:m)((m>max))),(n=((__oak_cond)=>__oak_eq(__oak_cond,true)?m:n)((n>m))),[n,m])},slice=function slice(xs=null,min=null,max=null){return ((sub)=>((min=__oak_js_default(min,0)),(max=__oak_js_default(max,len(xs))),([min=null,max=null]=clamp(0,len(xs),min,max)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),min)))()},clone=function clone(x=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__as_oak_string(__Oak_String('')+x):__oak_eq(__oak_cond,Symbol.for('list'))?slice(x):__oak_eq(__oak_cond,Symbol.for('object'))?reduce(keys(x),({}),function _(acc=null,key=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),__oak_acc(x,__oak_obj_key((key))))}):x)(type(x))},range=function range(start=null,end=null,step=null){return ((step=__oak_js_default(step,1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?([start=null,end=null]=[0,start]):null)(__oak_eq(end,null)),((__oak_cond)=>__oak_eq(__oak_cond,0)?[]:((list,sub)=>((list=[]),((__oak_cond)=>__oak_eq(__oak_cond,true)?sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n<end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()}:sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n>end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()})((step>0)),sub(start)))())(step))},reverse=function reverse(xs=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),(i-1)))((i<0))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),(len(xs)-1))))()},map=function map(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,f(__oak_acc(xs,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},each=function each(xs=null,f=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?null:(f(__oak_acc(xs,__oak_obj_key((i))),i),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},filter=function filter(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},exclude=function exclude(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(!f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},separate=function separate(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(is=null,isnt=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(is=null,isnt=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?[is,isnt]:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(is,x):__oak_push(isnt,x))(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,is,isnt,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,is,isnt,i)))()},sub(_baseIterator(xs),_baseIterator(xs),0)))()},reduce=function reduce(xs=null,seed=null,f=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,f(acc,__oak_acc(xs,__oak_obj_key((i))),i),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(seed,0)))()},flatten=function flatten(xs=null){return reduce(xs,[],append)},compact=function compact(xs=null){return filter(xs,function _(x=null){return !__oak_eq(x,null)})},some=function some(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,false,function _(acc=null,x=null,i=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,pred(x,i)))(acc)}))},every=function every(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,true,function _(acc=null,x=null,i=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,pred(x,i)))(acc)}))},append=function append(xs=null,ys=null){return reduce(ys,xs,function _(zs=null,y=null){return __oak_push(zs,y)})},join=function join(xs=null,ys=null){return append(clone(xs),ys)},zip=function zip(xs=null,ys=null,zipper=null){return ((max,sub)=>((zipper=__oak_js_default(zipper,function _(x=null,y=null){return [x,y]})),(max=((__oak_cond)=>__oak_eq(__oak_cond,true)?len(xs):len(ys))((len(xs)<len(ys)))),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,zipper(__oak_acc(xs,__oak_obj_key((i))),__oak_acc(ys,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub([],0)))()},partition=function partition(xs=null,by=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('int'))?reduce(xs,[],function _(acc=null,x=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(acc,[x]):(__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x),acc))((i%by))}):__oak_eq(__oak_cond,Symbol.for('function'))?((last)=>((last=function _(){return null}),reduce(xs,[],function _(acc=null,x=null){return ((__oak_js_this)=>(((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x):__oak_push(acc,[x]))((__oak_js_this=by(x))),(last=__oak_js_this),acc))()})))():null)(type(by))},uniq=function uniq(xs=null,pred=null){return ((last,sub,ys)=>((pred=__oak_js_default(pred,identity)),(ys=_baseIterator(xs)),(last=function _(){return null}),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){let p;let x;return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?ys:((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):(__oak_push(ys,x),(last=p),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))((p=pred((x=__oak_acc(xs,__oak_obj_key((i))))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},first=function first(xs=null){return __oak_acc(xs,0)},last=function last(xs=null){return __oak_acc(xs,__oak_obj_key(((len(xs)-1))))},take=function take(xs=null,n=null){return slice(xs,0,n)},takeLast=function takeLast(xs=null,n=null){return slice(xs,(len(xs)-n))},find=function find(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},rfind=function rfind(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,(i-1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub((len(xs)-1))))()},indexOf=function indexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},rindexOf=function rindexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,(i-1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub((len(xs)-1))))()},contains__oak_qm=function contains__oak_qm(xs=null,x=null){return (indexOf(xs,x)>-1)},values=function values(obj=null){return map(keys(obj),function _(key=null){return __oak_acc(obj,__oak_obj_key((key)))})},entries=function entries(obj=null){return map(keys(obj),function _(key=null){return [key,__oak_acc(obj,__oak_obj_key((key)))]})},fromEntries=function fromEntries(entries=null){return reduce(entries,({}),function _(o=null,entry=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((__oak_acc(entry,0)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((__oak_acc(entry,0)))]):(__oak_assgn_tgt[__oak_obj_key((__oak_acc(entry,0)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(o),__oak_acc(entry,1))})},merge=function merge(...os){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?null:reduce(os,__oak_acc(os,0),function _(acc=null,o=null){return (reduce(keys(o),acc,function _(root=null,k=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(root),__oak_acc(o,__oak_obj_key((k))))}))}))(len(os))},once=function once(f=null){return ((called__oak_qm)=>((called__oak_qm=false),function _(...args){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((called__oak_qm=true),f(...args)):null)(!called__oak_qm)}))()},loop=function loop(max=null,f=null){return ((breaker,broken,ret,sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([max=null,f=null]=[-1,max]):null)(__oak_eq(type(max),Symbol.for('function'))),(max=__oak_js_default(max,-1)),(ret=null),(broken=false),breaker=function breaker(x=null){return ((ret=x),(broken=true))},sub=function sub(count=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,broken)?ret:(f(count,breaker),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(count+1))))(true):null)(!__oak_eq(count,max))}),__oak_resolve_trampoline(__oak_trampolined_sub,count)))()},sub(0)))()},aloop=function aloop(max=null,f=null,done=null){return ((sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([max=null,f=null,done=null]=[-1,max,f]):null)(__oak_eq(type(max),Symbol.for('function'))),(max=__oak_js_default(max,-1)),(done=__oak_js_default(done,function _(){return null})),sub=function sub(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?done():f(count,function _(){return sub(__as_oak_string(count+1))},done))(count)},sub(0)))()},serial=function serial(xs=null,f=null,done=null){return ((sub)=>((done=__oak_js_default(done,function _(){return null})),sub=function sub(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?done():f(__oak_acc(xs,__oak_obj_key((i))),i,function _(){return sub(__as_oak_string(i+1))},done))(i)},sub(0)))()},parallel=function parallel(xs=null,f=null,done=null){return ((broken__oak_qm,count)=>((done=__oak_js_default(done,function _(){return null})),(count=0),(broken__oak_qm=false),each(xs,function _(x=null,i=null){return (f(x,i,function _(){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((count=__as_oak_string(count+1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?done():null)(__oak_eq(count,len(xs)))):null)(!broken__oak_qm)},function _(){return ((broken__oak_qm=true),done())}))})))()},debounce=function debounce(duration=null,firstCall=null,f=null){return ((dargs,debounced,target,waiting__oak_qm)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([firstCall=null,f=null]=[Symbol.for('trailing'),firstCall]):null)(__oak_eq(f,null)),(dargs=null),(waiting__oak_qm=false),(target=(time()-duration)),debounced=function debounced(...args){return ((tcall)=>((tcall=time()),(dargs=args),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?((target=__as_oak_string(tcall+duration)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('leading'))?f(...dargs):__oak_eq(__oak_cond,Symbol.for('trailing'))?((waiting__oak_qm=true),wait((target-time()),function _(){return ((waiting__oak_qm=false),f(...dargs))})):null)(firstCall)):((timeout)=>((waiting__oak_qm=true),(timeout=(target-tcall)),(target=__as_oak_string(target+duration)),wait(timeout,function _(){return ((waiting__oak_qm=false),f(...dargs))})))())((target<=tcall)):null)(!waiting__oak_qm)))()}))()},stdin=function stdin(){return ((file)=>((file=__Oak_String('')),loop(function _(__oak_empty_ident0=null,__oak_js_break=null){return ((evt)=>((evt=input()),__oak_push(file,(evt.data??null)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('error'))?__oak_js_break(file):__oak_push(file,__Oak_String('\n')))((evt.type??null))))()})))()},println=function println(...xs){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?print(__Oak_String('\n')):((out)=>((out=reduce(slice(xs,1),string(__oak_acc(xs,0)),function _(acc=null,x=null){return (__as_oak_string(__as_oak_string(acc+__Oak_String(' '))+string(x)))})),print(__as_oak_string(out+__Oak_String('\n')))))())(len(xs))},({_asPredicate,_baseIterator,_hToN,_nToH,aloop,append,clamp,clone,compact,constantly,contains__oak_qm,debounce,__oak_js_default,each,entries,every,exclude,filter,find,first,flatten,fromEntries,fromHex,identity,indexOf,is,join,last,loop,map,merge,once,parallel,partition,println,range,reduce,reverse,rfind,rindexOf,separate,serial,slice,some,stdin,take,takeLast,toHex,uniq,values,zip})))()}),__oak_modularize(__Oak_String('str'),function _(){return ((_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimEndSpace,_trimStartNonEmpty,_trimStartSpace,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,take,takeLast,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm)=>(({__oak_js_default,slice,take,takeLast,reduce}=__oak_module_import(__Oak_String('std'))),checkRange=function checkRange(lo=null,hi=null){let checker;return checker=function checker(c=null){return ((p)=>((p=codepoint(c)),(__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(p<=hi)))((lo<=p))))()}},upper__oak_qm=function upper__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('Z'))))((c>=__Oak_String('A')))},lower__oak_qm=function lower__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('z'))))((c>=__Oak_String('a')))},digit__oak_qm=function digit__oak_qm(c=null){return (__oak_left=>__oak_left===false?false:__oak_and(__oak_left,(c<=__Oak_String('9'))))((c>=__Oak_String('0')))},space__oak_qm=function space__oak_qm(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(' '))?true:__oak_eq(__oak_cond,__Oak_String('\t'))?true:__oak_eq(__oak_cond,__Oak_String('\n'))?true:__oak_eq(__oak_cond,__Oak_String('\r'))?true:__oak_eq(__oak_cond,__Oak_String('\f'))?true:false)(c)},letter__oak_qm=function letter__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,lower__oak_qm(c)))(upper__oak_qm(c))},word__oak_qm=function word__oak_qm(c=null){return (__oak_left=>__oak_left===true?true:__oak_or(__oak_left,digit__oak_qm(c)))(letter__oak_qm(c))},join=function join(strings=null,joiner=null){return ((joiner=__oak_js_default(joiner,__Oak_String(''))),((__oak_cond)=>__oak_eq(__oak_cond,0)?__Oak_String(''):reduce(slice(strings,1),__oak_acc(strings,0),function _(a=null,b=null){return __as_oak_string(__as_oak_string(a+joiner)+b)}))(len(strings)))},startsWith__oak_qm=function startsWith__oak_qm(s=null,prefix=null){return __oak_eq(take(s,len(prefix)),prefix)},endsWith__oak_qm=function endsWith__oak_qm(s=null,suffix=null){return __oak_eq(takeLast(s,len(suffix)),suffix)},_matchesAt__oak_qm=function _matchesAt__oak_qm(s=null,substr=null,idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?true:__oak_eq(__oak_cond,1)?__oak_eq(__oak_acc(s,__oak_obj_key((idx))),substr):((max,sub)=>((max=len(substr)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?true:((__oak_cond)=>__oak_eq(__oak_cond,__oak_acc(substr,__oak_obj_key((i))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):false)(__oak_acc(s,__oak_obj_key((__as_oak_string(idx+i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))())(len(substr))},indexOf=function indexOf(s=null,substr=null){return ((max,sub)=>((max=(len(s)-len(substr))),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?i:((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):-1)((i<max)))(_matchesAt__oak_qm(s,substr,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(s=null,substr=null){return (indexOf(s,substr)>=0)},cut=function cut(s=null,sep=null){let idx;return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?[s,__Oak_String('')]:[slice(s,0,idx),slice(s,__as_oak_string(idx+len(sep)))])((idx=indexOf(s,sep)))},lower=function lower(s=null){return reduce(s,__Oak_String(''),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char(__as_oak_string(codepoint(c)+32))):__oak_push(acc,c))(upper__oak_qm(c))})},upper=function upper(s=null){return reduce(s,__Oak_String(''),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char((codepoint(c)-32))):__oak_push(acc,c))(lower__oak_qm(c))})},_replaceNonEmpty=function _replaceNonEmpty(s=null,old=null,__oak_js_new=null){return ((lnew,lold,sub)=>((lold=len(old)),(lnew=len(__oak_js_new)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(__as_oak_string(slice(acc,0,i)+__oak_js_new)+slice(acc,__as_oak_string(i+lold))),__as_oak_string(i+lnew)):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1)):acc)((i<len(acc))))(_matchesAt__oak_qm(acc,old,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(s,0)))()},replace=function replace(s=null,old=null,__oak_js_new=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?s:_replaceNonEmpty(s,old,__oak_js_new))(old)},_splitNonEmpty=function _splitNonEmpty(s=null,sep=null){return ((coll,lsep,sub)=>((coll=[]),(lsep=len(sep)),sub=function sub(acc=null,i=null,last=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null,last=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(coll,slice(acc,last,i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+lsep),__as_oak_string(i+lsep))):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1),last):__oak_push(coll,slice(acc,last)))((i<len(acc))))(_matchesAt__oak_qm(acc,sep,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i,last)))()},sub(s,0,0)))()},split=function split(s=null,sep=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):__oak_eq(__oak_cond,__Oak_String(''))?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):_splitNonEmpty(s,sep))(sep)},_extend=function _extend(pad=null,n=null){return ((part,sub,times)=>((times=int((n/len(pad)))),(part=(n%len(pad))),sub=function sub(base=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(base=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(base,slice(pad,0,part)):__oak_trampoline(__oak_trampolined_sub,__oak_push(base,pad),(i-1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,base,i)))()},sub(__Oak_String(''),times)))()},padStart=function padStart(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__oak_push(_extend(pad,(n-len(s))),s))((len(s)>=n))},padEnd=function padEnd(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__as_oak_string(s+_extend(pad,(n-len(s)))))((len(s)>=n))},_trimStartSpace=function _trimStartSpace(s=null){return ((firstNonSpace,subStart)=>(subStart=function subStart(i=null){return ((__oak_trampolined_subStart)=>((__oak_trampolined_subStart=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subStart,__as_oak_string(i+1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subStart,i)))()},(firstNonSpace=subStart(0)),slice(s,firstNonSpace)))()},_trimStartNonEmpty=function _trimStartNonEmpty(s=null,prefix=null){return ((idx,lpref,max,sub)=>((max=len(s)),(lpref=len(prefix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+lpref)):i)(_matchesAt__oak_qm(s,prefix,i)):i)((i<max))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(0)),slice(s,idx)))()},trimStart=function trimStart(s=null,prefix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?s:__oak_eq(__oak_cond,null)?_trimStartSpace(s):_trimStartNonEmpty(s,prefix))(prefix)},_trimEndSpace=function _trimEndSpace(s=null){return ((lastNonSpace,subEnd)=>(subEnd=function subEnd(i=null){return ((__oak_trampolined_subEnd)=>((__oak_trampolined_subEnd=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subEnd,(i-1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subEnd,i)))()},(lastNonSpace=subEnd((len(s)-1))),slice(s,0,__as_oak_string(lastNonSpace+1))))()},_trimEndNonEmpty=function _trimEndNonEmpty(s=null,suffix=null){return ((idx,lsuf,sub)=>((lsuf=len(suffix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,(i-lsuf)):i)(_matchesAt__oak_qm(s,suffix,(i-lsuf))):i)((i>-1))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(len(s))),slice(s,0,idx)))()},trimEnd=function trimEnd(s=null,suffix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(''))?s:__oak_eq(__oak_cond,null)?_trimEndSpace(s):_trimEndNonEmpty(s,suffix))(suffix)},trim=function trim(s=null,part=null){return trimEnd(trimStart(s,part),part)},({_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimEndSpace,_trimStartNonEmpty,_trimStartSpace,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,take,takeLast,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm})))()}),(__Oak_Import_Aliases=({})),__oak_module_import(__Oak_String('main.oak')))