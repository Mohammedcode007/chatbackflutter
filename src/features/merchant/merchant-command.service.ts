import {
  USER_ACCOUNT_TYPES,
} from "./merchant.constants";

import {
  getMerchantAccess,
} from "./merchant-access.service";

import {
  parseMerchantCommand,
} from "./merchant-command.parser";

import {
  createUserFromMerchant,
  getMerchantUserDetails,
  setMerchantUserField,
  setUserAccountType,
  setUserPlatformRole,
} from "./merchant-user.service";

function helpMessage(): string {
  return [
    "Merchant management commands:",
    "",
    "create@username",
    "create@username@password",
    "",
    "role@username@user",
    "role@username@admin",
    "role@username@owner",
    "",
    "type@username@merchant",
    "type@username@dealer",
    "type@username@none",
    "",
    "set@username@roomEntryMediaUrl@https://...",
    "set@username@profileEntryMediaUrl@https://...",
    "set@username@roomWelcomeMessage@Welcome text",
    "set@username@roomEntryEnabled@true",
    "set@username@profileEntryEnabled@true",
    "set@username@accountColor@#FF0000",
    "set@username@verificationType@blue",
    "set@username@points@10000",
    "",
    "show@username",
    "",
    `Account types: ${USER_ACCOUNT_TYPES.join(", ")}`,
  ].join("\n");
}

function formatFailure(result: any): string {
  const reason = String(result?.reason || "unknown_error");

  switch (reason) {
    case "empty_username":
      return "Username is required.";

    case "username_already_exists":
      return "This username already exists.";

    case "user_not_found":
      return "User not found.";

    case "invalid_platform_role":
      return "Invalid role. Use: user, admin or owner.";

    case "invalid_account_type":
      return `Invalid account type. Allowed: ${USER_ACCOUNT_TYPES.join(
        ", "
      )}`;

    case "owner_permission_required":
      return "Only an owner can assign the owner role.";

    case "cannot_edit_owner":
      return "An admin cannot edit an owner account.";

    case "field_not_editable":
      return "This field cannot be modified through merchant.";

    case "invalid_url":
      return "The supplied URL is invalid.";

    case "welcome_message_too_long":
      return `Welcome message cannot exceed ${
        result?.maxLength || 160
      } characters.`;

    case "invalid_boolean_value":
      return "Use true or false.";

    case "invalid_points":
      return "Points must be a positive whole number.";

    case "invalid_hex_color":
      return "Color must use a format such as #FF0000.";

    default:
      return `Command failed: ${reason}`;
  }
}

export async function executeMerchantCommand(input: {
  fromUserId: string;
  text: string;
}) {
  const access = await getMerchantAccess(
    input.fromUserId
  );

  if (!access.allowed) {
    return {
      handled: true as const,
      ok: false as const,
      responseText:
        "You are not authorized to use merchant commands.",
    };
  }

  const command = parseMerchantCommand(input.text);

  switch (command.type) {
    case "help":
      return {
        handled: true as const,
        ok: true as const,
        responseText: helpMessage(),
      };

    case "create": {
      if (!command.username) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: create@username or create@username@password",
        };
      }

      const result = await createUserFromMerchant({
        username: command.username,
        requestedPassword: command.password,
      });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText: formatFailure(result),
        };
      }

      return {
        handled: true as const,
        ok: true as const,

        responseText: [
          "User created successfully.",
          `Username: ${result.user.username}`,
          `User ID: ${result.user.userId}`,
          `Password: ${result.plainPassword}`,
          `Role: ${result.user.platformRole}`,
          `Type: ${result.user.accountType}`,
        ].join("\n"),
      };
    }

    case "role": {
      if (!command.target || !command.role) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: role@username@user|admin|owner",
        };
      }

      const result = await setUserPlatformRole({
        target: command.target,
        role: command.role as any,
        actorAccessLevel: access.accessLevel as
          | "admin"
          | "owner",
      });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText: formatFailure(result),
        };
      }

      return {
        handled: true as const,
        ok: true as const,
        responseText:
          `Role updated successfully.\n` +
          `Username: ${result.user.username}\n` +
          `Role: ${result.user.platformRole}`,
      };
    }

    case "account_type": {
      if (!command.target || !command.accountType) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: type@username@merchant",
        };
      }

      const result = await setUserAccountType({
        target: command.target,
        accountType: command.accountType as any,
      });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText: formatFailure(result),
        };
      }

      return {
        handled: true as const,
        ok: true as const,
        responseText:
          `Account type updated successfully.\n` +
          `Username: ${result.user.username}\n` +
          `Type: ${result.user.accountType}`,
      };
    }

    case "set": {
      if (
        !command.target ||
        !command.field ||
        command.value === ""
      ) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: set@username@field@value",
        };
      }

      const result = await setMerchantUserField({
        target: command.target,
        field: command.field,
        rawValue: command.value,
        actorAccessLevel: access.accessLevel as
          | "admin"
          | "owner",
      });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText: formatFailure(result),
        };
      }

      return {
        handled: true as const,
        ok: true as const,
        responseText:
          `Field updated successfully.\n` +
          `Username: ${result.user.username}\n` +
          `Field: ${command.field}`,
      };
    }

    case "show": {
      if (!command.target) {
        return {
          handled: true as const,
          ok: false as const,
          responseText: "Use: show@username",
        };
      }

      const result = await getMerchantUserDetails(
        command.target
      );

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText: formatFailure(result),
        };
      }

      const user = result.user;

      return {
        handled: true as const,
        ok: true as const,

        responseText: [
          `Username: ${user.username}`,
          `User ID: ${user.userId}`,
          `Role: ${user.platformRole}`,
          `Type: ${user.accountType}`,
          `Points: ${user.points}`,
          `Color: ${user.accountColor}`,
          `Verification: ${user.verificationType}`,
          `Room entry enabled: ${user.roomEntryEnabled}`,
          `Room entry URL: ${user.roomEntryMediaUrl || "none"}`,
          `Profile entry enabled: ${user.profileEntryEnabled}`,
          `Profile entry URL: ${
            user.profileEntryMediaUrl || "none"
          }`,
          `Welcome message: ${
            user.roomWelcomeMessage || "none"
          }`,
        ].join("\n"),
      };
    }

    case "unknown":
    default:
      return {
        handled: true as const,
        ok: false as const,
        responseText:
          `Unknown merchant command.\n\n${helpMessage()}`,
      };
  }
}