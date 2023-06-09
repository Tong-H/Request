import typescript from "@rollup/plugin-typescript"

export default {
	input: "src/index.ts",
	output: {
		file: "bundle.js",
		format: "cjs",
		sourcemap: true
	},
	plugins: [typescript({ compilerOptions: { lib: ["es5", "es6", "dom"], target: "es5" } })],
}
