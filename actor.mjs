import { STARTED } from "./constants.mjs";

const DEFAULT = "DEFAULT";

/**
 * @type {import('./types').ActorBuilder}
 */
export function actor(handlers, settings = {
  behavior: {
    default: DEFAULT,
  },
}) {
  if (!Reflect.has(handlers, settings.behavior.default)) {
    handlers = {
      [settings.behavior.default]: handlers,
    };
  }

  const originalStart = handlers[settings.behavior.default].start;

  handlers[settings.behavior.default].link = ({ links, sender, reply }) => {
    links.push(sender)
    reply({})
  }

  handlers[settings.behavior.default].terminate = ({ links, tell, payload }) => {
    for (const link of links) {
      tell({ type: 'DOWN', receiver: link, payload })
    }
  }

  handlers[settings.behavior.default].info = ({ reply, id, state, behavior }) => {
    reply({ payload: { id, state, behavior } })
  }


  handlers[settings.behavior.default].start = (message) => {
    if (typeof originalStart === "function") {
      originalStart(message);
    }

    message.tell(
      {
        type: STARTED,
        receiver: message.sender,
        sender: message.id,
        id: message.messageId,
      },
    );
  };

  const behavior = {
    history: [],
    current: settings.behavior.default,
    default: settings.behavior.default,
  };

  return {
    spawn: (nodeId, actorId, url) => ({
      id: `${nodeId}.${actorId}-${url}`,
      handlers,
      behavior,
      links: [],
      state: {}
    }),
  };
}
