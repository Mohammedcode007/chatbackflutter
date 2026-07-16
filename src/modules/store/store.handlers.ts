
import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import {
  activateStoreItemService,
  addUserPointsService,
  buyStoreItemService,
  listStoreItemsService,
} from "./store.service";

const handleListStoreItems: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.STORE_ITEMS_EVENT)) return;

  const userId = context.client!.userId!;

  const result = await listStoreItemsService(userId);

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.STORE_ITEMS_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.STORE_ITEMS_EVENT,
    request_id: context.message.request_id,
    points: result.points,
    items: result.items,
    inventory: result.inventory,
    user: result.user,
  });
};

const handleBuyStoreItem: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.STORE_BUY_EVENT)) return;

  const userId = context.client!.userId!;
  const itemId = String(context.message.item_id || "").trim();

  if (!itemId) {
    sendError(
      context.socket,
      WS_EVENTS.STORE_BUY_EVENT,
      "missing_item_id",
      context.message.request_id
    );
    return;
  }

  const result = await buyStoreItemService({
    userId,
    itemId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.STORE_BUY_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.STORE_BUY_EVENT,
    request_id: context.message.request_id,
    points: result.points,
    item: result.item,
    activeItem: result.activeItem,
    inventory: result.inventory,
    user: result.user,
  });
};

const handleActivateStoreItem: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.STORE_ACTIVATE_EVENT)) return;

  const userId = context.client!.userId!;
  const itemId = String(context.message.item_id || "").trim();

  if (!itemId) {
    sendError(
      context.socket,
      WS_EVENTS.STORE_ACTIVATE_EVENT,
      "missing_item_id",
      context.message.request_id
    );
    return;
  }

  const result = await activateStoreItemService({
    userId,
    itemId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.STORE_ACTIVATE_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

sendSuccess(context.socket, {
  handler: WS_EVENTS.STORE_ACTIVATE_EVENT,
  request_id: context.message.request_id,
  item: result.item,
  activeItem: result.activeItem ?? null,
  inventory: result.inventory,
  user: result.user,
});
};

/*
  مهم:
  هذا مؤقت للتجربة فقط.
  بعد الدفع الحقيقي، لا تجعل المستخدم يضيف نقاط لنفسه من الفرونت.
*/
const handleAddUserPoints: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.STORE_POINTS_EVENT)) return;

  const userId = context.client!.userId!;
  const amount = Number(context.message.amount || 0);

  const result = await addUserPointsService({
    userId,
    amount,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.STORE_POINTS_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.STORE_POINTS_EVENT,
    request_id: context.message.request_id,
    points: result.points,
    user: result.user,
  });
};

export const storeHandlers = {
  [WS_HANDLERS.STORE_ITEMS_LIST]: handleListStoreItems,
  [WS_HANDLERS.STORE_ITEM_BUY]: handleBuyStoreItem,
  [WS_HANDLERS.STORE_ITEM_ACTIVATE]: handleActivateStoreItem,
  [WS_HANDLERS.STORE_POINTS_ADD]: handleAddUserPoints,
};