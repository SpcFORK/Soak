const { Soak } = require("./dist/soak.js");

const test = [
  ["# 1", 0, 1],
  ["# 1", 1, 2],
  ["hkcub", 2, 3],
];

// ---

console.log('')
console.time('test')

const env = Soak();
env.load(test);

// env.jit() |> std.println()
// std.println()
// std.println('---')
// env.Env |> keys() |> len() |> std.println('is the amm of made ops!')

console.log(env.jit(), "\n", "---", "\n", Object.keys(env.Env).length);

console.timeEnd('test')