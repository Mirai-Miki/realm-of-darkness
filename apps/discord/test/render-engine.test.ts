import { MessageFlags } from "discord.js";
import { RealmError } from "@realm/common";
import { InteractionDispatcher } from "../src/framework";
import {
  ActionBannerComponent,
  DividerComponent,
  ErrorAlertRecipe,
  TextBlockComponent,
  normalizeFragment,
  renderEngine,
} from "../src/ui";
import type { RepliableInteraction } from "discord.js";
import type { ScreenRecipe } from "../src/ui";

describe("Pure RenderEngine & InteractionDispatcher (@realm/discord)", () => {
  describe("normalizeFragment (Layout Sanitization & Separator Deduplication)", () => {
    it("should flatten nested arrays, strip falsy conditionals, and collapse adjacent/edge dividers", () => {
      const showHidden = false;
      const fragment = [
        DividerComponent(), // Leading divider (should be stripped)
        showHidden ? TextBlockComponent({ content: "Hidden" }) : false,
        null,
        undefined,
        [
          TextBlockComponent({ content: "Section 1" }),
          DividerComponent(),
          null, // Conditional component returned null between two dividers!
          DividerComponent(), // Consecutive divider (should collapse into 1)
          TextBlockComponent({ content: "Section 2" }),
        ],
        DividerComponent(), // Trailing divider (should be stripped)
      ];

      const nodes = normalizeFragment(fragment);

      expect(nodes).toHaveLength(3); // Section 1, single Divider, Section 2
    });

    it("should throw a RealmError if the normalized fragment is empty", () => {
      expect(() =>
        normalizeFragment([null, undefined, false, DividerComponent()])
      ).toThrow(RealmError);
    });
  });

  describe("RenderEngine.build (100% Pure Envelope Assembly)", () => {
    it("should build a primary message and filter out falsy conditional followUps", () => {
      const TestRecipe: ScreenRecipe<{
        includeFollowUp: boolean;
        banner?: string;
      }> = (props) => ({
        primary: {
          ephemeral: false,
          body: [
            ActionBannerComponent({ text: props.banner }),
            TextBlockComponent({ content: "Primary Roll Result" }),
          ],
        },
        followUps: [
          props.includeFollowUp && {
            ephemeral: true,
            body: TextBlockComponent({
              content: "Updated Character Trackers",
            }),
          },
        ],
      });

      const withoutFollowUp = renderEngine.build(TestRecipe, {
        includeFollowUp: false,
      });
      expect(withoutFollowUp.kind).toBe("message");
      if (withoutFollowUp.kind === "message") {
        expect(withoutFollowUp.primary.ephemeral).toBe(false);
        expect(withoutFollowUp.primary.components).toHaveLength(1);
        expect(withoutFollowUp.followUps).toHaveLength(0);
      }

      const withFollowUp = renderEngine.build(TestRecipe, {
        includeFollowUp: true,
        banner: "Critical Success!",
      });
      expect(withFollowUp.kind).toBe("message");
      if (withFollowUp.kind === "message") {
        expect(withFollowUp.primary.components).toHaveLength(2);
        expect(withFollowUp.followUps).toHaveLength(1);
        expect(withFollowUp.followUps[0]?.ephemeral).toBe(true);
      }
    });
  });

  describe("InteractionDispatcher (Discord API Delivery Layer)", () => {
    const dispatcher = new InteractionDispatcher();

    it("should call reply() for unacknowledged slash commands and followUp() for secondary messages", async () => {
      const replyCalls: unknown[] = [];
      const followUpCalls: unknown[] = [];

      const mockInteraction = {
        deferred: false,
        replied: false,
        isMessageComponent: () => false,
        reply: async (payload: unknown) => {
          replyCalls.push(payload);
          return Promise.resolve();
        },
        followUp: async (payload: unknown) => {
          followUpCalls.push(payload);
          return Promise.resolve();
        },
      } as unknown as RepliableInteraction;

      const MultiMessageRecipe: ScreenRecipe<void> = () => ({
        primary: {
          ephemeral: false,
          body: TextBlockComponent({ content: "Public Roll" }),
        },
        followUps: [
          {
            ephemeral: true,
            body: TextBlockComponent({ content: "Ephemeral Tracker Update" }),
          },
        ],
      });

      const envelope = renderEngine.build(MultiMessageRecipe, undefined);
      await dispatcher.dispatch(mockInteraction, envelope);

      expect(replyCalls).toHaveLength(1);
      expect(followUpCalls).toHaveLength(1);
      expect((replyCalls[0] as { flags: number }).flags).toBe(
        MessageFlags.IsComponentsV2
      );
      expect((followUpCalls[0] as { flags: number }).flags).toBe(
        MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      );
    });

    it("should call update() for unacknowledged message component interactions when delivery is auto", async () => {
      const updateCalls: unknown[] = [];

      const mockComponentInteraction = {
        deferred: false,
        replied: false,
        isMessageComponent: () => true,
        update: async (payload: unknown) => {
          updateCalls.push(payload);
          return Promise.resolve();
        },
      } as unknown as RepliableInteraction;

      const envelope = renderEngine.build(ErrorAlertRecipe, {
        message: "Test",
        isUserError: true,
      });

      // Override delivery to auto to test component in-place update
      if (envelope.kind === "message") {
        await dispatcher.dispatch(mockComponentInteraction, {
          ...envelope,
          primary: {
            ...envelope.primary,
            delivery: "auto",
          },
        });
      }

      expect(updateCalls).toHaveLength(1);
    });

    it("should call editReply() when interaction is already deferred", async () => {
      const editReplyCalls: unknown[] = [];

      const mockDeferredInteraction = {
        deferred: true,
        replied: false,
        isMessageComponent: () => false,
        editReply: async (payload: unknown) => {
          editReplyCalls.push(payload);
          return Promise.resolve();
        },
      } as unknown as RepliableInteraction;

      const envelope = renderEngine.build(ErrorAlertRecipe, {
        message: "Deferred error",
        isUserError: true,
      });

      await dispatcher.dispatch(mockDeferredInteraction, envelope);
      expect(editReplyCalls).toHaveLength(1);
    });
  });
});
