import { init } from "./init.js";
import { add } from "./add.js";
import { commit } from "./commit.js";
import { status } from "./status.js";
import { log } from "./log.js";
import { branch } from "./branch.js";
import { checkout } from "./checkout.js";
import { merge } from "./merge.js";
import { rebase } from "./rebase.js";
import { remote } from "./remote.js";
import { push } from "./push.js";
import { pull } from "./pull.js";
import { clone } from "./clone.js";
import { config } from "./config.js";
import { diff } from "./diff.js";
import { reset } from "./reset.js";
import { stash } from "./stash.js";
import { tag } from "./tag.js";
import { show } from "./show.js";

export const commands = {
  // Basic Commands
  init,
  add,
  commit,
  status,
  log,
  branch,
  checkout,
  show,

  // Advanced Commands
  merge,
  rebase,
  remote,
  push,
  pull,
  clone,

  // Utility Commands
  config,
  diff,
  reset,
  stash,
  tag,
};

export function getCommand(name) {
  return commands[name];
}

export function listCommands() {
  return Object.keys(commands);
}
