import { MessageFlags } from "discord.js";
import { RealmError } from "@realm/common";
import type {
  MessageComponentInteraction,
  ModalSubmitInteraction,
  RepliableInteraction,
} from "discord.js";
import type {
  NormalizedMessagePayload,
  NormalizedRenderEnvelope,
} from "../../ui";

/**
 * Union of all Discord interaction types that can receive a dispatched response.
 */
export type DispatchableInteraction =
  RepliableInteraction | MessageComponentInteraction | ModalSubmitInteraction;

/**
 * Dedicated Discord API Delivery Layer (`InteractionDispatcher`).
 *
 * Completely decoupled from `RenderEngine`:
 * - `RenderEngine` is 100% pure UI assembly and returns a `NormalizedRenderEnvelope`.
 * - `InteractionDispatcher` is called by `InteractionRouter` at the end of an interaction
 *   to inspect the live Discord `Interaction` state (`deferred`, `replied`, `isMessageComponent`)
 *   and execute the appropriate Discord.js API calls (`reply`, `update`, `editReply`, `showModal`,
 *   and `0..N` `followUp`s).
 */
export class InteractionDispatcher {
  /**
   * Dispatches a `NormalizedRenderEnvelope` to Discord for the given interaction.
   *
   * @param interaction - The repliable Discord interaction
   * @param envelope - The normalized render envelope produced by `RenderEngine.build()`
   * @throws {RealmError} If attempting to show a modal on an already-deferred interaction
   *
   * @example
   * ```typescript
   * await interactionDispatcher.dispatch(interaction, envelope);
   * ```
   */
  public async dispatch(
    interaction: DispatchableInteraction,
    envelope: NormalizedRenderEnvelope
  ): Promise<void> {
    if (envelope.kind === "modal") {
      if (interaction.deferred || interaction.replied) {
        throw new RealmError(
          "Cannot display a Discord Modal on an interaction that was already deferred or replied to"
        );
      }
      if ("showModal" in interaction) {
        await interaction.showModal(envelope.modal);
        return;
      }
      throw new RealmError(
        "Interaction type does not support displaying a Discord Modal"
      );
    }

    await this.dispatchPrimary(interaction, envelope.primary);

    for (const followUpPayload of envelope.followUps) {
      await this.dispatchFollowUp(interaction, followUpPayload);
    }
  }

  /**
   * Delivers the primary message payload based on whether the interaction has already
   * been deferred/replied or is an unacknowledged component/command interaction.
   */
  private async dispatchPrimary(
    interaction: DispatchableInteraction,
    payload: NormalizedMessagePayload
  ): Promise<void> {
    const components = [...payload.components];

    // If the interaction was already deferred or replied to, edit the existing reply
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        components,
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // If this is a button/select interaction and delivery is not forced to "reply",
    // update the component's parent message in place
    if (interaction.isMessageComponent() && payload.delivery !== "reply") {
      await interaction.update({
        components,
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    // Otherwise, send a brand new reply (with Ephemeral flag if configured)
    const flags = payload.ephemeral
      ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      : MessageFlags.IsComponentsV2;

    await interaction.reply({
      components,
      flags,
    });
  }

  /**
   * Delivers a secondary follow-up message via `interaction.followUp()`.
   */
  private async dispatchFollowUp(
    interaction: DispatchableInteraction,
    payload: NormalizedMessagePayload
  ): Promise<void> {
    const components = [...payload.components];
    const flags = payload.ephemeral
      ? MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      : MessageFlags.IsComponentsV2;

    await interaction.followUp({
      components,
      flags,
    });
  }
}

/**
 * Shared singleton instance of `InteractionDispatcher`.
 */
export const interactionDispatcher = new InteractionDispatcher();
