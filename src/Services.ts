import { Service } from "hap-nodejs";
import { EvePowerConsumption, EveTotalConsumption } from "./Characteristics";

export class PowerMeterService extends Service {
  static readonly UUID = "00000001-0000-1777-8000-775D67EC4377";

  constructor(displayName: string, subtype?: string) {
    super(displayName, PowerMeterService.UUID, subtype);
    this.addCharacteristic(EvePowerConsumption);
    this.addOptionalCharacteristic(EveTotalConsumption);
  }
}
