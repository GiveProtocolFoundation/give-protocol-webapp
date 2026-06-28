import { jest } from "@jest/globals";
import { render } from "@testing-library/react";
import {
  createMockWeb3,
  createMockWalletAlias,
  createMockAuth,
  createMockProfile,
  createMockTranslation,
  createMockVolunteerVerification,
  mockLogger,
  mockFormatDate,
  mockShortenAddress,
  MockButton,
  MockInput,
  MockCard,
  testAddresses,
  testPropsDefaults,
  setupCommonMocks,
  createMockSupabase,
} from "../mockSetup";

describe("mockSetup", () => {
  describe("createMockWeb3", () => {
    it("returns default mock web3 object", () => {
      const result = createMockWeb3();

      expect(result).toEqual({
        address: null,
        chainId: null,
        isConnected: false,
        connect: expect.any(Function),
        disconnect: expect.any(Function),
        switchChain: expect.any(Function),
      });
    });

    it("applies overrides to default mock", () => {
      const overrides = {
        address: "0x123",
        isConnected: true,
        chainId: 1287,
      };

      const result = createMockWeb3(overrides);

      expect(result.address).toBe("0x123");
      expect(result.isConnected).toBe(true);
      expect(result.chainId).toBe(1287);
      expect(typeof result.connect).toBe("function");
    });
  });

  describe("createMockWalletAlias", () => {
    it("returns default mock wallet alias object", () => {
      const result = createMockWalletAlias();

      expect(result).toEqual({
        alias: null,
        aliases: {},
        isLoading: false,
        loading: false,
        error: null,
        setWalletAlias: expect.any(Function),
        deleteWalletAlias: expect.any(Function),
      });
    });

    it("applies overrides to default mock", () => {
      const overrides = {
        alias: "test-alias",
        isLoading: true,
        aliases: { "0x123": "MyWallet" },
      };

      const result = createMockWalletAlias(overrides);

      expect(result.alias).toBe("test-alias");
      expect(result.isLoading).toBe(true);
      expect(result.aliases).toEqual({ "0x123": "MyWallet" });
    });
  });

  describe("createMockVolunteerVerification", () => {
    it("returns default mock volunteer verification object", () => {
      const result = createMockVolunteerVerification();

      expect(result).toEqual({
        verifyHours: expect.any(Function),
        acceptApplication: expect.any(Function),
        loading: false,
        error: null,
      });
    });

    it("applies overrides to default mock", () => {
      const overrides = {
        loading: true,
        error: "Test error",
      };

      const result = createMockVolunteerVerification(overrides);

      expect(result.loading).toBe(true);
      expect(result.error).toBe("Test error");
    });
  });

  describe("createMockTranslation", () => {
    it("returns default mock translation object", () => {
      const result = createMockTranslation();

      expect(result).toEqual({
        t: expect.any(Function),
      });
    });

    it("t function returns fallback or key", () => {
      const result = createMockTranslation();

      expect(result.t("key")).toBe("key");
      expect(result.t("key", "fallback")).toBe("fallback");
    });

    it("applies overrides to default mock", () => {
      const customT = jest.fn((key: string) => `translated_${key}`);
      const overrides = {
        t: customT,
      };

      const result = createMockTranslation(overrides);

      expect(result.t).toBe(customT);
      result.t("test");
      expect(customT).toHaveBeenCalledWith("test");
    });
  });

  describe("createMockAuth", () => {
    it("returns default mock auth object", () => {
      const result = createMockAuth();

      expect(result).toEqual({
        user: null,
        userType: null,
        signOut: expect.any(Function),
        loading: false,
      });
    });

    it("applies overrides to default mock", () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const overrides = {
        user: mockUser,
        userType: "donor" as const,
        loading: true,
      };

      const result = createMockAuth(overrides);

      expect(result.user).toBe(mockUser);
      expect(result.userType).toBe("donor");
      expect(result.loading).toBe(true);
    });
  });

  describe("createMockProfile", () => {
    it("returns default mock profile object", () => {
      const result = createMockProfile();

      expect(result).toEqual({
        profile: null,
        loading: false,
        error: null,
        refetch: expect.any(Function),
      });
    });

    it("applies overrides to default mock", () => {
      const profile = { id: "123", name: "Test User" };
      const overrides = {
        profile,
        loading: true,
        error: "Test error",
      };

      const result = createMockProfile(overrides);

      expect(result.profile).toBe(profile);
      expect(result.loading).toBe(true);
      expect(result.error).toBe("Test error");
    });
  });

  describe("mockLogger", () => {
    it("provides mock logger methods", () => {
      expect(typeof mockLogger.error).toBe("function");
      expect(typeof mockLogger.info).toBe("function");
      expect(typeof mockLogger.warn).toBe("function");
    });

    it("logger methods can be called without errors", () => {
      expect(() => mockLogger.error("test")).not.toThrow();
      expect(() => mockLogger.info("test")).not.toThrow();
      expect(() => mockLogger.warn("test")).not.toThrow();
    });
  });

  describe("mockFormatDate", () => {
    it("formats date with mock implementation", () => {
      const result = mockFormatDate(new Date("2024-01-01"));
      expect(result).toContain("Formatted:");
    });

    it("handles string dates", () => {
      const result = mockFormatDate("2024-01-01");
      expect(result).toBe("Formatted: 2024-01-01");
    });
  });

  describe("mockShortenAddress", () => {
    it("shortens address with default length", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      const result = mockShortenAddress(address);
      expect(result).toBe("0x1234...5678");
    });

    it("always uses fixed 6+4 chars regardless of extra args", () => {
      const address = "0x1234567890abcdef1234567890abcdef12345678";
      // The mock implementation uses fixed slice(0,6) and slice(-4)
      const result = mockShortenAddress(address, 6);
      expect(result).toBe("0x1234...5678");
    });
  });

  describe("setupCommonMocks", () => {
    it("sets up common mocks without throwing", () => {
      setupCommonMocks();
      expect(() => setupCommonMocks()).not.toThrow();
    });
  });

  describe("createMockSupabase", () => {
    it("creates mock supabase client with default responses", () => {
      const client = createMockSupabase();

      expect(typeof client.from).toBe("function");

      const result = client.from("test_table");
      expect(typeof result.select).toBe("function");
    });

    it("creates mock supabase client with custom responses", () => {
      const customResponses = {
        users: { data: [{ id: "123", name: "Test" }], error: null },
      };

      const client = createMockSupabase(customResponses);
      const result = client.from("users");

      expect(typeof result.select).toBe("function");
    });

    it("supports chained query methods", () => {
      const client = createMockSupabase();
      const query = client.from("test_table").select();

      expect(typeof query.eq).toBe("function");
      expect(typeof query.order).toBe("function");
      expect(typeof query.single).toBe("function");
    });

    it("supports nested eq and single methods", async () => {
      const client = createMockSupabase();
      const result = await client
        .from("test_table")
        .select()
        .eq("id", "123")
        .single();

      expect(result).toEqual({ data: [], error: null });
    });
  });

  describe("Mock Components", () => {
    it("MockButton renders children", () => {
      const { getByText } = render(<MockButton>Click me</MockButton>);
      expect(getByText("Click me")).toBeInTheDocument();
    });

    it("MockInput renders with placeholder", () => {
      const { getByPlaceholderText } = render(
        <MockInput placeholder="Enter text" />,
      );
      expect(getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("MockCard renders children", () => {
      const { getByText } = render(<MockCard>Card content</MockCard>);
      expect(getByText("Card content")).toBeInTheDocument();
    });
  });

  describe("Test Constants", () => {
    it("testAddresses contains valid addresses", () => {
      expect(testAddresses.mainWallet).toBeDefined();
      expect(testAddresses.shortAddress).toBeDefined();
      expect(testAddresses.mainWallet).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it("testPropsDefaults contains default prop values", () => {
      expect(testPropsDefaults.applicationAcceptance).toBeDefined();
      expect(testPropsDefaults.applicationAcceptance.applicationId).toBe(
        "app-123",
      );
      expect(testPropsDefaults.volunteerHours).toBeDefined();
      expect(testPropsDefaults.volunteerHours.hours).toBe(8);
    });
  });
});
