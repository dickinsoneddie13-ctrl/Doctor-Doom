import {
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  PermissionsBitField,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type Interaction,
  type Message,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type VoiceState,
} from "discord.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger";

const ROLE_OPTIONS = [
  {
    label: "Vanguard (Tanque)",
    value: "Vanguard",
    emoji: { name: "vanguard2", id: "1552903419566497903" },
  },
  {
    label: "Duelist (DPS)",
    value: "Duelist",
    emoji: { name: "duelist2", id: "1552903434728906752" },
  },
  {
    label: "Strategist (Soporte)",
    value: "Strategist",
    emoji: { name: "strategist2", id: "1552903394837143643" },
  },
] as const;

const ROLE_ORDER = ["Vanguard", "Duelist", "Strategist"] as const;
type CharacterRole = (typeof ROLE_ORDER)[number];

type CharacterOption = {
  name: string;
  value: string;
  emojiName: string;
  emojiId: string | undefined;
  iconFileName?: string;
  fallbackEmoji: string;
};

const CHARACTER_EMOJI_IDS: Record<string, string> = {
  "Black Cat": "1554613230456934472",
  Punisher: "1558283246205411428",
};

function makeCharacterOption(
  role: CharacterRole,
  name: string,
  iconFileName?: string,
): CharacterOption {
  const emojiSlug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    name,
    value: name,
    emojiName: `mvr_${emojiSlug}`,
    emojiId: CHARACTER_EMOJI_IDS[name],
    ...(iconFileName ? { iconFileName } : {}),
    fallbackEmoji:
      role === "Vanguard" ? "🛡️" : role === "Duelist" ? "⚔️" : "🔮",
  };
}

function normalizeDiscordEmojiName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^mvr_?/, "")
    .replace(/[^a-z0-9]/g, "");
}

const CHARACTER_ICON_FILES = {
  "Adam Warlock": "Adam_Warlock_Deluxe_Avatar_1790089247601.webp",
  Angela: "Angela_Deluxe_Avatar_1790089256701.webp",
  "Black Panther": "Black_Panther_Deluxe_Avatar_1790718634008.webp",
  "Black Widow": "Black_Widow_Deluxe_Avatar_1790718721228.webp",
  Blade: "Blade_Deluxe_Avatar_1790089425547.webp",
  "Capitán América": "Captain_America_Deluxe_Avatar_1790718733923.webp",
  Cyclops: "item_herohead_21063020_1790089294853.webp",
  "Cloak & Dagger": "Cloak_&_Dagger_Deluxe_Avatar_1790719387424.webp",
  Daredevil: "Daredevil_Deluxe_Avatar_1790719318771.webp",
  "Deadpool": "item_herohead_21057020_1790718623951.webp",
  "Devil Dinosaur": "item_herohead_21062020_1790089301266.webp",
  "Doctor Strange": "Doctor_Strange_Deluxe_Avatar_1790719423064.webp",
  "Elsa Bloodstone": "item_herohead_21059020_1790718607570.webp",
  "Emma Frost": "Emma_Frost_Deluxe_Avatar_1790719416729.webp",
  Gambit: "Gambit_Deluxe_Avatar_1790719411001.webp",
  Gorr: "Lord_Icon_Gorr_1790718561458.webp",
  Groot: "Groot_Deluxe_Avatar_1790089440275.webp",
  Hawkeye: "Hawkeye_Deluxe_Avatar_1790719405038.webp",
  Hela: "Hela_Deluxe_Avatar_1790719380624.webp",
  Hulk: "Hero_Hulk_Deluxe_Avatar_1790719395777.webp",
  "Human Torch": "Human_Torch_Deluxe_Avatar_1790719442935.webp",
  "Invisible Woman": "Invisible_Woman_Deluxe_Avatar_1790719364158.webp",
  "Iron Fist": "Iron_Fist_Deluxe_Avatar_1790719370480.webp",
  "Iron Man": "Iron_Man_Deluxe_Avatar_1790719359982.webp",
  Jeff: "Jeff_the_Land_Shark_Deluxe_Avatar_1790719353589.webp",
  Jubilee: "item_herohead_21064020_1790089289609.webp",
  Loki: "Loki_Deluxe_Avatar_1790719349451.webp",
  "Luna Snow": "Luna_Snow_Deluxe_Avatar_1790719343174.webp",
  Magik: "Magik_Deluxe_Avatar_1790719338161.webp",
  Magneto: "Magneto_Deluxe_Avatar_1790719333229.webp",
  Mantis: "Mantis_Deluxe_Avatar_1790719323557.webp",
  "Mister Fantastic": "Mister_Fantastic_Deluxe_Avatar_1790719328277.webp",
  "Peni Parker": "Peni_Parker_Deluxe_Avatar_1790719312173.webp",
  Phoenix: "item_herohead_21054020_1790718618645.webp",
  Psylocke: "Psylocke_Deluxe_Avatar_1790718740526.webp",
  Rogue: "Lord_Icon_Rogue_1790720715310.webp",
  "Rocket Raccoon": "Rocket_Raccoon_Deluxe_Avatar_1790718707833.webp",
  "Scarlet Witch": "Scarlet_Witch_Deluxe_Avatar_1790718697968.webp",
  "Spider-Man": "Spider-Man_Deluxe_Avatar_1790718692752.webp",
  "Squirrel Girl": "Squirrel_Girl_Deluxe_Avatar_1790718686741.webp",
  "Star-Lord": "Star-Lord_Deluxe_Avatar_1790089454803.webp",
  Storm: "Storm_Deluxe_Avatar_1790089348428.webp",
  "The Hood": "Lord_Icon_The_Hood_1790720729808.webp",
  "The Thing": "The_Thing_Deluxe_Avatar_1790718674627.webp",
  Thor: "Thor_Deluxe_Avatar_1790718669845.png",
  Ultron: "Ultron_Deluxe_Avatar_1790089471848.webp",
  Venom: "Venom_Deluxe_Avatar_1790718664560.webp",
  "White Fox": "item_herohead_21060020_1790089355497.webp",
  "Winter Soldier": "Winter_Soldier_Deluxe_Avatar_1790718659591.webp",
  Wolverine: "Wolverine_Deluxe_Avatar_1790089404192.webp",
} satisfies Record<string, string>;

const CHARACTER_EMOJI_NAME_OVERRIDES: Record<string, string> = {
  Daredevil: "mvr_daredevil_v2",
  "Emma Frost": "mvr_emma_frost_v2",
  "Invisible Woman": "mvr_invisible_woman_v2",
  Punisher: "mvr_punisher",
};

function character(role: CharacterRole, name: string) {
  const iconFileName = (CHARACTER_ICON_FILES as Record<string, string>)[name];
  const option = makeCharacterOption(role, name, iconFileName);
  option.emojiName = CHARACTER_EMOJI_NAME_OVERRIDES[name] ?? option.emojiName;
  return option;
}

const CHARACTERS_LIST: Record<CharacterRole, CharacterOption[]> = {
  Vanguard: [
    character("Vanguard", "Hulk"),
    character("Vanguard", "Venom"),
    character("Vanguard", "The Hood"),
    character("Vanguard", "Peni Parker"),
    character("Vanguard", "Angela"),
    character("Vanguard", "The Thing"),
    character("Vanguard", "Doctor Strange"),
    character("Vanguard", "Capitán América"),
    character("Vanguard", "Emma Frost"),
    character("Vanguard", "Thor"),
    character("Vanguard", "Groot"),
    character("Vanguard", "Magneto"),
    character("Vanguard", "Deadpool"),
    character("Vanguard", "Devil Dinosaur"),
    character("Vanguard", "Rogue"),
  ],
  Duelist: [
    character("Duelist", "Iron Man"),
    character("Duelist", "Magik"),
    character("Duelist", "Spider-Man"),
    character("Duelist", "Hela"),
    character("Duelist", "Black Panther"),
    character("Duelist", "Black Widow"),
    character("Duelist", "Blade"),
    character("Duelist", "Cyclops"),
    character("Duelist", "Daredevil"),
    character("Duelist", "Elsa Bloodstone"),
    character("Duelist", "Hawkeye"),
    character("Duelist", "Human Torch"),
    character("Duelist", "Iron Fist"),
    character("Duelist", "Mister Fantastic"),
    character("Duelist", "Moon Knight"),
    character("Duelist", "Namor"),
    character("Duelist", "Phoenix"),
    character("Duelist", "Psylocke"),
    character("Duelist", "Scarlet Witch"),
    character("Duelist", "Squirrel Girl"),
    character("Duelist", "Star-Lord"),
    character("Duelist", "Storm"),
    character("Duelist", "Punisher"),
    character("Duelist", "Winter Soldier"),
    character("Duelist", "Wolverine"),
    character("Duelist", "Black Cat"),
    character("Duelist", "Deadpool"),
    character("Duelist", "Gorr"),
  ],
  Strategist: [
    character("Strategist", "Luna Snow"),
    character("Strategist", "Rocket Raccoon"),
    character("Strategist", "Loki"),
    character("Strategist", "Ultron"),
    character("Strategist", "Adam Warlock"),
    character("Strategist", "Cloak & Dagger"),
    character("Strategist", "Gambit"),
    character("Strategist", "Invisible Woman"),
    character("Strategist", "Jeff"),
    character("Strategist", "Jubilee"),
    character("Strategist", "Mantis"),
    character("Strategist", "White Fox"),
    character("Strategist", "Deadpool"),
  ],
};

const MAX_PLAYERS = 12;
const TEMPORARY_BOT_MESSAGE_MS = 30_000;
const CHARACTER_OPTIONS_PER_MENU = 25;
const ATTACHED_ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../attached_assets",
);
const CHANGE_ROLE_COMMAND = new SlashCommandBuilder()
  .setName("cambiar_rol")
  .setDescription("Cambia tu rol y personaje después de registrarte")
  .toJSON();

type PendingRegistration = {
  role: string;
  createdAt: number;
  mode: "register" | "change";
};

export type PlayerRegistration = {
  guildId: string;
  voiceChannelId: string;
  discordUserId: string;
  discordUsername: string;
  gameId: string;
  role: string;
  character: string;
  registeredAt: string;
};

const pendingRegistrations = new Map<string, PendingRegistration>();
const registrations = new Map<string, PlayerRegistration>();
const rosterMessages = new Map<string, string>();
const registrationPanelMessages = new Map<string, string>();
const messageDeletionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const characterEmojisByGuild = new Map<
  string,
  Map<string, { id: string; name: string }>
>();
const globalCharacterEmojis = new Map<string, { id: string; name: string }>();

let client: Client | undefined;
let connectedAt: string | undefined;
let botUsername: string | undefined;
let lastDiscordError: string | undefined;

const pendingKey = (guildId: string, userId: string) => `${guildId}:${userId}`;
const registrationKey = (guildId: string, userId: string) => `${guildId}:${userId}`;

function isPendingValid(pending: PendingRegistration | undefined) {
  return Boolean(pending && Date.now() - pending.createdAt < 5 * 60 * 1000);
}

function buildRegistrationPanel() {
  const button = new ButtonBuilder()
    .setCustomId("mvr:register")
    .setLabel("Registrarme para la partida")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

function buildRoleMenu(userId: string, mode: PendingRegistration["mode"]) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mvr:role:${userId}:${mode}`)
    .setPlaceholder("Elige tu rol")
    .addOptions(
      ROLE_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
        emoji: option.emoji,
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildCharacterMenus(
  userId: string,
  guildId: string,
  role: string,
  mode: PendingRegistration["mode"],
) {
  const characters = CHARACTERS_LIST[role as CharacterRole] ?? [];
  const guild = client?.guilds.cache.get(guildId);
  const guildCharacterEmojis = characterEmojisByGuild.get(guildId);
  const pages: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

  for (
    let page = 0;
    page < characters.length;
    page += CHARACTER_OPTIONS_PER_MENU
  ) {
    const pageCharacters = characters.slice(
      page,
      page + CHARACTER_OPTIONS_PER_MENU,
    );
    const pageNumber = Math.floor(page / CHARACTER_OPTIONS_PER_MENU) + 1;
    const totalPages = Math.ceil(
      characters.length / CHARACTER_OPTIONS_PER_MENU,
    );
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`mvr:character:${userId}:${mode}:${pageNumber}`)
      .setPlaceholder(
        totalPages > 1
          ? `Elige tu personaje (${pageNumber}/${totalPages})`
          : "Elige tu personaje",
      )
      .addOptions(
        pageCharacters.map((character) => {
          const globalEmoji =
            globalCharacterEmojis.get(character.value) ??
            (character.emojiId
              ? { id: character.emojiId, name: character.emojiName }
              : undefined);
          const guildEmoji = guildCharacterEmojis?.get(character.value);
          const configuredEmojiInGuild =
            character.emojiId && guild?.emojis.cache.has(character.emojiId)
              ? { id: character.emojiId, name: character.emojiName }
              : undefined;
          const resolvedEmoji =
            globalEmoji ??
            guildEmoji ??
            configuredEmojiInGuild;
          return {
            label: character.name,
            value: character.value,
            emoji: resolvedEmoji
              ? { id: resolvedEmoji.id, name: resolvedEmoji.name }
              : character.fallbackEmoji,
          };
        }),
      );

    pages.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
    );
  }

  return pages;
}

function findExistingCharacterEmoji(guild: Guild, character: CharacterOption) {
  return (
    guild.emojis.cache.find((emoji) => emoji.name === character.emojiName) ??
    guild.emojis.cache.find(
      (emoji) =>
        normalizeDiscordEmojiName(emoji.name ?? "") ===
        normalizeDiscordEmojiName(character.name),
    )
  );
}

async function syncCharacterEmojis(
  guild: Guild,
  characters: CharacterOption[],
) {
  const guildCharacterEmojis = new Map<string, { id: string; name: string }>();
  characterEmojisByGuild.set(guild.id, guildCharacterEmojis);

  for (const character of characters) {
    if (guildCharacterEmojis.has(character.value)) continue;

    try {
      const existingEmoji = findExistingCharacterEmoji(guild, character);
      if (existingEmoji) {
        const linkedEmoji = {
          id: existingEmoji.id,
          name: existingEmoji.name ?? character.emojiName,
        };
        guildCharacterEmojis.set(character.value, linkedEmoji);
        if (!character.emojiId && !globalCharacterEmojis.has(character.value)) {
          globalCharacterEmojis.set(character.value, linkedEmoji);
        }
        if (!character.iconFileName || existingEmoji.name !== character.emojiName) {
          logger.info(
            {
              guildId: guild.id,
              character: character.name,
              emojiName: existingEmoji.name,
            },
            "Existing Discord emoji linked to Marvel Rivals character",
          );
        }
        continue;
      }

      if (globalCharacterEmojis.has(character.value) || !character.iconFileName) {
        continue;
      }

      const createdEmoji = await guild.emojis.create({
        attachment: path.join(ATTACHED_ASSETS_DIR, character.iconFileName),
        name: character.emojiName,
        reason: "Iconos de personajes para el registro de Marvel Rivals",
      });
      const createdEmojiData = {
        id: createdEmoji.id,
        name: createdEmoji.name ?? character.emojiName,
      };
      guildCharacterEmojis.set(character.value, createdEmojiData);
      globalCharacterEmojis.set(character.value, createdEmojiData);
      logger.info(
        {
          guildId: guild.id,
          character: character.name,
          emojiName: character.emojiName,
        },
        "Marvel Rivals character emoji synchronized",
      );
    } catch (error) {
      logger.warn(
        {
          err: error,
          guildId: guild.id,
          character: character.name,
          fileName: character.iconFileName,
        },
        "Could not synchronize Marvel Rivals character emoji; using role icon fallback",
      );
    }
  }
}

async function syncCharacterEmojisAcrossGuilds(guilds: Guild[]) {
  const uniqueCharacters = new Map<string, CharacterOption>();
  for (const character of Object.values(CHARACTERS_LIST).flat()) {
    if (!uniqueCharacters.has(character.value)) {
      uniqueCharacters.set(character.value, character);
    }
  }
  const characters = Array.from(uniqueCharacters.values());
  const preferredSourceGuildId =
    process.env.DISCORD_EMOJI_SOURCE_GUILD_ID?.trim();
  const orderedGuilds = [...guilds].sort((left, right) => {
    if (left.id === preferredSourceGuildId) return -1;
    if (right.id === preferredSourceGuildId) return 1;
    return left.id.localeCompare(right.id);
  });

  globalCharacterEmojis.clear();
  await Promise.all(
    orderedGuilds.map(async (guild) => {
      try {
        await guild.emojis.fetch();
      } catch (error) {
        logger.warn(
          { err: error, guildId: guild.id },
          "Could not fetch existing character emojis before synchronization",
        );
      }
    }),
  );

  for (const character of characters) {
    if (character.emojiId) {
      globalCharacterEmojis.set(character.value, {
        id: character.emojiId,
        name: character.emojiName,
      });
      continue;
    }

    for (const guild of orderedGuilds) {
      const existingEmoji = findExistingCharacterEmoji(guild, character);
      if (!existingEmoji) continue;

      globalCharacterEmojis.set(character.value, {
        id: existingEmoji.id,
        name: existingEmoji.name ?? character.emojiName,
      });
      break;
    }
  }

  for (const guild of orderedGuilds) {
    await syncCharacterEmojis(guild, characters);
  }

  logger.info(
    {
      guildCount: orderedGuilds.length,
      characterEmojiCount: globalCharacterEmojis.size,
      preferredSourceGuildId: preferredSourceGuildId || undefined,
    },
    "Global Marvel Rivals character emoji registry ready",
  );
}

function buildRegistrationModal(userId: string, role: string, character: string) {
  const gameId = new TextInputBuilder()
    .setCustomId("game_id")
    .setLabel("ID de juego de Marvel Rivals")
    .setPlaceholder("Ejemplo: 123456789")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(32)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(`mvr:submit:${userId}:${encodeURIComponent(role)}:${encodeURIComponent(character)}`)
    .setTitle("Registro de Marvel Rivals")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(gameId));
}

function buildRosterEmbed(registrationList: PlayerRegistration[]) {
  const roleFields = ROLE_ORDER.map((role) => {
    const players = registrationList
      .filter((registration) => registration.role === role)
      .map(
        (registration) =>
          `${registration.character} - ${registration.gameId}`,
      );

    return {
      name: role,
      value: players.length > 0 ? players.join("\n") : "Disponible",
      inline: false,
    };
  });

  return new EmbedBuilder()
    .setColor(0x1d9bf0)
    .setTitle(
      `Jugadores listos para Marvel Rivals · ${registrationList.length}/${MAX_PLAYERS}`,
    )
    .setDescription(
      `Cupos ocupados: **${registrationList.length}/${MAX_PLAYERS}**\n` +
        "Los roles vacíos aparecen como disponibles.",
    )
    .addFields(roleFields)
    .setFooter({
      text: "Registro actualizado por Marvel Rivals",
    });
}

function getChannelRegistrations(guildId: string, voiceChannelId: string) {
  return Array.from(registrations.values())
    .filter(
      (item) =>
        item.guildId === guildId && item.voiceChannelId === voiceChannelId,
    )
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}

function scheduleMessageDeletion(message: Message, delay = TEMPORARY_BOT_MESSAGE_MS) {
  const existingTimer = messageDeletionTimers.get(message.id);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    messageDeletionTimers.delete(message.id);
    void message
      .delete()
      .catch((error) =>
        logger.debug({ err: error, messageId: message.id }, "Temporary Discord message was already deleted"),
      );
  }, delay);
  messageDeletionTimers.set(message.id, timer);
}

async function deleteTemporaryMessage(message: Message | undefined) {
  if (!message) return;

  const existingTimer = messageDeletionTimers.get(message.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
    messageDeletionTimers.delete(message.id);
  }

  try {
    await message.delete();
  } catch (error) {
    logger.debug(
      { err: error, messageId: message.id },
      "Temporary Discord message could not be deleted",
    );
  }
}

async function deleteRegistrationPanel(guildId: string, userId: string) {
  const key = pendingKey(guildId, userId);
  const messageId = registrationPanelMessages.get(key);
  registrationPanelMessages.delete(key);
  if (!messageId) return;

  const channel = client?.channels.cache.find((candidate) => {
    if (!candidate.isTextBased() || !candidate.isSendable()) return false;
    return candidate.messages.cache.has(messageId);
  });
  if (!channel || !channel.isTextBased()) return;

  const panelMessage = channel.messages.cache.get(messageId);
  await deleteTemporaryMessage(panelMessage);
}

async function publishRosterForChannel(guildId: string, voiceChannelId: string) {
  const channelKey = `${guildId}:${voiceChannelId}`;
  const channel = client?.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isTextBased() || !channel.isSendable()) return;

  const registrationList = getChannelRegistrations(guildId, voiceChannelId);
  const embeds = [buildRosterEmbed(registrationList)];
  const existingMessageId = rosterMessages.get(channelKey);

  if (existingMessageId) {
    try {
      const existingMessage = await channel.messages.fetch(existingMessageId);
      await existingMessage.edit({ embeds });
      scheduleMessageDeletion(existingMessage);
      return;
    } catch (error) {
      logger.warn(
        { err: error, channelId: voiceChannelId },
        "Previous roster message could not be updated",
      );
      rosterMessages.delete(channelKey);
    }
  }

  const rosterMessage = await channel.send({ embeds });
  rosterMessages.set(channelKey, rosterMessage.id);
  scheduleMessageDeletion(rosterMessage);
}

async function publishRoster(registration: PlayerRegistration) {
  await publishRosterForChannel(registration.guildId, registration.voiceChannelId);
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  if (interaction.customId !== "mvr:register") return;

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "Este registro solo está disponible dentro de un servidor.",
      ephemeral: true,
    });
    return;
  }

  const existingRegistration = registrations.get(
    registrationKey(guildId, interaction.user.id),
  );
  if (existingRegistration) {
    await interaction.reply({
      content:
        `Ya estás registrado como **${existingRegistration.role} · ${existingRegistration.character}** ` +
        `con el ID **${existingRegistration.gameId}**.\n\n` +
        "No puedes registrarte otra vez. Si necesitas cambiarlo, usa `/cambiar_rol`.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember | null;
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      content: "Debes estar dentro de un canal de voz para registrarte.",
      ephemeral: true,
    });
    return;
  }

  if (
    getChannelRegistrations(guildId, voiceChannel.id).length >= MAX_PLAYERS
  ) {
    await interaction.reply({
      content: `Este canal ya está lleno: **${MAX_PLAYERS}/${MAX_PLAYERS}** jugadores.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "Primero selecciona el rol que vas a jugar:",
    components: [buildRoleMenu(interaction.user.id, "register")],
    ephemeral: true,
  });
  await deleteTemporaryMessage(interaction.message);
  registrationPanelMessages.delete(pendingKey(guildId, interaction.user.id));
}

async function handleRoleSelection(interaction: StringSelectMenuInteraction) {
  const [prefix, type, userId, mode = "register"] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "role") return;

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Este registro pertenece a otra persona. Pulsa el botón para iniciar el tuyo.",
      ephemeral: true,
    });
    return;
  }

  const role = interaction.values[0];
  if (!role) return;

  pendingRegistrations.set(pendingKey(interaction.guildId ?? "", userId), {
    role,
    createdAt: Date.now(),
    mode: mode === "change" ? "change" : "register",
  });

  await interaction.update({
    content: `Rol seleccionado: **${role}**\nAhora selecciona tu personaje:`,
    components: buildCharacterMenus(
      userId,
      interaction.guildId ?? "",
      role,
      mode === "change" ? "change" : "register",
    ),
  });
}

async function handleChangeRoleCommand(
  interaction: ChatInputCommandInteraction,
) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "Este comando solo funciona dentro de un servidor.",
      ephemeral: true,
    });
    return;
  }

  const registration = registrations.get(
    registrationKey(guildId, interaction.user.id),
  );
  if (!registration) {
    await interaction.reply({
      content:
        "Todavía no tienes un registro. Entra a un canal de voz y pulsa el botón de registro.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember | null;
  if (!member?.voice.channel) {
    await interaction.reply({
      content: "Debes estar dentro de un canal de voz para cambiar tu rol.",
      ephemeral: true,
    });
    return;
  }

  pendingRegistrations.set(pendingKey(guildId, interaction.user.id), {
    role: registration.role,
    createdAt: Date.now(),
    mode: "change",
  });

  await interaction.reply({
    content:
      `Registro actual: **${registration.role} · ${registration.character}**.\n` +
      "Selecciona tu nuevo rol:",
    components: [buildRoleMenu(interaction.user.id, "change")],
    ephemeral: true,
  });
}

async function handleCharacterSelection(interaction: StringSelectMenuInteraction) {
  const [prefix, type, userId, mode = "register"] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "character") return;

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Este registro pertenece a otra persona. Pulsa el botón para iniciar el tuyo.",
      ephemeral: true,
    });
    return;
  }

  const pending = pendingRegistrations.get(
    pendingKey(interaction.guildId ?? "", userId),
  );
  if (!isPendingValid(pending)) {
    await interaction.update({
      content: "Tu selección expiró. Pulsa el botón de registro para comenzar de nuevo.",
      components: [],
    });
    return;
  }

  const character = interaction.values[0];
  if (!character || !pending) return;

  if (pending.mode === "change" || mode === "change") {
    const key = registrationKey(interaction.guildId ?? "", userId);
    const existingRegistration = registrations.get(key);
    if (!existingRegistration) {
      await interaction.update({
        content:
          "No tienes un registro activo. Pulsa el botón de registro para comenzar.",
        components: [],
      });
      return;
    }

    existingRegistration.role = pending.role;
    existingRegistration.character = character;
    pendingRegistrations.delete(key);

    await interaction.update({
      content:
        `Cambio realizado: ahora eres **${existingRegistration.role} · ${existingRegistration.character}**.\n` +
        "Tu ID de juego se mantuvo sin cambios.",
      components: [],
    });
    await deleteRegistrationPanel(interaction.guildId ?? "", userId);
    await publishRoster(existingRegistration);
    return;
  }

  await interaction.showModal(
    buildRegistrationModal(userId, pending.role, character),
  );
}

async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  const [prefix, type, userId, encodedRole, encodedCharacter] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "submit") return;

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Este registro pertenece a otra persona.",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId ?? "";
  const existingRegistration = registrations.get(
    registrationKey(guildId, userId),
  );
  if (existingRegistration) {
    pendingRegistrations.delete(pendingKey(guildId, userId));
    await interaction.reply({
      content:
        `Ya estás registrado como **${existingRegistration.role} · ${existingRegistration.character}**.\n` +
        "Si quieres modificarlo, usa `/cambiar_rol`.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember | null;
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel || !("send" in voiceChannel)) {
    await interaction.reply({
      content: "Debes estar dentro de un canal de voz para completar el registro.",
      ephemeral: true,
    });
    return;
  }

  if (getChannelRegistrations(guildId, voiceChannel.id).length >= MAX_PLAYERS) {
    await interaction.reply({
      content: `Este canal ya está lleno: **${MAX_PLAYERS}/${MAX_PLAYERS}** jugadores.`,
      ephemeral: true,
    });
    return;
  }

  const gameId = interaction.fields.getTextInputValue("game_id").trim();
  const role = decodeURIComponent(encodedRole);
  const character = decodeURIComponent(encodedCharacter);
  if (
    !CHARACTERS_LIST[role as CharacterRole]?.some(
      (option) => option.value === character,
    )
  ) {
    await interaction.reply({
      content: "Ese personaje no está disponible para el rol seleccionado.",
      ephemeral: true,
    });
    return;
  }

  const registration: PlayerRegistration = {
    guildId,
    voiceChannelId: voiceChannel.id,
    discordUserId: interaction.user.id,
    discordUsername: interaction.user.username,
    gameId,
    role,
    character,
    registeredAt: new Date().toISOString(),
  };

  registrations.set(
    registrationKey(registration.guildId, registration.discordUserId),
    registration,
  );
  pendingRegistrations.delete(
    pendingKey(registration.guildId, registration.discordUserId),
  );

  await interaction.reply({
    content: `Registro guardado: **${registration.role}** · **${registration.character}** · ID **${registration.gameId}**`,
    ephemeral: true,
  });

  await deleteRegistrationPanel(guildId, userId);
  await publishRoster(registration);
}

async function handleInteraction(interaction: Interaction) {
  try {
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "cambiar_rol"
    ) {
      await handleChangeRoleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("mvr:role:")) {
        await handleRoleSelection(interaction);
      } else if (interaction.customId.startsWith("mvr:character:")) {
        await handleCharacterSelection(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    logger.error({ err: error }, "Discord interaction failed");
    if (!interaction.isRepliable() || interaction.replied || interaction.deferred) return;
    await interaction.reply({
      content: "No pude completar el registro. Inténtalo otra vez.",
      ephemeral: true,
    });
  }
}

async function handleListCommand(message: Message) {
  if (message.author.bot || message.content.trim().toLowerCase() !== "!list") {
    return;
  }

  if (!message.guildId) return;

  const member = message.member as GuildMember | null;
  const voiceChannel =
    member?.voice.channel ??
    (message.channel.isVoiceBased() ? message.channel : null);

  if (!voiceChannel) {
    await message.reply(
      "Debes estar dentro de un canal de voz para consultar su lista.",
    );
    return;
  }

  const registrationList = getChannelRegistrations(
    message.guildId,
    voiceChannel.id,
  );
  const rosterMessage = await message.reply({
    embeds: [buildRosterEmbed(registrationList)],
  });
  scheduleMessageDeletion(rosterMessage);
  await deleteTemporaryMessage(message);
}

async function registerChangeRoleCommand(applicationId: string) {
  if (!client) return;

  try {
    const globalCommands = (await client.rest.get(
      Routes.applicationCommands(applicationId),
    )) as Array<{ id: string; name: string }>;
    const existingGlobalCommand = globalCommands.find(
      (command) => command.name === CHANGE_ROLE_COMMAND.name,
    );

    if (existingGlobalCommand) {
      await client.rest.patch(
        Routes.applicationCommand(applicationId, existingGlobalCommand.id),
        { body: CHANGE_ROLE_COMMAND },
      );
    } else {
      await client.rest.post(Routes.applicationCommands(applicationId), {
        body: CHANGE_ROLE_COMMAND,
      });
    }

    logger.info(
      {
        applicationId,
        commandName: CHANGE_ROLE_COMMAND.name,
      },
      "Global Discord application command registered",
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        applicationId,
        commandName: CHANGE_ROLE_COMMAND.name,
      },
      "Could not register global /cambiar_rol command",
    );
    return;
  }

  for (const guild of client.guilds.cache.values()) {
    try {
      const commands = await guild.commands.fetch();
      const existingCommand = commands.find(
        (command) => command.name === CHANGE_ROLE_COMMAND.name,
      );

      if (existingCommand) {
        await guild.commands.delete(existingCommand.id);
        logger.info(
          {
            guildId: guild.id,
            commandName: existingCommand.name,
          },
          "Removed guild-scoped duplicate of global Discord command",
        );
      }
    } catch (error) {
      logger.warn(
        {
          err: error,
          guildId: guild.id,
          commandName: CHANGE_ROLE_COMMAND.name,
        },
        "Could not remove guild-scoped duplicate of global Discord command",
      );
    }
  }
}

async function handleVoiceStateUpdate(before: VoiceState, after: VoiceState) {
  const member = after.member ?? before.member;
  if (!member) return;

  const changedChannel = before.channelId !== after.channelId;
  if (before.channelId && changedChannel) {
    const key = registrationKey(member.guild.id, member.id);
    const registration = registrations.get(key);
    if (registration?.voiceChannelId === before.channelId) {
      registrations.delete(key);
      pendingRegistrations.delete(key);
      await publishRosterForChannel(member.guild.id, before.channelId);
    }
  }

  if (!after.channel || !changedChannel) return;

  const voiceChannel = after.channel;
  const botMember = member.guild.members.me;
  if (!botMember) {
    logger.warn({ guildId: member.guild.id }, "Bot member is not available yet");
    return;
  }

  const permissions = voiceChannel.permissionsFor(botMember);
  if (
    !permissions?.has(PermissionsBitField.Flags.ViewChannel) ||
    !permissions.has(PermissionsBitField.Flags.SendMessages) ||
    !permissions.has(PermissionsBitField.Flags.EmbedLinks)
  ) {
    logger.warn(
      { channelId: voiceChannel.id },
      "Bot lacks permissions to publish the registration panel",
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Bienvenido al farmeo, ${member.displayName}`)
    .setDescription(
      "Pulsa el botón para elegir tu rol, personaje e ID de juego de Marvel Rivals.",
    );

  const panelMessage = await voiceChannel.send({
    content: `<@${member.id}>`,
    embeds: [embed],
    components: [buildRegistrationPanel()],
  });
  registrationPanelMessages.set(
    pendingKey(member.guild.id, member.id),
    panelMessage.id,
  );
  scheduleMessageDeletion(panelMessage, 10 * 60 * 1000);
  await publishRosterForChannel(member.guild.id, voiceChannel.id);
}

export function getDiscordBotStatus() {
  return {
    connected: Boolean(client?.isReady()),
    username: botUsername ?? null,
    connectedAt: connectedAt ?? null,
    registrations: registrations.size,
    error: lastDiscordError ?? null,
  };
}

export async function startDiscordBot() {
  const token = process.env["DISCORD_TOKEN"]?.trim().replace(/^['"]|['"]$/g, "");
  if (!token) {
    lastDiscordError = "DISCORD_TOKEN secret is required to start the Discord bot.";
    logger.error(lastDiscordError);
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    botUsername = readyClient.user.tag;
    connectedAt = new Date().toISOString();
    logger.info({ username: botUsername }, "Discord bot connected");
    readyClient.user.setPresence({
      activities: [
        {
          name: "Marvel Rivals | /help",
          type: ActivityType.Listening,
        },
      ],
      status: "online",
    });
    logger.info(
      { activity: "Marvel Rivals | /help", type: "Listening" },
      "Discord bot activity presence set",
    );
    void syncCharacterEmojisAcrossGuilds([
      ...readyClient.guilds.cache.values(),
    ]);
    void registerChangeRoleCommand(readyClient.user.id);
  });
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.MessageCreate, handleListCommand);
  client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
  client.on(Events.GuildCreate, () => {
    if (!client || !connectedAt) return;
    void syncCharacterEmojisAcrossGuilds([...client.guilds.cache.values()]);
  });
  client.on(Events.Error, (error) => {
    logger.error({ err: error }, "Discord client error");
  });

  try {
    await client.login(token);
  } catch (error) {
    lastDiscordError =
      error instanceof Error ? error.message : "Discord login failed.";
    logger.error({ err: error }, "Discord bot could not connect");
  }
}