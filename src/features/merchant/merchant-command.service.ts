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
  merchantConfig,
} from "./merchant.config";

import {
  createUserFromMerchant,
  getMerchantUserDetails,
  setMerchantUserField,
  setUserAccountType,
  setUserPlatformRole,
  transferUserPoints,
} from "./merchant-user.service";

function helpMessage(
  isAdminOrOwner: boolean
): string {
  const publicCommands = [
    "Available commands:",
    "",
    `Create account cost: ${merchantConfig.accountCreationCost} points`,
    "",
    "create@username",
    "create@username@password",
    "",
    "transfer@username@amount",
    "",
  ];

  if (!isAdminOrOwner) {
    return publicCommands.join("\n");
  }

  return [
    ...publicCommands,

    "Administrative commands:",
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
  const reason = String(
    result?.reason || "unknown_error"
  );

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

    case "creator_user_not_found":
      return "Account creator was not found.";

    case "sender_user_not_found":
      return "Sender account was not found.";

    case "insufficient_points":
      return `Insufficient points. Required: ${
        result?.requiredPoints || 0
      }.`;

    case "invalid_transfer_target":
      return "Invalid transfer target.";

    case "invalid_transfer_amount":
      return "Transfer amount must be a positive whole number.";

    case "transfer_amount_too_small":
      return `Minimum transfer amount is ${
        result?.minAmount || 1
      }.`;

    case "transfer_amount_too_large":
      return `Maximum transfer amount is ${
        result?.maxAmount || 0
      }.`;

    case "cannot_transfer_to_yourself":
      return "You cannot transfer points to yourself.";

    case "account_creation_failed":
      return "Account creation failed and the points were refunded.";

    case "point_transfer_failed":
      return "Point transfer failed and the points were refunded.";

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

    case "invalid_verification_type":
      return "Invalid verification type.";

    case "status_message_too_long":
      return "Status message is too long.";

    default:
      return `Command failed: ${reason}`;
  }
}

function unauthorizedAdministrativeCommand() {
  return {
    handled: true as const,
    ok: false as const,
    responseText:
      "You are not authorized to use this administrative command.",
  };
}

export async function executeMerchantCommand(input: {
  fromUserId: string;
  text: string;
}) {
  const command = parseMerchantCommand(
    input.text
  );

  const access = await getMerchantAccess(
    input.fromUserId
  );

  const isAdminOrOwner =
    access.allowed === true &&
    (
      access.accessLevel === "admin" ||
      access.accessLevel === "owner"
    );

  const isOwner =
    access.allowed === true &&
    access.accessLevel === "owner";

  console.log("[MERCHANT_COMMAND_RECEIVED]", {
    fromUserId: input.fromUserId,
    commandType: command.type,
    accessAllowed: access.allowed,
    accessLevel: access.accessLevel,
    isAdminOrOwner,
    isOwner,
    at: new Date().toISOString(),
  });

  switch (command.type) {
    case "help": {
      return {
        handled: true as const,
        ok: true as const,
        responseText: helpMessage(
          isAdminOrOwner
        ),
      };
    }

    /*
      أمر عام:
      أي مستخدم يستطيع إنشاء حساب
      إذا كان لديه رصيد كافٍ.
    */
    case "create": {
      if (!command.username) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: create@username or create@username@password",
        };
      }

      const result =
        await createUserFromMerchant({
          creatorUserId:
            input.fromUserId,

          username:
            command.username,

          requestedPassword:
            command.password,
        });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            formatFailure(result),
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
          `Creation cost: ${result.cost}`,
          `Your remaining points: ${result.remainingPoints}`,
        ].join("\n"),
      };
    }

    /*
      أمر عام:
      المستخدم العادي يحول من رصيده.
      المالك يضيف نقاطًا دون خصم.
    */
    case "transfer": {
      if (
        !command.target ||
        !command.amount
      ) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: transfer@username@amount",
        };
      }

      const amount = Number(
        command.amount
      );

      const result =
        await transferUserPoints({
          fromUserId:
            input.fromUserId,

          target:
            command.target,

          amount,

          ownerUnlimited:
            isOwner,
        });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            formatFailure(result),
        };
      }

      const transferMode =
        result.ownerUnlimited
          ? "Owner unlimited transfer"
          : "User balance transfer";

      const responseLines = [
        "Points transferred successfully.",
        `Mode: ${transferMode}`,
        `To: ${result.target.username}`,
        `Amount: ${result.amount}`,
        `Target new balance: ${result.target.points}`,
      ];

      if (!result.ownerUnlimited) {
        responseLines.push(
          `Your remaining points: ${result.sender.points}`
        );
      }

      return {
        handled: true as const,
        ok: true as const,
        responseText:
          responseLines.join("\n"),
      };
    }

    /*
      أمر إداري فقط.
    */
    case "role": {
      if (!isAdminOrOwner) {
        return unauthorizedAdministrativeCommand();
      }

      if (
        !command.target ||
        !command.role
      ) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: role@username@user|admin|owner",
        };
      }

      const result =
        await setUserPlatformRole({
          target:
            command.target,

          role:
            command.role as any,

          actorAccessLevel:
            access.accessLevel as
              | "admin"
              | "owner",
        });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            formatFailure(result),
        };
      }

      return {
        handled: true as const,
        ok: true as const,

        responseText: [
          "Role updated successfully.",
          `Username: ${result.user.username}`,
          `Role: ${result.user.platformRole}`,
        ].join("\n"),
      };
    }

    /*
      أمر إداري فقط.
    */
    case "account_type": {
      if (!isAdminOrOwner) {
        return unauthorizedAdministrativeCommand();
      }

      if (
        !command.target ||
        !command.accountType
      ) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: type@username@merchant",
        };
      }

      const result =
        await setUserAccountType({
          target:
            command.target,

          accountType:
            command.accountType as any,
        });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            formatFailure(result),
        };
      }

      return {
        handled: true as const,
        ok: true as const,

        responseText: [
          "Account type updated successfully.",
          `Username: ${result.user.username}`,
          `Type: ${result.user.accountType}`,
        ].join("\n"),
      };
    }

    /*
      أمر إداري فقط.
    */
    case "set": {
      if (!isAdminOrOwner) {
        return unauthorizedAdministrativeCommand();
      }

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

      console.log("[MERCHANT_SET_COMMAND]", {
        fromUserId:
          input.fromUserId,

        target:
          command.target,

        field:
          command.field,

        value:
          command.value,

        accessLevel:
          access.accessLevel,

        at: new Date().toISOString(),
      });

      const result =
        await setMerchantUserField({
          target:
            command.target,

          field:
            command.field,

          rawValue:
            command.value,

          actorAccessLevel:
            access.accessLevel as
              | "admin"
              | "owner",
        });

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,

          responseText: [
            formatFailure(result),
            "",
            `Target: ${command.target}`,
            `Field: ${command.field}`,
            `Value: ${command.value}`,
          ].join("\n"),
        };
      }

      return {
        handled: true as const,
        ok: true as const,

        responseText: [
          "Field updated successfully.",
          `Username: ${result.user.username}`,
          `Field: ${command.field}`,
          `Value: ${command.value}`,
        ].join("\n"),
      };
    }

    /*
      عرض تفاصيل الحساب للأدمن والمالك فقط،
      لأن الرد يحتوي على بيانات إدارية.
    */
    case "show": {
      if (!isAdminOrOwner) {
        return unauthorizedAdministrativeCommand();
      }

      if (!command.target) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            "Use: show@username",
        };
      }

      const result =
        await getMerchantUserDetails(
          command.target
        );

      if (!result.ok) {
        return {
          handled: true as const,
          ok: false as const,
          responseText:
            formatFailure(result),
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
          `Profile entry URL: ${user.profileEntryMediaUrl || "none"}`,
          `Welcome message: ${user.roomWelcomeMessage || "none"}`,
        ].join("\n"),
      };
    }

    case "unknown":
    default: {
      return {
        handled: true as const,
        ok: false as const,

        responseText:
          `Unknown merchant command.\n\n${helpMessage(
            isAdminOrOwner
          )}`,
      };
    }
  }
}