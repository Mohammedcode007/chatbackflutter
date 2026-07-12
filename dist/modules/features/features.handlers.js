"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featuresHandlers = void 0;
const ws_utils_1 = require("../../websocket/ws.utils");
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_events_1 = require("../../websocket/ws.events");
const handleMyFeatures = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FEATURES_EVENT))
        return;
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FEATURES_EVENT,
        request_id: context.message.request_id,
        features: {
            isVip: true,
            badge: "gold",
            level: 5,
            roomLimit: 20,
            canCreatePrivateRoom: true,
            canUseSpecialEffects: true,
        },
    });
};
const handleActivateFeature = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FEATURES_EVENT))
        return;
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FEATURES_EVENT,
        request_id: context.message.request_id,
        feature_key: context.message.feature_key,
        activated: true,
    });
};
exports.featuresHandlers = {
    [ws_events_1.WS_HANDLERS.FEATURES_MY]: handleMyFeatures,
    [ws_events_1.WS_HANDLERS.FEATURES_ACTIVATE]: handleActivateFeature,
};
//# sourceMappingURL=features.handlers.js.map