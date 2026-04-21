import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const workspaceRoot = path.resolve(process.cwd());
const baselinePath = path.join(
	workspaceRoot,
	"scripts/security/audit-baseline.json",
);

const runAudit = () => {
	let output = "";
	try {
		output = execSync("pnpm audit --audit-level high --json", {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (error) {
		output = error.stdout?.toString() ?? "";
	}
	const firstBrace = output.indexOf("{");
	if (firstBrace === -1) {
		throw new Error("Unable to parse pnpm audit output.");
	}
	return JSON.parse(output.slice(firstBrace));
};

const loadBaseline = () => {
	return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
};

const main = () => {
	const baseline = loadBaseline();
	const audit = runAudit();
	const current = audit.metadata?.vulnerabilities ?? {};

	const currentHigh = Number(current.high ?? 0);
	const currentCritical = Number(current.critical ?? 0);
	const allowedHigh = Number(baseline.allowed.high ?? 0);
	const allowedCritical = Number(baseline.allowed.critical ?? 0);

	const violations = [];
	if (currentCritical > allowedCritical) {
		violations.push(
			`critical increased: current=${currentCritical} allowed=${allowedCritical}`,
		);
	}
	if (currentHigh > allowedHigh) {
		violations.push(`high increased: current=${currentHigh} allowed=${allowedHigh}`);
	}

	if (violations.length > 0) {
		console.error(
			`[security-audit] Policy failed (${violations.join("; ")}). Update dependencies before merge.`,
		);
		process.exit(1);
	}

	console.log(
		`[security-audit] Policy passed (critical=${currentCritical}, high=${currentHigh}, allowedCritical=${allowedCritical}, allowedHigh=${allowedHigh}).`,
	);
};

main();
