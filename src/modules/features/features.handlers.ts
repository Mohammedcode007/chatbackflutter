import { WsHandler } from "../../websocket/ws.types";
import { sendSuccess } from "../../websocket/ws.utils";
import { requireLogin } from "../../websocket/ws.auth";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";

const handleMyFeatures: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FEATURES_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FEATURES_EVENT,
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

const handleActivateFeature: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FEATURES_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FEATURES_EVENT,
    request_id: context.message.request_id,
    feature_key: context.message.feature_key,
    activated: true,
  });
};

export const featuresHandlers = {
  [WS_HANDLERS.FEATURES_MY]: handleMyFeatures,
  [WS_HANDLERS.FEATURES_ACTIVATE]: handleActivateFeature,
};