import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../app";
import { disconnectPrisma, getPrisma } from "../lib/prisma";

type ApiResponse<T> = {
  status: number;
  body: T;
};

type RoomSnapshot = {
  code: string;
  phase: string;
  generation: { status: string; step: string | null; errorCode: string | null };
  scenario?: {
    characters: Array<Record<string, unknown>>;
    clues: Array<Record<string, unknown>>;
    truth?: unknown;
  };
  me?: { characterId: string | null; hasVoted: boolean };
  voteProgress?: { submittedCount: number; totalCount: number };
  voteResults?: Array<{ characterId: string; voteCount: number }>;
};

type CreatedRoom = { room: RoomSnapshot; hostToken: string };
type JoinedPlayer = { playerToken: string; room: RoomSnapshot };
type ApiError = { error: { code: string } };
type LibraryItem = {
  id: string;
  playerCount: number;
  title: string;
  theme: string;
  intro: string;
  source: string;
  createdAt: string;
};

const runNeonSmoke = process.env.RUN_NEON_SMOKE === "true";
const describeNeon = runNeonSmoke ? describe : describe.skip;

describeNeon("Neon-backed API smoke", () => {
  let baseUrl = "";
  let server: ReturnType<typeof app.listen> | undefined;
  const createdRoomCodes: string[] = [];

  const call = async <T>(
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: object;
    } = {},
  ): Promise<ApiResponse<T>> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    return { status: response.status, body: (await response.json()) as T };
  };

  beforeAll(async () => {
    const prisma = getPrisma();
    const seededScenario = await prisma.scenario.findUnique({
      where: { id: "manual-four-mansion-1920" },
      select: { id: true },
    });
    if (!seededScenario) {
      throw new Error(
        "Manual scenarios are not seeded. Run `pnpm --filter @alibi/api db:seed` before the Neon smoke test.",
      );
    }

    server = await new Promise<ReturnType<typeof app.listen>>(
      (resolve, reject) => {
        const started = app.listen(0, "127.0.0.1", () => resolve(started));
        started.once("error", reject);
      },
    );
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    try {
      if (createdRoomCodes.length > 0) {
        await getPrisma().room.deleteMany({
          where: { code: { in: createdRoomCodes } },
        });
      }
    } finally {
      await disconnectPrisma();
      await new Promise<void>((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("keeps the game lifecycle and all player data on the server-side authorization boundary", async () => {
    const health = await call<{ status: string }>("/health");
    expect(health).toEqual({ status: 200, body: { status: "ok" } });

    const library = await call<LibraryItem[]>("/api/scenarios?playerCount=4");
    expect(library.status).toBe(200);
    const scenario = library.body.find(
      (candidate) => candidate.id === "manual-four-mansion-1920",
    );
    expect(scenario).toBeDefined();
    expect(Object.keys(scenario ?? {}).sort()).toEqual([
      "createdAt",
      "id",
      "intro",
      "playerCount",
      "source",
      "theme",
      "title",
    ]);
    expect(JSON.stringify(library.body)).not.toContain("privateScript");
    expect(JSON.stringify(library.body)).not.toContain("pointsTo");
    expect(JSON.stringify(library.body)).not.toContain("isCulprit");
    expect(JSON.stringify(library.body)).not.toContain('"truth"');

    const created = await call<CreatedRoom>("/api/rooms", {
      method: "POST",
      body: { scenarioId: scenario?.id },
    });
    expect(created.status).toBe(201);
    const hostToken = created.body.hostToken;
    const roomCode = created.body.room.code;
    createdRoomCodes.push(roomCode);
    expect(created.body.room.phase).toBe("lobby");
    expect(created.body.room.generation).toEqual({
      status: "ready",
      step: null,
      errorCode: null,
    });

    const publicLobby = await call<RoomSnapshot>(`/api/rooms/${roomCode}`);
    expect(publicLobby.status).toBe(200);
    expect(publicLobby.body.scenario?.truth).toBeUndefined();
    expect(JSON.stringify(publicLobby.body.scenario)).not.toContain("privateScript");
    expect(JSON.stringify(publicLobby.body.scenario)).not.toContain("pointsTo");
    expect(JSON.stringify(publicLobby.body.scenario)).not.toContain("isCulprit");

    const joinedPlayers: JoinedPlayer[] = [];
    for (const nickname of ["A", "B", "C", "D"]) {
      const joined = await call<JoinedPlayer>(`/api/rooms/${roomCode}/players`, {
        method: "POST",
        body: { nickname },
      });
      expect(joined.status).toBe(201);
      joinedPlayers.push(joined.body);
    }
    const overCapacity = await call<ApiError>(`/api/rooms/${roomCode}/players`, {
      method: "POST",
      body: { nickname: "E" },
    });
    expect(overCapacity).toMatchObject({ status: 409, body: { error: { code: "ROOM_FULL" } } });

    const assignments = await call<RoomSnapshot>(`/api/rooms/${roomCode}/assignments`, {
      method: "POST",
      headers: { "x-host-token": hostToken },
    });
    expect(assignments.status).toBe(200);
    expect(assignments.body.phase).toBe("lobby");

    const reading = await call<RoomSnapshot>(`/api/rooms/${roomCode}/phase`, {
      method: "PATCH",
      headers: {
        "x-host-token": hostToken,
        authorization: `Bearer ${joinedPlayers[0].playerToken}`,
      },
      body: { phase: "reading" },
    });
    expect(reading.status).toBe(200);
    expect(reading.body.phase).toBe("reading");
    expect(reading.body.scenario?.truth).toBeUndefined();
    const ownCharacterId = reading.body.me?.characterId;
    expect(ownCharacterId).toBeTruthy();
    const ownCharacter = reading.body.scenario?.characters.find(
      (character) => character.id === ownCharacterId,
    );
    const otherCharacters = reading.body.scenario?.characters.filter(
      (character) => character.id !== ownCharacterId,
    );
    expect(ownCharacter).toMatchObject({
      privateScript: expect.any(String),
      secret: expect.any(String),
      objectives: expect.any(Array),
    });
    expect(otherCharacters?.every((character) => !("privateScript" in character))).toBe(true);
    expect(otherCharacters?.every((character) => !("secret" in character))).toBe(true);
    expect(JSON.stringify(reading.body.scenario)).not.toContain("isCulprit");
    expect(JSON.stringify(reading.body.scenario)).not.toContain("pointsTo");

    const unauthorizedRead = await call<ApiError>(`/api/rooms/${roomCode}`, {
      headers: { authorization: "Bearer not-a-real-token" },
    });
    expect(unauthorizedRead).toMatchObject({
      status: 401,
      body: { error: { code: "UNAUTHORIZED" } },
    });

    for (const phase of ["investigation", "discussion", "voting"]) {
      const transitioned = await call<RoomSnapshot>(`/api/rooms/${roomCode}/phase`, {
        method: "PATCH",
        headers: { "x-host-token": hostToken },
        body: { phase },
      });
      expect(transitioned).toMatchObject({ status: 200, body: { phase } });
    }

    const characterIds = reading.body.scenario?.characters.map((character) => String(character.id));
    expect(characterIds).toHaveLength(4);
    const firstVote = await call<{ targetCharacterId: string; hasVoted: boolean }>(
      `/api/rooms/${roomCode}/vote`,
      {
        method: "PUT",
        headers: { authorization: `Bearer ${joinedPlayers[0].playerToken}` },
        body: { targetCharacterId: characterIds?.[0] },
      },
    );
    expect(firstVote).toMatchObject({ status: 200, body: { hasVoted: true } });
    const changedVote = await call<{ targetCharacterId: string; hasVoted: boolean }>(
      `/api/rooms/${roomCode}/vote`,
      {
        method: "PUT",
        headers: { authorization: `Bearer ${joinedPlayers[0].playerToken}` },
        body: { targetCharacterId: characterIds?.[1] },
      },
    );
    expect(changedVote).toMatchObject({
      status: 200,
      body: { targetCharacterId: characterIds?.[1], hasVoted: true },
    });
    for (const player of joinedPlayers.slice(1)) {
      const vote = await call<{ hasVoted: boolean }>(`/api/rooms/${roomCode}/vote`, {
        method: "PUT",
        headers: { authorization: `Bearer ${player.playerToken}` },
        body: { targetCharacterId: characterIds?.[0] },
      });
      expect(vote).toMatchObject({ status: 200, body: { hasVoted: true } });
    }

    const votingHostView = await call<RoomSnapshot>(`/api/rooms/${roomCode}`, {
      headers: { "x-host-token": hostToken },
    });
    expect(votingHostView).toMatchObject({
      status: 200,
      body: { voteProgress: { submittedCount: 4, totalCount: 4 } },
    });

    const reveal = await call<RoomSnapshot>(`/api/rooms/${roomCode}/phase`, {
      method: "PATCH",
      headers: { "x-host-token": hostToken },
      body: { phase: "reveal" },
    });
    expect(reveal.status).toBe(200);
    expect(reveal.body.scenario?.truth).toBeDefined();
    expect(reveal.body.voteResults?.find((result) => result.characterId === characterIds?.[0]))
      .toMatchObject({ voteCount: 3 });
    expect(reveal.body.voteResults?.find((result) => result.characterId === characterIds?.[1]))
      .toMatchObject({ voteCount: 1 });

    const generationDisabled = await call<ApiError>("/api/rooms/generate", {
      method: "POST",
      headers: { "x-generation-key": "irrelevant-when-disabled" },
      body: { theme: "test", playerCount: 4 },
    });
    expect(generationDisabled).toMatchObject({
      status: 403,
      body: { error: { code: "LLM_DISABLED" } },
    });
  }, 30_000);

  it("rejects fallback until a generated room has actually failed, then attaches a compatible stored scenario", async () => {
    const created = await call<CreatedRoom>("/api/rooms", {
      method: "POST",
      body: { scenarioId: "manual-four-mansion-1920" },
    });
    expect(created.status).toBe(201);
    createdRoomCodes.push(created.body.room.code);

    const prematureFallback = await call<ApiError>(
      `/api/rooms/${created.body.room.code}/scenario`,
      {
        method: "POST",
        headers: { "x-host-token": created.body.hostToken },
        body: { scenarioId: "manual-four-mansion-1920" },
      },
    );
    expect(prematureFallback).toMatchObject({
      status: 409,
      body: { error: { code: "GENERATION_NOT_FAILED" } },
    });

    await getPrisma().room.update({
      where: { code: created.body.room.code },
      data: {
        scenarioId: null,
        generationStatus: "failed",
        generationError: "TEST_GENERATION_FAILED",
      },
    });
    const fallback = await call<RoomSnapshot>(
      `/api/rooms/${created.body.room.code}/scenario`,
      {
        method: "POST",
        headers: { "x-host-token": created.body.hostToken },
        body: { scenarioId: "manual-four-mansion-1920" },
      },
    );
    expect(fallback).toMatchObject({
      status: 200,
      body: { generation: { status: "ready", step: null, errorCode: null } },
    });
    expect(JSON.stringify(fallback.body.scenario)).not.toContain("privateScript");
    expect(JSON.stringify(fallback.body.scenario)).not.toContain("pointsTo");
  });
});
