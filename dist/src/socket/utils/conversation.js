"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationId = void 0;
const getConversationId = (userId1, userId2) => {
    return [userId1, userId2].sort().join("_");
};
exports.getConversationId = getConversationId;
