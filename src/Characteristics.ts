import { Characteristic } from "hap-nodejs";

export class EveTotalConsumption extends Characteristic {
  static readonly UUID = "E863F10C-079E-48FF-8F-8F27-9C2605A29F52";

  constructor() {
    super("Energy", EveTotalConsumption.UUID, {
      format: Characteristic.Formats.FLOAT,
      unit: "kWh",
      maxValue: 1000000000,
      minValue: 0,
      minStep: 0.001,
      perms: [
        Characteristic.Perms.READ,
        Characteristic.Perms.NOTIFY,
      ],
    });
    this.value = this.getDefaultValue();
  }
}
export class EvePowerConsumption extends Characteristic {
  static readonly UUID = "E863F10D-079E-48FF-8F27-9C2605A29F52";

  constructor() {
    super("Power Consumption", EvePowerConsumption.UUID, {
      format: Characteristic.Formats.UINT16,
      unit: "W",
      perms: [
        Characteristic.Perms.READ,
        Characteristic.Perms.NOTIFY,
      ],
    });
    this.value = this.getDefaultValue();
  }
}
