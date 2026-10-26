import {
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  GuildMember,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildBasedChannel,
  type Interaction,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type VoiceState,
} from "discord.js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger";

const ROLE_OPTIONS = [
  {
    label: "Tanque (Vanguard)",
    value: "Vanguard",
    emoji: { name: "vanguard2", id: "1552903419566497903" },
  },
  {
    label: "Duelista (Duelist)",
    value: "Duelist",
    emoji: { name: "duelist2", id: "1552903434728906752" },
  },
  {
    label: "Healer (Strategist)",
    value: "Strategist",
    emoji: { name: "strategist2", id: "1552903394837143643" },
  },
] as const;

const ROLE_ORDER = ["Vanguard", "Duelist", "Strategist"] as const;
type CharacterRole = (typeof ROLE_ORDER)[number];
const ROLE_FIELD_LABELS: Record<CharacterRole, string> = {
  Vanguard: "Tanques",
  Duelist: "Duelistas",
  Strategist: "Healers",
};

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
const MAX_PLAYERS_PER_ROLE = 4;
const TEMPORARY_BOT_MESSAGE_MS = 30_000;
const CHARACTER_OPTIONS_PER_MENU = 25;
const ATTACHED_ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../attached_assets",
);
const AUTHORIZED_VOICE_CHANNEL_IDS = new Set([
  "881820505466896394",
  "882060722589290496",
  "1552833195156840619",
  "1552787974570381362",
  "1553938625110999140",
  "1552787864268308510",
]);
const AUTHORIZED_CONTROL_ROLE_IDS = new Set([
  "1553907548501835916",
  "881753080952160337",
  "1558208679361257512",
  "1552912737225674844",
  "1552913091623256125",
]);
const ROOM_CLOSED_MESSAGE =
  "La sala de farmeo está cerrada. Un usuario autorizado debe iniciar otra con /start.";
const CLOSED_ROOM_COLOR = 0xff0000;
const PANEL_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
] as const;
const EPHEMERAL_FLAGS = MessageFlags.Ephemeral;
const FARM_RELATED_MESSAGE_PATTERN =
  /^!(list|lista|register|registro|start|stop|rol|cambiar_rol|cambiar)\b/;

const START_COMMAND = new SlashCommandBuilder()
  .setName("start")
  .setDescription("Abre la sala de farmeo y habilita el registro de la partida")
  .toJSON();
const STOP_COMMAND = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Cierra la sala de farmeo y bloquea los registros")
  .toJSON();
const CHANGE_ROLE_COMMAND = new SlashCommandBuilder()
  .setName("cambiar_rol")
  .setDescription("Cambia tu rol y personaje después de registrarte")
  .toJSON();
const APPLICATION_COMMANDS = [START_COMMAND, STOP_COMMAND, CHANGE_ROLE_COMMAND];

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

type RoomStatus = "open" | "closed";

type RoomState = {
  guildId: string;
  voiceChannelId: string;
  status: RoomStatus;
  sessionId: string;
  panelMessageId?: string;
  openedByUserId?: string;
  openedByUsername?: string;
  closedByUserId?: string;
  closedByUsername?: string;
  openedAt?: string;
  closedAt?: string;
};

const pendingRegistrations = new Map<string, PendingRegistration>();
const registrations = new Map<string, PlayerRegistration>();
const roomStates = new Map<string, RoomState>();
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
const roomKey = (guildId: string, voiceChannelId: string) =>
  `${guildId}:${voiceChannelId}`;

function isAuthorizedVoiceChannel(channelId: string | null | undefined) {
  return Boolean(channelId && AUTHORIZED_VOICE_CHANNEL_IDS.has(channelId));
}

function memberHasControlRole(member: GuildMember | null | undefined) {
  if (!member) return false;
  return member.roles.cache.some((role) =>
    AUTHORIZED_CONTROL_ROLE_IDS.has(role.id),
  );
}

function getRoomState(guildId: string, voiceChannelId: string): RoomState {
  const key = roomKey(guildId, voiceChannelId);
  const existing = roomStates.get(key);
  if (existing) return existing;

  const created: RoomState = {
    guildId,
    voiceChannelId,
    status: "closed",
    sessionId: "",
  };
  roomStates.set(key, created);
  return created;
}

function isRoomOpen(guildId: string, voiceChannelId: string) {
  const room = roomStates.get(roomKey(guildId, voiceChannelId));
  return room?.status === "open" && Boolean(room.sessionId);
}

function isActiveSession(
  guildId: string,
  voiceChannelId: string,
  sessionId: string | undefined,
) {
  if (!sessionId) return false;
  const room = roomStates.get(roomKey(guildId, voiceChannelId));
  return room?.status === "open" && room.sessionId === sessionId;
}

function clearChannelSessionData(guildId: string, voiceChannelId: string) {
  const userIds = new Set<string>();
  for (const [key, registration] of registrations) {
    if (
      registration.guildId === guildId &&
      registration.voiceChannelId === voiceChannelId
    ) {
      userIds.add(registration.discordUserId);
      registrations.delete(key);
    }
  }

  for (const userId of userIds) {
    pendingRegistrations.delete(pendingKey(guildId, userId));
  }
}

function getVoicePlayerCount(voiceChannelId: string) {
  const channel = client?.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isVoiceBased()) return 0;
  return channel.members.filter((member) => !member.user.bot).size;
}

function getRoleCount(guildId: string, voiceChannelId: string, role: string) {
  return getChannelRegistrations(guildId, voiceChannelId).filter(
    (reg) => reg.role === role
  ).length;
}

async function resolveGuildMember(
  interaction: Interaction,
): Promise<GuildMember | null> {
  if (interaction.member instanceof GuildMember) {
    return interaction.member;
  }
  if (!interaction.guild) return null;
  try {
    return await interaction.guild.members.fetch(interaction.user.id);
  } catch (error) {
    logger.warn(
      { err: error, userId: interaction.user.id, guildId: interaction.guild.id },
      "Could not fetch guild member for farm room command",
    );
    return null;
  }
}

function isFarmRelatedMessageCommand(content: string) {
  return FARM_RELATED_MESSAGE_PATTERN.test(content.trim().toLowerCase());
}

function isPendingValid(pending: PendingRegistration | undefined) {
  return Boolean(pending && Date.now() - pending.createdAt < 5 * 60 * 1000);
}

function buildPublicRoleMenu(sessionId: string, disabled = false) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mvr:roleopen:${sessionId}`)
    .setPlaceholder("Elige tu rol: Vanguard, Duelist o Strategist")
    .setDisabled(disabled)
    .addOptions(
      ROLE_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
        emoji: option.emoji,
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildRoomComponents(sessionId: string, disabled = false) {
  return [
    buildRegistrationPanel(sessionId, disabled),
    buildPublicRoleMenu(sessionId, disabled),
  ];
}

async function replyEphemeral(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction,
  content: string,
) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content, embeds: [], components: [] });
    return;
  }

  await interaction.reply({ content, ephemeral: true });
}

async function deferEphemeral(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction,
) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }
}

async function rejectClosedRoom(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | StringSelectMenuInteraction
    | ModalSubmitInteraction,
) {
  await replyEphemeral(interaction, ROOM_CLOSED_MESSAGE);
}

async function invalidatePanelButtons(
  guildId: string,
  voiceChannelId: string,
  sessionId: string,
) {
  const channel = client?.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isTextBased() || !channel.isSendable()) return;

  const room = getRoomState(guildId, voiceChannelId);
  if (!room.panelMessageId) return;

  try {
    const panelMessage = await channel.messages.fetch(room.panelMessageId);
    await panelMessage.edit({
      components: buildRoomComponents(sessionId, true),
    });
  } catch (error) {
    logger.warn(
      { err: error, channelId: voiceChannelId, messageId: room.panelMessageId },
      "Could not invalidate previous farm room registration buttons",
    );
  }
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

function buildRoleFields(registrationList: PlayerRegistration[]) {
  return ROLE_ORDER.map((role) => {
    const players = registrationList
      .filter((registration) => registration.role === role)
      .map(
        (registration) =>
          `${registration.character} - ${registration.gameId}`,
      );

    return {
      name: `${ROLE_FIELD_LABELS[role]} (${players.length}/${MAX_PLAYERS_PER_ROLE})`,
      value: players.length > 0 ? players.join("\n") : "Disponible",
      inline: false,
    };
  });
}

function buildRosterEmbed(registrationList: PlayerRegistration[]) {
  return new EmbedBuilder()
    .setColor(0x1d9bf0)
    .setTitle(
      `Jugadores listos para Marvel Rivals · ${registrationList.length}/${MAX_PLAYERS}`,
    )
    .setDescription(
      `Cupos ocupados: **${registrationList.length}/${MAX_PLAYERS}**\n` +
        "Los roles vacíos aparecen como disponibles.",
    )
    .addFields(buildRoleFields(registrationList))
    .setFooter({
      text: "Registro actualizado por Marvel Rivals",
    });
}

function buildOpenRoomEmbed(
  openedByUsername: string,
  registrationList: PlayerRegistration[],
  voicePlayerCount: number,
) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Bienvenido al farmeo")
    .setDescription(
      `Sala abierta por **${openedByUsername}**.\n` +
        "Selecciona tu rol en el menú desplegable de abajo para registrarte.\n\n" +
        `Jugadores presentes en voz: **${voicePlayerCount}/${MAX_PLAYERS}**\n` +
        `Registros confirmados: **${registrationList.length}/${MAX_PLAYERS}**`,
    )
    .addFields(buildRoleFields(registrationList))
    .setFooter({
      text: "Vanguard (4) · Duelist (4) · Strategist (4)",
    });
}

function buildClosedRoomEmbed(closedByUsername: string) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Sala de farmeo cerrada")
    .setDescription(
      `Cerrada por **${closedByUsername}**.\nYa no se aceptan registros.`,
    )
    .setFooter({
      text: "Usa /start para abrir una nueva sala",
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

async function refreshRoomPanel(guildId: string, voiceChannelId: string) {
  const room = getRoomState(guildId, voiceChannelId);
  if (room.status !== "open") return;

  const channel = client?.channels.cache.get(voiceChannelId);
  if (!channel || !channel.isTextBased() || !channel.isSendable()) return;

  const registrationList = getChannelRegistrations(guildId, voiceChannelId);
  const payload = {
    embeds: [
      buildOpenRoomEmbed(
        room.openedByUsername ?? "un usuario autorizado",
        registrationList,
        getVoicePlayerCount(voiceChannelId),
      ),
    ],
    components: buildRoomComponents(room.sessionId),
  };

  if (room.panelMessageId) {
    try {
      const existingMessage = await channel.messages.fetch(room.panelMessageId);
      await existingMessage.edit(payload);
      return;
    } catch (error) {
      logger.warn(
        { err: error, channelId: voiceChannelId },
        "Farm room panel could not be updated; publishing a new one",
      );
      room.panelMessageId = undefined;
    }
  }

  const panelMessage = await channel.send(payload);
  room.panelMessageId = panelMessage.id;
}

async function publishRosterForChannel(guildId: string, voiceChannelId: string) {
  if (!isRoomOpen(guildId, voiceChannelId)) return;
  await refreshRoomPanel(guildId, voiceChannelId);
}

async function publishRoster(registration: PlayerRegistration) {
  await publishRosterForChannel(registration.guildId, registration.voiceChannelId);
}

async function requireAuthorizedControl(
  interaction: ChatInputCommandInteraction,
) {
  await deferEphemeral(interaction);

  const guildId = interaction.guildId;
  const channelId = interaction.channelId;
  if (!guildId) {
    await replyEphemeral(
      interaction,
      "Este comando solo funciona dentro de un servidor.",
    );
    return null;
  }

  if (!isAuthorizedVoiceChannel(channelId)) {
    await replyEphemeral(
      interaction,
      "Los comandos de gestión de sala solo pueden usarse en un canal de voz autorizado.",
    );
    return null;
  }

  const member = await resolveGuildMember(interaction);
  if (!memberHasControlRole(member)) {
    await replyEphemeral(
      interaction,
      "No tienes un rol autorizado para controlar la sala de farmeo.",
    );
    return null;
  }

  return { guildId, channelId, member: member as GuildMember };
}

async function handleStartCommand(interaction: ChatInputCommandInteraction) {
  const context = await requireAuthorizedControl(interaction);
  if (!context) return;

  const { guildId, channelId, member } = context;
  const previousRoom = getRoomState(guildId, channelId);
  if (previousRoom.panelMessageId && previousRoom.sessionId) {
    await invalidatePanelButtons(guildId, channelId, previousRoom.sessionId);
  }

  clearChannelSessionData(guildId, channelId);

  const room = getRoomState(guildId, channelId);
  room.status = "open";
  room.sessionId = randomUUID();
  room.openedByUserId = member.id;
  room.openedByUsername = member.displayName;
  room.openedAt = new Date().toISOString();
  room.closedByUserId = undefined;
  room.closedByUsername = undefined;
  room.closedAt = undefined;
  room.panelMessageId = undefined;

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !channel.isSendable()) {
    await replyEphemeral(
      interaction,
      "No pude publicar el panel de la sala en este canal.",
    );
    room.status = "closed";
    room.sessionId = "";
    return;
  }

  const panelMessage = await channel.send({
    embeds: [
      buildOpenRoomEmbed(
        member.displayName,
        [],
        getVoicePlayerCount(channelId),
      ),
    ],
    components: buildRoomComponents(room.sessionId),
  });
  room.panelMessageId = panelMessage.id;

  await replyEphemeral(
    interaction,
    "Sala de farmeo abierta. El registro de la partida ya está habilitado.",
  );
}

async function handleStopCommand(interaction: ChatInputCommandInteraction) {
  const context = await requireAuthorizedControl(interaction);
  if (!context) return;

  const { guildId, channelId, member } = context;
  const room = getRoomState(guildId, channelId);
  if (room.status !== "open") {
    await rejectClosedRoom(interaction);
    return;
  }

  const sessionId = room.sessionId;
  room.status = "closed";
  room.closedByUserId = member.id;
  room.closedByUsername = member.displayName;
  room.closedAt = new Date().toISOString();
  clearChannelSessionData(guildId, channelId);

  const closedEmbed = buildClosedRoomEmbed(member.displayName);
  const channel = interaction.channel;
  if (channel?.isTextBased() && channel.isSendable() && room.panelMessageId) {
    try {
      const panelMessage = await channel.messages.fetch(room.panelMessageId);
      await panelMessage.edit({
        embeds: [closedEmbed],
        components: buildRoomComponents(sessionId || "closed", true),
      });
    } catch (error) {
      logger.warn(
        { err: error, channelId },
        "Could not update the farm room panel on /stop; sending a new closed embed",
      );
      const closedMessage = await channel.send({
        embeds: [closedEmbed],
        components: buildRoomComponents(sessionId || "closed", true),
      });
      room.panelMessageId = closedMessage.id;
    }
  } else if (channel?.isTextBased() && channel.isSendable()) {
    const closedMessage = await channel.send({
      embeds: [closedEmbed],
      components: buildRoomComponents(sessionId || "closed", true),
    });
    room.panelMessageId = closedMessage.id;
  }

  await replyEphemeral(interaction, "Sala de farmeo cerrada. Ya no se aceptan registros.");
}

function resolveFarmVoiceChannelId(
  guildId: string,
  channelId: string | null | undefined,
  member: GuildMember | null,
) {
  if (isAuthorizedVoiceChannel(channelId) && channelId) return channelId;
  const voiceChannelId = member?.voice.channelId;
  if (isAuthorizedVoiceChannel(voiceChannelId) && voiceChannelId) {
    return voiceChannelId;
  }
  return undefined;
}

async function handlePublicRoleSelection(interaction: StringSelectMenuInteraction) {
  const [prefix, type, sessionId] = interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "roleopen") return;

  await deferEphemeral(interaction);

  const guildId = interaction.guildId;
  if (!guildId) {
    await replyEphemeral(
      interaction,
      "Este registro solo está disponible dentro de un servidor.",
    );
    return;
  }

  const member = await resolveGuildMember(interaction);
  const voiceChannelId = resolveFarmVoiceChannelId(
    guildId,
    interaction.channelId,
    member,
  );
  const role = interaction.values[0];

  if (
    !voiceChannelId ||
    !isRoomOpen(guildId, voiceChannelId) ||
    !isActiveSession(guildId, voiceChannelId, sessionId)
  ) {
    await invalidatePanelButtons(
      guildId,
      interaction.channelId,
      sessionId || "closed",
    );
    await rejectClosedRoom(interaction);
    return;
  }

  const existingRegistration = registrations.get(
    registrationKey(guildId, interaction.user.id),
  );
  if (existingRegistration) {
    await replyEphemeral(
      interaction,
      `Ya estás registrado como **${existingRegistration.role} · ${existingRegistration.character}** ` +
        `con el ID **${existingRegistration.gameId}**.\n\n` +
        "No puedes registrarte otra vez. Si necesitas cambiarlo, usa `/cambiar_rol`.",
    );
    return;
  }

  if (!member?.voice.channel || member.voice.channel.id !== voiceChannelId) {
    await replyEphemeral(
      interaction,
      "Debes estar dentro de este canal de voz para registrarte.",
    );
    return;
  }

  if (getChannelRegistrations(guildId, voiceChannelId).length >= MAX_PLAYERS) {
    await replyEphemeral(
      interaction,
      `Este canal ya está lleno: **${MAX_PLAYERS}/${MAX_PLAYERS}** jugadores.`,
    );
    return;
  }

  if (!role) {
    await replyEphemeral(interaction, "Selecciona un rol válido para continuar.");
    return;
  }

  // VALIDACIÓN DE LÍMITE DE 4 POR ROL
  const currentRoleCount = getRoleCount(guildId, voiceChannelId, role);
  if (currentRoleCount >= MAX_PLAYERS_PER_ROLE) {
    await replyEphemeral(
      interaction,
      `⚠️ El rol de **${role}** ya está completo (**${MAX_PLAYERS_PER_ROLE}/${MAX_PLAYERS_PER_ROLE}**). Por favor selecciona otro rol.`
    );
    return;
  }

  pendingRegistrations.set(pendingKey(guildId, interaction.user.id), {
    role,
    createdAt: Date.now(),
    mode: "register",
  });

  await interaction.message
    .edit({
      components: buildRoomComponents(sessionId),
    })
    .catch(() => undefined);

  await interaction.editReply({
    content: `Rol seleccionado: **${role}**\nAhora selecciona tu personaje:`,
    components: buildCharacterMenus(
      interaction.user.id,
      guildId,
      role,
      "register",
    ),
  });
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

  await interaction.deferUpdate();

  const guildId = interaction.guildId ?? "";
  const member = await resolveGuildMember(interaction);
  const voiceChannelId = resolveFarmVoiceChannelId(
    guildId,
    interaction.channelId,
    member,
  );
  if (!guildId || !voiceChannelId || !isRoomOpen(guildId, voiceChannelId)) {
    await rejectClosedRoom(interaction);
    return;
  }

  const role = interaction.values[0];
  if (!role) return;

  const currentRoleCount = getRoleCount(guildId, voiceChannelId, role);
  if (mode !== "change" && currentRoleCount >= MAX_PLAYERS_PER_ROLE) {
    await interaction.followUp({
      content: `⚠️ El rol de **${role}** ya está completo (**${MAX_PLAYERS_PER_ROLE}/${MAX_PLAYERS_PER_ROLE}**). Por favor selecciona otro rol.`,
      ephemeral: true,
    });
    return;
  }

  pendingRegistrations.set(pendingKey(guildId, userId), {
    role,
    createdAt: Date.now(),
    mode: mode === "change" ? "change" : "register",
  });

  await interaction.editReply({
    content: `Rol seleccionado: **${role}**\nAhora selecciona tu personaje:`,
    components: buildCharacterMenus(
      userId,
      guildId,
      role,
      mode === "change" ? "change" : "register",
    ),
  });
}

async function handleChangeRoleCommand(
  interaction: ChatInputCommandInteraction,
) {
  await deferEphemeral(interaction);

  const guildId = interaction.guildId;
  if (!guildId) {
    await replyEphemeral(
      interaction,
      "Este comando solo funciona dentro de un servidor.",
    );
    return;
  }

  const member = await resolveGuildMember(interaction);
  const voiceChannelId = resolveFarmVoiceChannelId(
    guildId,
    interaction.channelId,
    member,
  );
  if (!voiceChannelId || !isRoomOpen(guildId, voiceChannelId)) {
    await rejectClosedRoom(interaction);
    return;
  }

  const registration = registrations.get(
    registrationKey(guildId, interaction.user.id),
  );
  if (!registration) {
    await replyEphemeral(
      interaction,
      "Todavía no tienes un registro. Selecciona tu rol en el menú desplegable de la sala abierta.",
    );
    return;
  }

  if (!member?.voice.channel || member.voice.channel.id !== voiceChannelId) {
    await replyEphemeral(
      interaction,
      "Debes estar dentro de este canal de voz para cambiar tu rol.",
    );
    return;
  }

  pendingRegistrations.set(pendingKey(guildId, interaction.user.id), {
    role: registration.role,
    createdAt: Date.now(),
    mode: "change",
  });

  await interaction.editReply({
    content:
      `Registro actual: **${registration.role} · ${registration.character}**.\n` +
      "Selecciona tu nuevo rol:",
    components: [buildRoleMenu(interaction.user.id, "change")],
  });
}

async function handleCharacterSelection(interaction: StringSelectMenuInteraction) {
  const [prefix, type, userId, mode = "register"] =
    interaction.customId.split(":");
  if (prefix !== "mvr" || type !== "character") return;

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "Este registro pertenece a otra persona.",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guildId ?? "";
  const member = await resolveGuildMember(interaction);
  const voiceChannelId = resolveFarmVoiceChannelId(
    guildId,
    interaction.channelId,
    member,
  );
  if (!guildId || !voiceChannelId || !isRoomOpen(guildId, voiceChannelId)) {
    await rejectClosedRoom(interaction);
    return;
  }

  const pending = pendingRegistrations.get(
    pendingKey(guildId, userId),
  );
  if (!isPendingValid(pending)) {
    await interaction.update({
      content: "Tu selección expiró. Selecciona tu rol en el menú desplegable para comenzar de nuevo.",
      components: [],
    });
    return;
  }

  const character = interaction.values[0];
  if (!character || !pending) return;

  const currentRoleCount = getRoleCount(guildId, voiceChannelId, pending.role);
  if (pending.mode !== "change" && currentRoleCount >= MAX_PLAYERS_PER_ROLE) {
    await interaction.update({
      content: `⚠️ El rol de **${pending.role}** acaba de completarse (**${MAX_PLAYERS_PER_ROLE}/${MAX_PLAYERS_PER_ROLE}**). Vuelve a iniciar tu registro con otro rol.`,
      components: [],
    });
    pendingRegistrations.delete(pendingKey(guildId, userId));
    return;
  }

  if (pending.mode === "change" || mode === "change") {
    const key = registrationKey(interaction.guildId ?? "", userId);
    const existingRegistration = registrations.get(key);
    if (!existingRegistration) {
      await interaction.update({
        content:
          "No tienes un registro activo. Selecciona tu rol en el menú para comenzar.",
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

  await deferEphemeral(interaction);

  const guildId = interaction.guildId ?? "";
  const member = await resolveGuildMember(interaction);
  const voiceChannelId = resolveFarmVoiceChannelId(
    guildId,
    interaction.channelId,
    member,
  );
  if (!guildId || !voiceChannelId || !isRoomOpen(guildId, voiceChannelId)) {
    await rejectClosedRoom(interaction);
    return;
  }

  const existingRegistration = registrations.get(
    registrationKey(guildId, userId),
  );
  if (existingRegistration) {
    pendingRegistrations.delete(pendingKey(guildId, userId));
    await replyEphemeral(
      interaction,
      `Ya estás registrado como **${existingRegistration.role} · ${existingRegistration.character}**.\n` +
        "Si quieres modificarlo, usa `/cambiar_rol`.",
    );
    return;
  }

  const voiceChannel = member?.voice.channel;
  if (!voiceChannel || voiceChannel.id !== voiceChannelId || !("send" in voiceChannel)) {
    await replyEphemeral(
      interaction,
      "Debes estar dentro de este canal de voz para completar el registro.",
    );
    return;
  }

  if (getChannelRegistrations(guildId, voiceChannel.id).length >= MAX_PLAYERS) {
    await replyEphemeral(
      interaction,
      `Este canal ya está lleno: **${MAX_PLAYERS}/${MAX_PLAYERS}** jugadores.`,
    );
    return;
  }

  const gameId = interaction.fields.getTextInputValue("game_id").trim();
  const role = decodeURIComponent(encodedRole);
  const character = decodeURIComponent(encodedCharacter);

  const currentRoleCount = getRoleCount(guildId, voiceChannelId, role);
  if (currentRoleCount >= MAX_PLAYERS_PER_ROLE) {
    pendingRegistrations.delete(pendingKey(guildId, userId));
    await replyEphemeral(
      interaction,
      `⚠️ Lo sentimos, el rol de **${role}** acaba de completarse (**${MAX_PLAYERS_PER_ROLE}/${MAX_PLAYERS_PER_ROLE}**). No se pudo completar el registro.`
    );
    return;
  }

  if (
    !CHARACTERS_LIST[role as CharacterRole]?.some(
      (option) => option.value === character,
    )
  ) {
    await replyEphemeral(
      interaction,
      "Ese personaje no está disponible para el rol seleccionado.",
    );
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

  await replyEphemeral(
    interaction,
    `Registro guardado: **${registration.role}** · **${registration.character}** · ID **${registration.gameId}**`,
  );

  await deleteRegistrationPanel(guildId, userId);
  await publishRoster(registration);
}

async function handleInteraction(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "start") {
        await handleStartCommand(interaction);
        return;
      }
      if (interaction.commandName === "stop") {
        await handleStopCommand(interaction);
        return;
      }
      if (interaction.commandName === "cambiar_rol") {
        await handleChangeRoleCommand(interaction);
        return;
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("mvr:roleopen:")) {
        await handlePublicRoleSelection(interaction);
      } else if (interaction.customId.startsWith("mvr:role:")) {
        await handleRoleSelection(interaction);
      } else if (interaction.customId.startsWith("mvr:character:")) {
        await handleCharacterSelection(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    logger.error({ err: error }, "Discord interaction failed");
    if (!interaction.isRepliable()) return;
    if (interaction.deferred || interaction.replied) {
      await interaction
        .editReply({
          content: "No pude completar el registro. Inténtalo otra vez.",
          components: [],
          embeds: [],
        })
        .catch(() => undefined);
      return;
    }
    await interaction.reply({
      content: "No pude completar el registro. Inténtalo otra vez.",
      ephemeral: true,
    });
  }
}

async function replyRoomClosedToMessage(message: Message) {
  const closedReply = await message.reply(ROOM_CLOSED_MESSAGE);
  scheduleMessageDeletion(closedReply);
  await deleteTemporaryMessage(message);
}

async function handleExternalBotInterference(message: Message) {
  if (!message.guildId || !isAuthorizedVoiceChannel(message.channelId)) return false;
  if (!message.author.bot || message.author.id === client?.user?.id) return false;
  if (isRoomOpen(message.guildId, message.channelId)) return false;

  await deleteTemporaryMessage(message);
  return true;
}

async function handleListCommand(message: Message) {
  if (message.author.bot || !isFarmRelatedMessageCommand(message.content)) {
    return;
  }

  if (!message.guildId) return;

  const member = message.member as GuildMember | null;
  const voiceChannelId = resolveFarmVoiceChannelId(
    message.guildId,
    message.channelId,
    member,
  );

  if (!voiceChannelId || !isRoomOpen(message.guildId, voiceChannelId)) {
    await replyRoomClosedToMessage(message);
    return;
  }

  if (message.content.trim().toLowerCase() !== "!list") {
    return;
  }

  const voiceChannel =
    member?.voice.channel ??
    (message.channel.isVoiceBased() ? message.channel : null);

  if (!voiceChannel || voiceChannel.id !== voiceChannelId) {
    await replyRoomClosedToMessage(message);
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
  if (await handleExternalBotInterference(message)) return;
  await handleListCommand(message);
}

async function registerApplicationCommands(applicationId: string) {
  if (!client) return;

  try {
    const globalCommands = (await client.rest.get(
      Routes.applicationCommands(applicationId),
    )) as Array<{ id: string; name: string }>;

    for (const command of APPLICATION_COMMANDS) {
      const existingGlobalCommand = globalCommands.find(
        (item) => item.name === command.name,
      );

      if (existingGlobalCommand) {
        await client.rest.patch(
          Routes.applicationCommand(applicationId, existingGlobalCommand.id),
          { body: command },
        );
      } else {
        await client.rest.post(Routes.applicationCommands(applicationId), {
          body: command,
        });
      }
    }

    logger.info(
      {
        applicationId,
        commandNames: APPLICATION_COMMANDS.map((command) => command.name),
      },
      "Global Discord application commands registered",
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        applicationId,
        commandNames: APPLICATION_COMMANDS.map((command) => command.name),
      },
      "Could not register global farm room commands",
    );
    return;
  }

  const commandNames = APPLICATION_COMMANDS.map((command) => command.name);
  for (const guild of client.guilds.cache.values()) {
    try {
      const commands = await guild.commands.fetch();
      for (const commandName of commandNames) {
        const existingCommand = commands.find(
          (command) => command.name === commandName,
        );
        if (!existingCommand) continue;

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
          commandNames,
        },
        "Could not remove guild-scoped duplicates of global Discord commands",
      );
    }
  }
}

async function handleVoiceStateUpdate(before: VoiceState, after: VoiceState) {
  const member = after.member ?? before.member;
  if (!member || member.user.bot) return;

  const guildId = member.guild.id;
  const changedChannel = before.channelId !== after.channelId;

  if (before.channelId && changedChannel) {
    const key = registrationKey(guildId, member.id);
    const registration = registrations.get(key);
    if (registration?.voiceChannelId === before.channelId) {
      registrations.delete(key);
      pendingRegistrations.delete(key);
    }
    if (isAuthorizedVoiceChannel(before.channelId)) {
      await publishRosterForChannel(guildId, before.channelId);
    }
  }

  if (!after.channelId || !changedChannel) return;
  const voiceChannelId = after.channelId;
  
  if (!isAuthorizedVoiceChannel(voiceChannelId)) return;
  if (!isRoomOpen(guildId, voiceChannelId)) return;

  await publishRosterForChannel(guildId, voiceChannelId);

  const registrationList = getChannelRegistrations(guildId, voiceChannelId);
  if (registrationList.length >= MAX_PLAYERS) return;

  const userId = member.id;
  const isRegistered = registrations.has(registrationKey(guildId, userId));

  if (!isRegistered) {
      const channel = client?.channels.cache.get(voiceChannelId);
      if (channel && channel.isTextBased() && channel.isSendable()) {
        // Crear un botón directo para este aviso
        const registerButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`mvr:register:${room.sessionId}`) // Mismo ID para abrir el registro
            .setLabel("Registrarme aquí")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("✍️")
          );

export function getDiscordBotStatus() {
  return {
    connected: Boolean(client?.isReady()),
    username: botUsername ?? null,
    connectedAt: connectedAt ?? null,
    registrations: registrations.size,
    openRooms: Array.from(roomStates.values()).filter(
      (room) => room.status === "open",
    ).length,
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
    void registerApplicationCommands(readyClient.user.id);
  });
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.MessageCreate, handleMessageCreate);
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
} // <-- Esta llave cierra startDiscordBot()
  
