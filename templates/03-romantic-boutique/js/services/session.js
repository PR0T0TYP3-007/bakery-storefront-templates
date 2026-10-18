/**
 * @file Session state for this template.
 *
 * The logic lives in shared/session.js, shared with Templates 02, 04 and 05. The only
 * part that is per-template is api.js, the swappable data seam, which is
 * handed to the factory here.
 */

import * as api from './api.js';
import { createSession } from '../../../../shared/session.js';

export const {
  state,
  on,
  boot,
  product,
  location,
  groups,
  leadFor,
  priceOf,
  setWhen,
  setLocation,
  add,
  updateLine,
  setQty,
  remove,
  clear,
  count,
  orderReadyBy,
  stale,
} = createSession(api);
