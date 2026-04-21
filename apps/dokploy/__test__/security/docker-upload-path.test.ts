import { normalizeContainerDestinationPath } from "@dokploy/server/services/docker";
import { describe, expect, it } from "vitest";

describe("normalizeContainerDestinationPath", () => {
	it("normalizes relative destination path", () => {
		expect(normalizeContainerDestinationPath("app/config")).toBe("/app/config");
	});

	it("accepts already absolute path", () => {
		expect(normalizeContainerDestinationPath("/etc/nginx/conf.d")).toBe(
			"/etc/nginx/conf.d",
		);
	});

	it("rejects path traversal attempts", () => {
		expect(() => normalizeContainerDestinationPath("../etc/passwd")).toThrow(
			"Invalid destination path",
		);
		expect(() => normalizeContainerDestinationPath("/tmp/../root")).toThrow(
			"Invalid destination path",
		);
	});

	it("rejects unsafe shell characters", () => {
		expect(() => normalizeContainerDestinationPath('/tmp/a"$(id)"')).toThrow(
			"Invalid destination path",
		);
		expect(() => normalizeContainerDestinationPath("/tmp/test;rm -rf /")).toThrow(
			"Invalid destination path",
		);
	});
});
