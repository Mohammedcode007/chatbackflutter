function clean(value: unknown): string {
  return String(value || "").trim();
}
export type MerchantCommand =
  | {
      type: "help";
    }
  | {
      type: "create";
      username: string;
      password: string;
    }
  | {
      type: "transfer";
      target: string;
      amount: string;
    }
  | {
      type: "role";
      target: string;
      role: string;
    }
  | {
      type: "account_type";
      target: string;
      accountType: string;
    }
  | {
      type: "set";
      target: string;
      field: string;
      value: string;
    }
  | {
      type: "show";
      target: string;
    }
  | {
      type: "unknown";
      rawText: string;
    };
export function parseMerchantCommand(
  rawText: string
): MerchantCommand {
  const text = clean(rawText);

  if (!text || text.toLowerCase() === "help") {
    return {
      type: "help",
    };
  }

  /*
    create@username
    create@username@password
  */
  if (text.toLowerCase().startsWith("create@")) {
    const parts = text.split("@");

    return {
      type: "create",
      username: clean(parts[1]),
      password: clean(parts.slice(2).join("@")),
    };
  }
/*
  transfer@username@amount
  تحويل نقاط إلى مستخدم آخر.

  مثال:
  transfer@abdo@5000
*/
if (text.toLowerCase().startsWith("transfer@")) {
  const parts = text.split("@");

  return {
    type: "transfer",
    target: clean(parts[1]),
    amount: clean(parts[2]),
  };
}
  /*
    role@username@admin
    role@username@owner
    role@username@user
  */
  if (text.toLowerCase().startsWith("role@")) {
    const parts = text.split("@");

    return {
      type: "role",
      target: clean(parts[1]),
      role: clean(parts[2]).toLowerCase(),
    };
  }

  /*
    type@username@merchant
    type@username@dealer
  */
  if (text.toLowerCase().startsWith("type@")) {
    const parts = text.split("@");

    return {
      type: "account_type",
      target: clean(parts[1]),
      accountType: clean(parts[2]).toLowerCase(),
    };
  }

  /*
    set@username@field@value

    استخدام slice مهم لأن القيمة نفسها
    قد تحتوي على علامة @.
  */
  if (text.toLowerCase().startsWith("set@")) {
    const parts = text.split("@");

    return {
      type: "set",
      target: clean(parts[1]),
      field: clean(parts[2]),
      value: clean(parts.slice(3).join("@")),
    };
  }

  /*
    show@username
  */
  if (text.toLowerCase().startsWith("show@")) {
    const parts = text.split("@");

    return {
      type: "show",
      target: clean(parts.slice(1).join("@")),
    };
  }

  return {
    type: "unknown",
    rawText: text,
  };
}