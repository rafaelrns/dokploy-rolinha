import {
	calculateResources,
	generateConfigContainer,
} from "@dokploy/server/utils/docker/utils";
import { describe, expect, it } from "vitest";

describe("Swarm resilience defaults", () => {
	it("applies default resource limits for application profile", () => {
		const resources = calculateResources(
			{
				memoryLimit: null,
				memoryReservation: null,
				cpuLimit: null,
				cpuReservation: null,
			},
			"application",
		);

		expect(resources.Limits?.MemoryBytes).toBeTypeOf("number");
		expect(resources.Limits?.NanoCPUs).toBeTypeOf("number");
		expect(resources.Reservations?.MemoryBytes).toBeTypeOf("number");
		expect(resources.Reservations?.NanoCPUs).toBeTypeOf("number");
	});

	it("applies stronger default resource limits for database profile", () => {
		const resources = calculateResources(
			{
				memoryLimit: null,
				memoryReservation: null,
				cpuLimit: null,
				cpuReservation: null,
			},
			"database",
		);

		expect((resources.Limits?.MemoryBytes || 0) >= 1073741824).toBe(true);
		expect((resources.Limits?.NanoCPUs || 0) >= 1000000000).toBe(true);
	});

	it("sets restart policy by default for recovery after reboot", () => {
		const config = generateConfigContainer({
			mounts: [],
			replicas: 1,
		} as any);

		expect(config.RestartPolicy).toBeDefined();
		expect(config.RestartPolicy?.Condition).toBe("any");
	});
});
