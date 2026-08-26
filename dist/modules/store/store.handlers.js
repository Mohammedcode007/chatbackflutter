"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeHandlers = void 0;
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_utils_1 = require("../../websocket/ws.utils");
const ws_events_1 = require("../../websocket/ws.events");
const store_service_1 = require("./store.service");
const handleListStoreItems = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.STORE_ITEMS_EVENT))
        return;
    const userId = context.client.userId;
    const result = await (0, store_service_1.listStoreItemsService)(userId);
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.STORE_ITEMS_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.STORE_ITEMS_EVENT,
        request_id: context.message.request_id,
        points: result.points,
        items: result.items,
        inventory: result.inventory,
        user: result.user,
    });
};
const handleBuyStoreItem = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.STORE_BUY_EVENT))
        return;
    const userId = context.client.userId;
    const itemId = String(context.message.item_id || "").trim();
    if (!itemId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.STORE_BUY_EVENT, "missing_item_id", context.message.request_id);
        return;
    }
    const result = await (0, store_service_1.buyStoreItemService)({
        userId,
        itemId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.STORE_BUY_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.STORE_BUY_EVENT,
        request_id: context.message.request_id,
        points: result.points,
        item: result.item,
        activeItem: result.activeItem,
        inventory: result.inventory,
        user: result.user,
    });
};
const handleActivateStoreItem = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.STORE_ACTIVATE_EVENT))
        return;
    const userId = context.client.userId;
    const itemId = String(context.message.item_id || "").trim();
    if (!itemId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.STORE_ACTIVATE_EVENT, "missing_item_id", context.message.request_id);
        return;
    }
    const result = await (0, store_service_1.activateStoreItemService)({
        userId,
        itemId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.STORE_ACTIVATE_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.STORE_ACTIVATE_EVENT,
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
const handleAddUserPoints = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.STORE_POINTS_EVENT))
        return;
    const userId = context.client.userId;
    const amount = Number(context.message.amount || 0);
    const result = await (0, store_service_1.addUserPointsService)({
        userId,
        amount,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.STORE_POINTS_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.STORE_POINTS_EVENT,
        request_id: context.message.request_id,
        points: result.points,
        user: result.user,
    });
};
exports.storeHandlers = {
    [ws_events_1.WS_HANDLERS.STORE_ITEMS_LIST]: handleListStoreItems,
    [ws_events_1.WS_HANDLERS.STORE_ITEM_BUY]: handleBuyStoreItem,
    [ws_events_1.WS_HANDLERS.STORE_ITEM_ACTIVATE]: handleActivateStoreItem,
    [ws_events_1.WS_HANDLERS.STORE_POINTS_ADD]: handleAddUserPoints,
};
//# sourceMappingURL=store.handlers.js.map