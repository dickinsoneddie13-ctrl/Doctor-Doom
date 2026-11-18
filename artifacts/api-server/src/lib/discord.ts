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
import { readFile } from "node:fs/promises";
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

const ALLOWED_CHANNEL_IDS = new Set([
  "1553938625110999140",
  "1552787864268308510",
  "1552787974570381362",
  "1552833195156840619",
  "881820505466896394",
  "882060722589290496",
]);
const BLACKLISTED_CHANNEL_IDS = new Set([
  "753736664966496363",
  "794009945723895838",
  "1554241729312456784",
]);
const AUTHORIZED_ROLE_IDS = new Set([
  "1553907548501835916",
  "881753080952160337",
  "1558208679361257512",
  "1552912737225674844",
  "1552913091623256125",
]);
const ACCESS_DENIED_MESSAGE = "No tienes permisos para usar este bot.";

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

type CharacterEmoji = {
  id: string;
  name: string;
  animated?: boolean;
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
  Nightcrawler: "../assets/Champion_Icon_Nightcrawler_Animated_Emoji.webp",
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
    character("Strategist", "Nightcrawler"),
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
const DISCORD_EMOJI_MAX_FILE_SIZE_BYTES = 256 * 1024;
const CHARACTER_ICON_MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function readCharacterEmojiImage(iconFileName: string) {
  const mimeType = CHARACTER_ICON_MIME_TYPES[path.extname(iconFileName).toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unsupported character emoji image format: ${iconFileName}`);
  }

  const imagePath = iconFileName.startsWith("../assets/")
    ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), iconFileName)
    : path.join(ATTACHED_ASSETS_DIR, iconFileName);
  const image = await readFile(imagePath);
  if (image.byteLength > DISCORD_EMOJI_MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Character emoji image exceeds Discord's 256 KiB limit: ${iconFileName} (${image.byteLength} bytes)`,
    );
  }

  return `data:${mimeType};base64,${image.toString("base64")}`;
}

export const START_COMMAND = new SlashCommandBuilder()
  .setName("start")
  .setDescription("Inicia tu registro para una partida de Marvel Rivals")
  .toJSON();
export const CHANGE_ROLE_COMMAND = new SlashCommandBuilder()
  .setName("cambiar_rol")
  .setDescription("Cambia tu rol y personaje después de registrarte")
  .toJSON();
export const STOP_COMMAND = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Cierra la sala de farmeo activa")
  .toJSON();
export const NOAFK_COMMAND = new SlashCommandBuilder()
  .setName("noafk")
  .setDescription("Muestra métodos para evitar desconectarte por AFK")
  .toJSON();
export const BOT_SLASH_COMMANDS = [
  START_COMMAND,
  CHANGE_ROLE_COMMAND,
  STOP_COMMAND,
  NOAFK_COMMAND,
] as const;

type PendingRegistration = {
  role: string;
  createdAt: number;
  mode: "register" | "change";
  voiceChannelId?: string;
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

type FarmingSession = {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  openedByUserId: string;
  openedByDisplayName: string;
  messageId?: string;
};

const pendingRegistrations = new Map<string, PendingRegistration>();
const registrations = new Map<string, PlayerRegistration>();
const farmingSessions = new Map<string, FarmingSession>();
const rosterMessages = new Map<string, string>();
const registrationPanelMessages = new Map<string, string>();
const messageDeletionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const characterEmojisByGuild = new Map<
  string,
  Map<string, CharacterEmoji>
>();
const globalCharacterEmojis = new Map<string, CharacterEmoji>();

let client: Client | undefined;
let connectedAt: string | undefined;
let botUsername: string | undefined;
let lastDiscordError: string | undefined;

const pendingKey = (guildId: string, userId: string) => `${guildId}:${userId}`;
const registrationKey = (guildId: string, userId: string) => `${guildId}:${userId}`;
const farmingSessionKey = (guildId: string, voiceChannelId: string) =>
  `${guildId}:${voiceChannelId}`;

function isAllowedChannel(channelId: string | null | undefined) {
  return Boolean(
    channelId &&
      !BLACKLISTED_CHANNEL_IDS.has(channelId) &&
      ALLOWED_CHANNEL_IDS.has(channelId),
  );
}

function hasAuthorizedRole(member: GuildMember | null | undefined) {
  return (
    member?.roles.cache.some((role) => AUTHORIZED_ROLE_IDS.has(role.id)) ??
    false
  );
}

function interactionHasAuthorizedRole(interaction: Interaction) {
  const roles = interaction.member?.roles;
  if (!roles) return false;
  if (Array.isArray(roles)) {
    return roles.some((roleId) => AUTHORIZED_ROLE_IDS.has(roleId));
  }
  return roles.cache.some((role) => AUTHORIZED_ROLE_IDS.has(role.id));
}

async function getGuildMember(guildId: string, userId: string) {
  const guild = client?.guilds.cache.get(guildId);
  if (!guild) return null;

  const cachedMember = guild.members.cache.get(userId);
  if (cachedMember) return cachedMember;

  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    logger.warn({ err: error, guildId, userId }, "Could not fetch Discord member");
    return null;
  }
}

function isPendingValid(pending: PendingRegistration | undefined) {
  return Boolean(pending && Date.now() - pending.createdAt < 5 * 60 * 1000);
}

function isUnknownInteractionError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? error.code : undefined;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  return code === 10062 || code === "10062" || /unknown interaction/i.test(message);
}

async function handleInteractionError(
  interaction: Interaction,
  handlerName: string,
  error: unknown,
) {
  if (isUnknownInteractionError(error)) {
    logger.debug(
      { err: error, interactionId: interaction.id, handlerName },
      "Discord interaction expired before it could be handled",
    );
    return;
  }

  logger.error(
    { err: error, interactionId: interaction.id, handlerName },
    "Discord interaction handler failed",
  );
  if (!interaction.isRepliable()) return;

  try {
    if (interaction.deferred) {
      await interaction.editReply({
        content: "No pude completar esta acción. Inténtalo otra vez.",
      });
    } else if (!interaction.replied) {
      await interaction.reply({
        content: "No pude completar esta acción. Inténtalo otra vez.",
        ephemeral: true,
      });
    }
  } catch (replyError) {
    if (isUnknownInteractionError(replyError)) {
      logger.debug(
        { err: replyError, interactionId: interaction.id, handlerName },
        "Discord interaction expired before the error response could be sent",
      );
      return;
    }
    logger.warn(
      { err: replyError, interactionId: interaction.id, handlerName },
      "Could not send Discord interaction error response",
    );
  }
}

async function runInteractionHandler(
  interaction: Interaction,
  handlerName: string,
  handler: () => Promise<void>,
) {
  try {
    await handler();
  } catch (error) {
    await handleInteractionError(interaction, handlerName, error);
  }
}

function buildRegistrationPanel(voiceChannelId: string) {
  const button = new ButtonBuilder()
    .setCustomId(`mvr:session-register:${voiceChannelId}`)
    .setLabel("Registrarme para la partida")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

function buildRoleMenu(
  userId: string,
  mode: PendingRegistration["mode"],
  voiceChannelId?: string,
) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(
      `mvr:role:${userId}:${mode}${voiceChannelId ? `:${voiceChannelId}` : ""}`,
    )
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
  voiceChannelId?: string,
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
      .setCustomId(
        `mvr:character:${userId}:${mode}:${pageNumber}${voiceChannelId ? `:${voiceChannelId}` : ""}`,
      )
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
              ? {
                  id: character.emojiId,
                  name: character.emojiName,
                  animated: guild.emojis.cache.get(character.emojiId)?.animated,
                }
              : undefined;
          const resolvedEmoji =
            globalEmoji ??
            guildEmoji ??
            configuredEmojiInGuild;
          return {
            label: character.name,
            value: character.value,
            emoji: resolvedEmoji
              ? {
                  id: resolvedEmoji.id,
                  name: resolvedEmoji.name,
                  ...(resolvedEmoji.animated ? { animated: true } : {}),
                }
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
          animated: existingEmoji.animated,
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
        attachment: await readCharacterEmojiImage(character.iconFileName),
        name: character.emojiName,
        reason: "Iconos de personajes para el registro de Marvel Rivals",
      });
      const createdEmojiData = {
        id: createdEmoji.id,
        name: createdEmoji.name ?? character.emojiName,
        animated: createdEmoji.animated,
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
        animated: existingEmoji.animated,
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

function buildRegistrationModal(
  userId: string,
  role: string,
  character: string,
  voiceChannelId?: string,
) {
  const gameId = new TextInputBuilder()
    .setCustomId("game_id")
    .setLabel("ID de juego de Marvel Rivals")
    .setPlaceholder("Ejemplo: 123456789")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(32)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(
      `mvr:submit:${userId}:${encodeURIComponent(role)}:${encodeURIComponent(character)}:${voiceChannelId ?? ""}`,
    )
    .setTitle("Registro de Marvel Rivals")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(gameId));
}

function buildSessionWelcomeEmbed(session: FarmingSession) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Bienvenido al farmeo, ${session.openedByDisplayName}`)
    .setDescription(
      `<@${session.openedByUserId}> abrió la sala en <#${session.voiceChannelId}>.\n` +
        "Pulsa el botón azul para registrarte en la partida.",
    );
}

function buildSessionClosedEmbed(
  session: FarmingSession,
  closedByDisplayName: string,
) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Sala de farmeo cerrada")
    .setDescription(
      `La sala vinculada a <#${session.voiceChannelId}> fue cerrada por **${closedByDisplayName}**. Ya no se aceptan registros.`,
    )
    .setTimestamp();
}

function buildNoAfkEmbed() {
  return new EmbedBuilder()
    .setTitle("Métodos para no desconectarte (AFK)")
    .setColor(0xED4245)
    .setDescription(
      [
        "**PC**\nUsa un autoclicker ejecutado como administrador.",
        "**PlayStation**\nMantén pulsados R2 y el botón PS.",
        "**XBOX**\nApoya el mando o usa ligas elásticas para mantener un botón pulsado.",
      ].join("\n\n"),
    )
    .setFooter({
      text: "Desconectarte de un farmeo te dará un warn, ticket por el host y si acumulas 3 warns, serás baneado",
    });
}

function buildRosterEmbed(
  registrationList: PlayerRegistration[],
  voicePlayerCount?: number,
) {
  const displayedCount = voicePlayerCount ?? registrationList.length;
  const isVoiceSession = voicePlayerCount !== undefined;
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
      `${isVoiceSession ? "Jugadores en voz" : "Jugadores listos para Marvel Rivals"} · ${displayedCount}/${MAX_PLAYERS}`,
    )
    .setDescription(
      `${isVoiceSession ? "Jugadores presentes" : "Cupos ocupados"}: **${displayedCount}/${MAX_PLAYERS}**\n` +
        "Los roles vacíos aparecen como disponibles.",
    )
    .addFields(roleFields)
    .setFooter({
      text: "Registro actualizado por Marvel Rivals",
    });
}

function getChannelRegistrations(guildId: string, voiceChannelId: string) {
  const channel = client?.guilds.cache
    .get(guildId)
    ?.channels.cache.get(voiceChannelId);
  if (!channel?.isVoiceBased()) return [];

  const channelRegistrations = Array.from(registrations.values()).filter(
    (item) =>
      item.guildId === guildId && item.voiceChannelId === voiceChannelId,
  );
  const activeRegistrations: PlayerRegistration[] = [];

  for (const registration of channelRegistrations) {
    const member = channel.members.get(registration.discordUserId);
    if (!member || member.user.bot || !hasAuthorizedRole(member)) {
      const key = registrationKey(guildId, registration.discordUserId);
      registrations.delete(key);
      pendingRegistrations.delete(key);
      continue;
    }
    activeRegistrations.push(registration);
  }

  return activeRegistrations.sort((a, b) =>
    a.registeredAt.localeCompare(b.registeredAt),
  );
}

function getSessionPlayerCount(
  session: FarmingSession,
  excludingUserId?: string,
) {
  const channel = client?.guilds.cache
    .get(session.guildId)
    ?.channels.cache.get(session.voiceChannelId);
  if (!channel?.isVoiceBased()) return 0;

  return Array.from(channel.members.values()).filter((member) => {
    if (
      member.id === excludingUserId ||
      member.user.bot ||
      !hasAuthorizedRole(member)
    ) {
      return false;
    }
    if (member.id !== session.openedByUserId) return true;
    return (
      registrations.get(registrationKey(session.guildId, member.id))
        ?.voiceChannelId === session.voiceChannelId
    );
  }).length;
}

function getChannelCapacity(
  guildId: string,
  voiceChannelId: string,
  userId: string,
) {
  const session = farmingSessions.get(
    farmingSessionKey(guildId, voiceChannelId),
  );
  if (session) {
    return {
      playerCount: getSessionPlayerCount(session),
      available:
        getSessionPlayerCount(session, userId) < MAX_PLAYERS,
    };
  }

  const playerCount = getChannelRegistrations(
    guildId,
    voiceChannelId,
  ).length;
  return { playerCount, available: playerCount < MAX_PLAYERS };
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
  if (!isAllowedChannel(voiceChannelId)) return;

  const channelKey = farmingSessionKey(guildId, voiceChannelId);
  const session = farmingSessions.get(channelKey);
  const registrationList = getChannelRegistrations(guildId, voiceChannelId);

  if (session) {
    const textChannel = client?.channels.cache.get(session.textChannelId);
    if (
      !session.messageId ||
      !textChannel ||
      !textChannel.isTextBased() ||
      !textChannel.isSendable()
    ) {
      return;
    }

    try {
      const sessionMessage = await textChannel.messages.fetch(session.messageId);
      await sessionMessage.edit({
        embeds: [
          buildSessionWelcomeEmbed(session),
          buildRosterEmbed(registrationList, getSessionPlayerCount(session)),
        ],
        components: [buildRegistrationPanel(voiceChannelId)],
      });
    } catch (error) {
      logger.warn(
        { err: error, guildId, voiceChannelId, messageId: session.messageId },
        "Active farming session panel could not be updated",
      );
    }
    return;
  }

  const channel = client?.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isTextBased() || !channel.isSendable()) return;

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

async function beginRegistration(
  interaction: ButtonInteraction,
  expectedVoiceChannelId: string,
) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({
      content: "Este registro solo está disponible dentro de un servidor.",
    });
    return false;
  }
  if (
    !farmingSessions.has(
      farmingSessionKey(guildId, expectedVoiceChannelId),
    )
  ) {
    await interaction.editReply({
      content: "La sala de farmeo se encuentra cerrada.",
    });
    return false;
  }

  const existingRegistration = registrations.get(
    registrationKey(guildId, interaction.user.id),
  );
  if (existingRegistration) {
    await interaction.editReply({
      content:
        `Ya estás registrado como **${existingRegistration.role} · ${existingRegistration.character}** ` +
        `con el ID **${existingRegistration.gameId}**.\n\n` +
        "No puedes registrarte otra vez. Si necesitas cambiarlo, usa `/cambiar_rol`.",
    });
    return false;
  }

  const member = await getGuildMember(guildId, interaction.user.id);
  if (!hasAuthorizedRole(member)) {
    await interaction.editReply({
      content: ACCESS_DENIED_MESSAGE,
    });
    return false;
  }
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) {
    await interaction.editReply({
      content: "Debes estar dentro de un canal de voz para registrarte.",
    });
    return false;
  }
  if (voiceChannel.id !== expectedVoiceChannelId) {
    await interaction.editReply({
      content: "Debes estar en el canal de voz vinculado a esta sala.",
    });
    return false;
  }
  if (!isAllowedChannel(voiceChannel.id)) {
    await interaction.editReply({
      content: "Debes estar en un canal de voz permitido para registrarte.",
    });
    return false;
  }

  const capacity = getChannelCapacity(
    guildId,
    voiceChannel.id,
    interaction.user.id,
  );
  if (!capacity.available) {
    await interaction.editReply({
      content: `Este canal ya está lleno: **${capacity.playerCount}/${MAX_PLAYERS}** jugadores.`,
    });
    return false;
  }

  await interaction.editReply({
    content: "Primero selecciona el rol que vas a jugar:",
    components: [
      buildRoleMenu(interaction.user.id, "register", voiceChannel.id),
    ],
  });
  return true;
}

async function handleStartCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({
      content: "Este comando solo funciona dentro de un servidor.",
    });
    return;
  }

  const member = await getGuildMember(guildId, interaction.user.id);
  if (!hasAuthorizedRole(member)) {
    await interaction.editReply({
      content: ACCESS_DENIED_MESSAGE,
    });
    return;
  }
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) {
    await interaction.editReply({
      content: "Debes estar dentro de un canal de voz para abrir la sala.",
    });
    return;
  }
  if (!isAllowedChannel(voiceChannel.id)) {
    await interaction.editReply({
      content: "Debes estar en un canal de voz permitido para abrir la sala.",
    });
    return;
  }

  const sessionKey = farmingSessionKey(guildId, voiceChannel.id);
  const existingSession = farmingSessions.get(sessionKey);
  if (existingSession) {
    if (!existingSession.messageId) {
      await interaction.editReply({
        content: "La sala ya se está preparando.",
      });
      return;
    }

    const existingTextChannel = client?.channels.cache.get(
      existingSession.textChannelId,
    );
    if (
      existingTextChannel?.isTextBased() &&
      existingTextChannel.isSendable()
    ) {
      try {
        const existingMessage = await existingTextChannel.messages.fetch(
          existingSession.messageId,
        );
        await interaction.editReply({
          content: `Ya hay una sala activa para <#${voiceChannel.id}>: ${existingMessage.url}`,
        });
        return;
      } catch (error) {
        logger.warn(
          { err: error, guildId, voiceChannelId: voiceChannel.id },
          "Existing farming session message could not be fetched",
        );
      }
    }
    farmingSessions.delete(sessionKey);
  }

  const session: FarmingSession = {
    guildId,
    voiceChannelId: voiceChannel.id,
    textChannelId: interaction.channelId,
    openedByUserId: interaction.user.id,
    openedByDisplayName: member.displayName,
  };
  farmingSessions.set(sessionKey, session);

  try {
    const textChannel = interaction.channel;
    if (!textChannel?.isTextBased() || !textChannel.isSendable()) {
      throw new Error("The room text channel is not available for sending.");
    }

    const sessionMessage = await textChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [
        buildSessionWelcomeEmbed(session),
        buildRosterEmbed(
          getChannelRegistrations(guildId, voiceChannel.id),
          getSessionPlayerCount(session),
        ),
      ],
      components: [buildRegistrationPanel(voiceChannel.id)],
      allowedMentions: { users: [interaction.user.id] },
    });
    session.messageId = sessionMessage.id;
    await interaction.editReply({
      content: `Sala iniciada para <#${voiceChannel.id}>: ${sessionMessage.url}`,
    });
    await deleteRegistrationPanel(guildId, interaction.user.id);
    await publishRosterForChannel(guildId, voiceChannel.id);
  } catch (error) {
    if (farmingSessions.get(sessionKey) === session) {
      farmingSessions.delete(sessionKey);
    }
    throw error;
  }
}

async function handleStopCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({
      content: "Este comando solo funciona dentro de un servidor.",
    });
    return;
  }

  const member = await getGuildMember(guildId, interaction.user.id);
  if (
    !member ||
    (!hasAuthorizedRole(member) &&
      !member.permissions.has(PermissionsBitField.Flags.Administrator))
  ) {
    await interaction.editReply({
      content: ACCESS_DENIED_MESSAGE,
    });
    return;
  }

  let target = member.voice.channelId
    ? [
        farmingSessionKey(guildId, member.voice.channelId),
        farmingSessions.get(
          farmingSessionKey(guildId, member.voice.channelId),
        ),
      ] as const
    : undefined;
  if (!target?.[1]) {
    const sessionsInTextChannel = [...farmingSessions.entries()].filter(
      ([, session]) =>
        session.guildId === guildId &&
        session.textChannelId === interaction.channelId,
    );
    target =
      sessionsInTextChannel.length === 1
        ? sessionsInTextChannel[0]
        : undefined;
    if (sessionsInTextChannel.length > 1) {
      await interaction.editReply({
        content:
          "Hay varias salas activas en este canal. Entra al canal de voz de la sala que quieres cerrar y vuelve a usar `/stop`.",
      });
      return;
    }
  }

  const sessionKey = target?.[0];
  const session = target?.[1];
  if (!sessionKey || !session) {
    await interaction.editReply({
      content: "No hay una sala de farmeo activa que puedas cerrar aquí.",
    });
    return;
  }

  farmingSessions.delete(sessionKey);

  let panelUpdated = false;
  if (session.messageId) {
    const textChannel = client?.channels.cache.get(session.textChannelId);
    if (
      textChannel?.isTextBased() &&
      textChannel.isSendable()
    ) {
      try {
        const sessionMessage = await textChannel.messages.fetch(
          session.messageId,
        );
        await sessionMessage.edit({
          content: "Esta sala de farmeo está cerrada.",
          embeds: [
            buildSessionClosedEmbed(session, member.displayName),
          ],
          components: [],
          allowedMentions: { parse: [] },
        });
        panelUpdated = true;
      } catch (error) {
        logger.warn(
          { err: error, guildId, voiceChannelId: session.voiceChannelId },
          "Closed farming session panel could not be updated",
        );
      }
    }
  }

  await interaction.editReply(
    panelUpdated
      ? `Sala cerrada. Ya no se aceptan registros para <#${session.voiceChannelId}>.`
      : `La sala de <#${session.voiceChannelId}> quedó cerrada y sus botones ya no permiten registros, pero no pude actualizar el mensaje del panel.`,
  );
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  const sessionButtonPrefix = "mvr:session-register:";
  if (interaction.customId.startsWith(sessionButtonPrefix)) {
    const voiceChannelId = interaction.customId.slice(
      sessionButtonPrefix.length,
    );
    const guildId = interaction.guildId;
    if (!guildId) return;

    const session = farmingSessions.get(
      farmingSessionKey(guildId, voiceChannelId),
    );
    if (!session || session.messageId !== interaction.message.id) {
      await interaction.editReply({
        content: "La sala de farmeo se encuentra cerrada o ya no está activa.",
      });
      return;
    }

    await beginRegistration(interaction, voiceChannelId);
    return;
  }
  if (interaction.customId === "mvr:register") {
    await interaction.editReply({
      content:
        "Este panel antiguo ya no está activo. Un usuario autorizado debe iniciar la sala con `/start`.",
    });
  }
}

async function handleRoleSelection(interaction: StringSelectMenuInteraction) {
  const [prefix, type, userId, mode = "register"] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "role") return;
  const voiceChannelId = interaction.customId.split(":")[4];

  if (interaction.user.id !== userId) {
    await interaction.editReply({
      content: "Este registro pertenece a otra persona. Pulsa el botón para iniciar el tuyo.",
    });
    return;
  }

  const role = interaction.values[0];
  if (!role) {
    await interaction.editReply({
      content: "No se recibió un rol válido. Vuelve a seleccionar una opción.",
    });
    return;
  }

  const guildId = interaction.guildId ?? "";
  const registrationMode = mode === "change" ? "change" : "register";
  const member = guildId ? await getGuildMember(guildId, userId) : null;
  const hasActiveSession = Boolean(
    voiceChannelId &&
      farmingSessions.has(farmingSessionKey(guildId, voiceChannelId)),
  );
  if (!hasActiveSession) {
    await interaction.editReply({
      content: "La sala de farmeo se encuentra cerrada. No se aceptan interacciones.",
      components: [],
    });
    return;
  }
  if (member?.voice.channelId !== voiceChannelId) {
    await interaction.editReply({
      content: "Debes estar en el canal de voz de esta sala para continuar.",
      components: [],
    });
    return;
  }

  pendingRegistrations.set(pendingKey(guildId, userId), {
    role,
    createdAt: Date.now(),
    mode: registrationMode,
    voiceChannelId,
  });

  await interaction.editReply({
    content: `Rol seleccionado: **${role}**\nAhora selecciona tu personaje:`,
    components: buildCharacterMenus(
      userId,
      guildId,
      role,
      registrationMode,
      voiceChannelId,
    ),
  });
}

async function handleChangeRoleCommand(
  interaction: ChatInputCommandInteraction,
) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({
      content: "Este comando solo funciona dentro de un servidor.",
    });
    return;
  }

  const registration = registrations.get(
    registrationKey(guildId, interaction.user.id),
  );
  if (!registration) {
    await interaction.editReply({
      content:
        "Todavía no tienes un registro. Un usuario autorizado debe iniciar una sala con `/start` para habilitar el registro.",
    });
    return;
  }

  const member = await getGuildMember(guildId, interaction.user.id);
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel) {
    await interaction.editReply({
      content: "Debes estar dentro de un canal de voz para cambiar tu rol.",
    });
    return;
  }
  if (!isAllowedChannel(voiceChannel.id)) {
    await interaction.editReply({
      content: "Debes estar en un canal de voz permitido para cambiar tu rol.",
    });
    return;
  }
  if (
    registration.voiceChannelId !== voiceChannel.id ||
    !farmingSessions.has(
      farmingSessionKey(guildId, voiceChannel.id),
    )
  ) {
    await interaction.editReply({
      content: "La sala de farmeo de tu registro está cerrada. Inicia una nueva con `/start`.",
    });
    return;
  }

  pendingRegistrations.set(pendingKey(guildId, interaction.user.id), {
    role: registration.role,
    createdAt: Date.now(),
    mode: "change",
    voiceChannelId: voiceChannel.id,
  });

  await interaction.editReply({
    content:
      `Registro actual: **${registration.role} · ${registration.character}**.\n` +
      "Selecciona tu nuevo rol:",
    components: [
      buildRoleMenu(interaction.user.id, "change", voiceChannel.id),
    ],
  });
}

async function handleCharacterSelection(interaction: StringSelectMenuInteraction) {
  const [prefix, type, userId, mode = "register"] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "character") return;
  const [, , , , , voiceChannelId] = interaction.customId.split(":");

  if (interaction.user.id !== userId) {
    await interaction.editReply({
      content: "Este registro pertenece a otra persona. Pulsa el botón para iniciar el tuyo.",
    });
    return;
  }

  const pending = pendingRegistrations.get(
    pendingKey(interaction.guildId ?? "", userId),
  );
  if (!isPendingValid(pending)) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
    await interaction.editReply({
      content: "Tu selección expiró. Vuelve a pulsar el botón de registro de una sala activa.",
      components: [],
    });
    return;
  }

  const character = interaction.values[0];
  if (!character || !pending) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
    await interaction.editReply({
      content: "No se recibió un personaje válido. Vuelve a seleccionarlo.",
      components: [],
    });
    return;
  }

  const requestedMode = mode === "change" ? "change" : "register";
  if (pending.mode !== requestedMode) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
    await interaction.editReply({
      content: "Esta selección ya no está activa. Vuelve a iniciar la acción desde el menú actual.",
      components: [],
    });
    return;
  }

  const guildId = interaction.guildId ?? "";
  const hasActiveSession = Boolean(
    voiceChannelId &&
      pending.voiceChannelId === voiceChannelId &&
      farmingSessions.has(farmingSessionKey(guildId, voiceChannelId)),
  );
  if (!hasActiveSession) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
    await interaction.editReply({
      content: "La sala de farmeo se encuentra cerrada. No se aceptan interacciones.",
      components: [],
    });
    return;
  }

  if (pending.mode === "change") {
    const member = guildId ? await getGuildMember(guildId, userId) : null;
    if (member?.voice.channelId !== voiceChannelId) {
      await interaction.editReply({
        content: "Debes estar en el canal de voz de esta sala para continuar.",
        components: [],
      });
      return;
    }

    const key = registrationKey(interaction.guildId ?? "", userId);
    const existingRegistration = registrations.get(key);
    if (!existingRegistration) {
      await interaction.editReply({
        content:
          "No tienes un registro activo. Pulsa el botón de registro para comenzar.",
        components: [],
      });
      return;
    }

    existingRegistration.role = pending.role;
    existingRegistration.character = character;
    pendingRegistrations.delete(key);

    await interaction.editReply({
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
    buildRegistrationModal(
      userId,
      pending.role,
      character,
      pending.voiceChannelId,
    ),
  );
}

async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  const [prefix, type, userId, encodedRole, encodedCharacter] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "submit") return;
  const sessionVoiceChannelId = interaction.customId.split(":")[5];

  if (interaction.user.id !== userId) {
    await interaction.editReply({
      content: "Este registro pertenece a otra persona.",
    });
    return;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({
      content: "Este registro solo está disponible dentro de un servidor.",
    });
    return;
  }
  const session = sessionVoiceChannelId
    ? farmingSessions.get(
        farmingSessionKey(guildId, sessionVoiceChannelId),
      )
    : undefined;
  if (!session) {
    await interaction.editReply({
      content: "La sala de farmeo se encuentra cerrada. No se aceptan registros.",
    });
    return;
  }
  const existingRegistration = registrations.get(
    registrationKey(guildId, userId),
  );
  if (existingRegistration) {
    pendingRegistrations.delete(pendingKey(guildId, userId));
    await interaction.editReply({
      content:
        `Ya estás registrado como **${existingRegistration.role} · ${existingRegistration.character}**.\n` +
        "Si quieres modificarlo, usa `/cambiar_rol`.",
    });
    return;
  }

  const member = await getGuildMember(guildId, userId);
  const voiceChannel = member?.voice.channel;
  if (!voiceChannel || voiceChannel.id !== sessionVoiceChannelId) {
    await interaction.editReply({
      content: "Debes estar en el canal de voz de esta sala para completar el registro.",
    });
    return;
  }
  if (!isAllowedChannel(voiceChannel.id)) {
    await interaction.editReply({
      content:
        "Debes estar en un canal de voz permitido para completar el registro.",
    });
    return;
  }

  const capacity = getChannelCapacity(guildId, voiceChannel.id, userId);
  if (!capacity.available) {
    await interaction.editReply({
      content: `Este canal ya está lleno: **${capacity.playerCount}/${MAX_PLAYERS}** jugadores.`,
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
    await interaction.editReply({
      content: "Ese personaje no está disponible para el rol seleccionado.",
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

  await interaction.editReply({
    content: `Registro guardado: **${registration.role}** · **${registration.character}** · ID **${registration.gameId}**`,
  });

  await deleteRegistrationPanel(guildId, userId);
  await publishRoster(registration);
}

async function handleInteraction(interaction: Interaction) {
  const isSupportedInteraction =
    (interaction.isChatInputCommand() &&
      ["start", "cambiar_rol", "stop", "noafk"].includes(
        interaction.commandName,
      )) ||
    (interaction.isButton() &&
      (interaction.customId === "mvr:register" ||
        interaction.customId.startsWith("mvr:session-register:"))) ||
    (interaction.isStringSelectMenu() &&
      (interaction.customId.startsWith("mvr:role:") ||
        interaction.customId.startsWith("mvr:character:"))) ||
    (interaction.isModalSubmit() &&
      interaction.customId.startsWith("mvr:submit:"));
  if (!isSupportedInteraction) return;

  if (
    interaction.user.bot ||
    !client?.user ||
    interaction.applicationId !== client.user.id
  ) {
    return;
  }

  try {
    if (!interaction.guildId || !isAllowedChannel(interaction.channelId)) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: "Este comando solo está disponible en los canales permitidos del servidor.",
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: true });
    } else if (interaction.isButton()) {
      await interaction.deferReply({ ephemeral: true });
    } else if (interaction.isStringSelectMenu()) {
      const [, , targetUserId, mode] = interaction.customId.split(":");
      const belongsToAnotherUser = interaction.user.id !== targetUserId;
      const opensRegistrationModal =
        interaction.customId.startsWith("mvr:character:") &&
        mode !== "change" &&
        !belongsToAnotherUser;

      if (belongsToAnotherUser) {
        await interaction.deferReply({ ephemeral: true });
      } else if (!opensRegistrationModal) {
        await interaction.deferUpdate();
      }
    } else if (interaction.isModalSubmit()) {
      await interaction.deferReply({ ephemeral: true });
    }

    const isNoAfkCommand =
      interaction.isChatInputCommand() &&
      interaction.commandName === "noafk";
    const isStopCommand =
      interaction.isChatInputCommand() &&
      interaction.commandName === "stop";
    const stopMember = isStopCommand
      ? await getGuildMember(interaction.guildId, interaction.user.id)
      : null;
    const hasAccess =
      isNoAfkCommand ||
      (isStopCommand
        ? Boolean(
          stopMember &&
            (hasAuthorizedRole(stopMember) ||
              stopMember.permissions.has(
                PermissionsBitField.Flags.Administrator,
              )),
          )
        : interactionHasAuthorizedRole(interaction));
    if (!hasAccess) {
      if (interaction.deferred) {
        await interaction.editReply({ content: ACCESS_DENIED_MESSAGE });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: ACCESS_DENIED_MESSAGE,
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "start") {
        await runInteractionHandler(
          interaction,
          "start command",
          () => handleStartCommand(interaction),
        );
      } else if (interaction.commandName === "cambiar_rol") {
        await runInteractionHandler(
          interaction,
          "change-role command",
          () => handleChangeRoleCommand(interaction),
        );
      } else if (interaction.commandName === "stop") {
        await runInteractionHandler(
          interaction,
          "stop command",
          () => handleStopCommand(interaction),
        );
      } else if (interaction.commandName === "noafk") {
        await runInteractionHandler(interaction, "noafk command", async () => {
          await interaction.editReply({ embeds: [buildNoAfkEmbed()] });
        });
      }
    } else if (interaction.isButton()) {
      await runInteractionHandler(
        interaction,
        "button handler",
        () => handleButtonInteraction(interaction),
      );
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("mvr:role:")) {
        await runInteractionHandler(
          interaction,
          "role selection handler",
          () => handleRoleSelection(interaction),
        );
      } else if (interaction.customId.startsWith("mvr:character:")) {
        await runInteractionHandler(
          interaction,
          "character selection handler",
          () => handleCharacterSelection(interaction),
        );
      }
    } else if (interaction.isModalSubmit()) {
      await runInteractionHandler(
        interaction,
        "registration modal handler",
        () => handleModalSubmit(interaction),
      );
    }
  } catch (error) {
    await handleInteractionError(interaction, "interaction dispatcher", error);
  }
}

async function handleListCommand(message: Message) {
  if (message.author.bot || message.webhookId) return;
  if (!["!list", "!lista"].includes(message.content.trim().toLowerCase())) {
    return;
  }

  if (!message.guildId || !isAllowedChannel(message.channelId)) return;

  const member = await getGuildMember(message.guildId, message.author.id);
  if (!hasAuthorizedRole(member)) {
    await message.reply(ACCESS_DENIED_MESSAGE);
    return;
  }
  const voiceChannel =
    member?.voice.channel ??
    (message.channel.isVoiceBased() ? message.channel : null);

  if (!voiceChannel) {
    await message.reply(
      "Debes estar dentro de un canal de voz para consultar su lista.",
    );
    return;
  }
  if (!isAllowedChannel(voiceChannel.id)) {
    await message.reply(
      "Debes estar en un canal de voz permitido para consultar su lista.",
    );
    return;
  }
  if (
    !farmingSessions.has(
      farmingSessionKey(message.guildId, voiceChannel.id),
    )
  ) {
    await message.reply(
      "La sala de farmeo está cerrada. Un usuario autorizado debe iniciar otra con `/start`.",
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

async function handleMessageCreate(message: Message) {
  if (message.author.bot || message.webhookId) return;
  if (!message.guildId || !isAllowedChannel(message.channelId)) return;

  if (message.content.trim().toLowerCase() === "!noafk") {
    await message.reply({
      embeds: [buildNoAfkEmbed()],
    });
    return;
  }

  await handleListCommand(message);
}

async function registerGuildCommands(
  applicationId: string,
  guildId: string,
) {
  if (!client) return false;

  try {
    await client.rest.put(
      Routes.applicationGuildCommands(applicationId, guildId),
      { body: [...BOT_SLASH_COMMANDS] },
    );
    logger.info(
      {
        applicationId,
        guildId,
        commandNames: BOT_SLASH_COMMANDS.map((command) => command.name),
      },
      "Guild Discord application commands registered",
    );
    return true;
  } catch (error) {
    logger.error(
      {
        err: error,
        applicationId,
        guildId,
        commandNames: BOT_SLASH_COMMANDS.map((command) => command.name),
      },
      "Could not register guild Discord application commands",
    );
    return false;
  }
}

async function registerBotCommands(applicationId: string) {
  if (!client) return;

  const guildIds = [...client.guilds.cache.keys()];
  const guildResults = await Promise.all(
    guildIds.map((guildId) => registerGuildCommands(applicationId, guildId)),
  );
  const registeredGuildIds = guildIds.filter(
    (_, index) => guildResults[index],
  );
  if (registeredGuildIds.length > 0) {
    console.log(
      "Comandos registrados:",
      BOT_SLASH_COMMANDS.map((command) => command.name),
      "Guilds:",
      registeredGuildIds,
    );
  } else {
    logger.error(
      { applicationId, guildIds },
      "Discord commands could not be registered in any guild",
    );
  }

  try {
    const globalCommands = (await client.rest.get(
      Routes.applicationCommands(applicationId),
    )) as Array<{ id: string; name: string }>;

    for (const commandData of BOT_SLASH_COMMANDS) {
      const existingGlobalCommand = globalCommands.find(
        (command) => command.name === commandData.name,
      );
      if (existingGlobalCommand) {
        await client.rest.patch(
          Routes.applicationCommand(applicationId, existingGlobalCommand.id),
          { body: commandData },
        );
      } else {
        await client.rest.post(Routes.applicationCommands(applicationId), {
          body: commandData,
        });
      }
    }

    logger.info(
      {
        applicationId,
        commandNames: BOT_SLASH_COMMANDS.map((command) => command.name),
      },
      "Global Discord application commands registered",
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        applicationId,
      },
      "Could not register global Discord application commands",
    );
  }
}

async function handleVoiceStateUpdate(before: VoiceState, after: VoiceState) {
  const member = after.member ?? before.member;
  if (!member || member.user.bot) return;

  const changedChannel = before.channelId !== after.channelId;
  if (before.channelId && changedChannel) {
    const key = registrationKey(member.guild.id, member.id);
    const registration = registrations.get(key);
    const previousSessionKey = farmingSessionKey(
      member.guild.id,
      before.channelId,
    );

    if (registration?.voiceChannelId === before.channelId) {
      registrations.delete(key);
      pendingRegistrations.delete(pendingKey(member.guild.id, member.id));
      await deleteRegistrationPanel(member.guild.id, member.id);
    }
    if (
      isAllowedChannel(before.channelId) &&
      farmingSessions.has(previousSessionKey)
    ) {
      await publishRosterForChannel(member.guild.id, before.channelId);
    }
  }

  if (
    !hasAuthorizedRole(member) ||
    !after.channel ||
    !changedChannel ||
    !isAllowedChannel(after.channel.id)
  ) {
    return;
  }

  const voiceChannel = after.channel;
  const registrationKeyForMember = registrationKey(
    member.guild.id,
    member.id,
  );
  const existingRegistration = registrations.get(registrationKeyForMember);
  if (existingRegistration?.voiceChannelId === voiceChannel.id) {
    if (
      farmingSessions.has(
        farmingSessionKey(member.guild.id, voiceChannel.id),
      )
    ) {
      await publishRosterForChannel(member.guild.id, voiceChannel.id);
    }
    return;
  }
  if (existingRegistration) {
    registrations.delete(registrationKeyForMember);
    pendingRegistrations.delete(pendingKey(member.guild.id, member.id));
    await deleteRegistrationPanel(member.guild.id, member.id);
    if (
      farmingSessions.has(
        farmingSessionKey(
          existingRegistration.guildId,
          existingRegistration.voiceChannelId,
        ),
      )
    ) {
      await publishRosterForChannel(
        existingRegistration.guildId,
        existingRegistration.voiceChannelId,
      );
    }
  }
  if (farmingSessions.has(farmingSessionKey(member.guild.id, voiceChannel.id))) {
    await publishRosterForChannel(member.guild.id, voiceChannel.id);
  }
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
  if (client) {
    logger.info(
      { connected: client.isReady() },
      "Discord bot client already initialized; skipping duplicate startup",
    );
    return;
  }

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
    void registerBotCommands(readyClient.user.id);
  });
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.MessageCreate, handleMessageCreate);
  client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
  client.on(Events.GuildCreate, (guild) => {
    if (!client || !connectedAt) return;
    void syncCharacterEmojisAcrossGuilds([...client.guilds.cache.values()]);
    const applicationId = client.user?.id;
    if (applicationId) {
      void registerGuildCommands(applicationId, guild.id);
    }
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
