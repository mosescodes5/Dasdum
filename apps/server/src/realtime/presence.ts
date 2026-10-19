import type { Loc } from '../../../../packages/game-core/src/world';
/** Where each connected character is RIGHT NOW, as the realtime server sees it. The shift rules read this, so a client can't claim to be at work. */
export const presence = new Map<string, { loc: Loc; online: boolean }>();
