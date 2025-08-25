import { API } from "homebridge";

import { PLATFORM_NAME } from "./settings.js";
import { BoschPlatform } from "./platform.js";

export default (api: API): void => {
  api.registerPlatform(PLATFORM_NAME, BoschPlatform);
};
