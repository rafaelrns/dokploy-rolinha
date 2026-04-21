import { db } from "@dokploy/server/db";
import { findServerByIdForOrganization } from "@dokploy/server/services/server";
import { describe, expect, it, vi } from "vitest";

describe("findServerByIdForOrganization", () => {
	it("returns server when organization matches", async () => {
		vi.mocked(db.query.server.findFirst).mockResolvedValueOnce({
			serverId: "srv-1",
			organizationId: "org-1",
		} as any);

		const result = await findServerByIdForOrganization("srv-1", "org-1");

		expect(result.serverId).toBe("srv-1");
	});

	it("throws unauthorized when organization differs", async () => {
		vi.mocked(db.query.server.findFirst).mockResolvedValueOnce({
			serverId: "srv-1",
			organizationId: "org-2",
		} as any);

		await expect(
			findServerByIdForOrganization("srv-1", "org-1"),
		).rejects.toThrow("You don't have access to this server");
	});
});
